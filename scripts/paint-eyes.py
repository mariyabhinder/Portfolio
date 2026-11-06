"""Paint the girl's open and drowsy eyes as patches over girl.webp (whose eyes are closed).

Everything is taken from her own picture: her painted lash stroke is lifted off each closed eye, flipped so
the lashes point up and bent into the open lid's arch; the lash ink, lid highlight, skin, brow and hair
colours are sampled around her eyes and used for the whites, iris and lid shadows. The closed lashes are
painted out of the skin first. Each eye is drawn upright in its own frame (turned with her face), at
SS x resolution, then turned back onto the picture.

Writes girl-eyes-open.webp and girl-eyes-drowsy.webp next to girl.webp; meadow.ts lays them on at EYES_AT
(the BOX corner below). Tune the look with the LOOKS table, then re-run:

    python3 -m venv .venv && .venv/bin/pip install numpy opencv-python-headless pillow
    .venv/bin/python scripts/paint-eyes.py [--preview preview.png]
"""

import argparse
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / 'src/assets/meadow'
BOX = (698, 122, 850, 218)  # the patch, in girl.webp px (left, top, right, bottom); EYES_AT in meadow.ts
SS = 8  # supersampling while painting
FRAME = (60, 44)  # each eye's upright frame, px

# each eye: the middle of its closed lash line on girl.webp, how far her face is turned there (deg), and
# which end of the line is the outer corner in the eye's frame (-1 left, 1 right)
EYES = [dict(c=(737.5, 152.0), ang=27.0, outer=-1), dict(c=(806.5, 185.0), ang=25.0, outer=1)]
# the lifted lashes are kept to this fraction of their painted length, and thin out towards the inner corner
LASH_LENGTH = 0.65

# open and drowsy: how far the upper lid lifts and the lower lid drops at the middle (px), the iris
# radius (fraction of the eye's width) and how far it sits below the eye's middle (px)
LOOKS = {
    'open': dict(peak=7.6, low=4.4, iris=0.19, iris_dy=-0.4),
    'drowsy': dict(peak=3.6, low=3.4, iris=0.19, iris_dy=1.6),
}


def lum(a):
    return a[..., :3] @ np.array([0.3, 0.59, 0.11])


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def to_frame(eye, scale):
    """Affine taking girl.webp px into the eye's upright frame (at `scale` px per px), centred on its lash line."""
    m = cv2.getRotationMatrix2D(eye['c'], eye['ang'], scale)
    m[:, 2] += [FRAME[0] * scale / 2 - eye['c'][0], FRAME[1] * scale / 2 - eye['c'][1]]
    return m


def as3(m):
    return np.vstack([m, [0, 0, 1]])


def study(img, eye):
    """Read the closed eye: where the lash line runs, and its colours."""
    f = cv2.warpAffine(img, to_frame(eye, 1), FRAME, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    L = lum(f)
    x_lo = 12  # keep the glasses hinge out of it
    band = L[16:36, x_lo:58]
    dark = band < 150
    ys, xs = np.nonzero(dark)
    x0, x1 = xs.min() + x_lo, xs.max() + x_lo
    # the darkest row of each column is the lash line's core; fit a gentle curve through it
    cols = np.arange(x0, x1 + 1)
    core = np.array([np.argmin(L[16:36, x]) + 16 for x in cols], float)
    fit = np.polyfit(cols - FRAME[0] / 2, core - FRAME[1] / 2, 2)
    region = f[16:36, x_lo:58]
    skin = np.median(region[band > np.percentile(band, 50)][:, :3], 0)
    ink = np.median(region[band < np.percentile(band[dark], 30)][:, :3], 0)
    light = np.clip(np.median(region[band > np.percentile(band, 97)][:, :3], 0), 0, 255)
    return dict(
        x0=x0 - FRAME[0] / 2, x1=x1 - FRAME[0] / 2, core=fit, outer=eye['outer'],
        skin=skin, ink=ink, light=light, lum_skin=lum(skin), lum_ink=lum(ink),
    )


def clean(img, studies):
    """Paint the closed lashes (and the lid highlight just above them) out of the skin."""
    mask = np.zeros(img.shape[:2], np.uint8)
    L = lum(img)
    for eye, s in zip(EYES, studies):
        back = cv2.invertAffineTransform(to_frame(eye, 1))
        cy = np.polyval(s['core'], 0) + FRAME[1] / 2
        cx = FRAME[0] / 2
        def region(a, b, top, bottom):
            quad = np.array([[cx + a, cy + top], [cx + b, cy + top], [cx + b, cy + bottom], [cx + a, cy + bottom]])
            quad = (back @ np.c_[quad, np.ones(4)].T).T
            r = np.zeros_like(mask)
            cv2.fillPoly(r, [np.round(quad).astype(np.int32)], 255)
            return r > 0
        # the lash ink along the line (well darker than the glasses rim, which runs close by the outer end),
        # and the lighter lid highlight above it, kept clear of the rim at the outer end
        lashes = region(s['x0'] - 1, s['x1'] + 1.5, -7, 8) & (L < s['lum_skin'] - 40)
        a, b = (s['x0'] + 5, s['x1'] + 1.5) if s['outer'] < 0 else (s['x0'] - 1.5, s['x1'] - 5)
        highlight = region(a, b, -7, -1) & (L > s['lum_skin'] + 6)
        mask |= (lashes | highlight).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
    out = img.copy()
    out[..., :3] = cv2.inpaint(np.ascontiguousarray(img[..., :3].astype(np.uint8)), mask, 5, cv2.INPAINT_TELEA)
    return out


def paint_eye(orig, eye, s, look, brow, hair):
    """The open eye, upright, at SS: premultiplied RGBA."""
    Wf, Hf = FRAME[0] * SS, FRAME[1] * SS
    V, U = np.mgrid[0:Hf, 0:Wf].astype(float)
    U, V = (U + 0.5) / SS - FRAME[0] / 2, (V + 0.5) / SS - FRAME[1] / 2
    u = U[0]
    aa = lambda d: np.clip(d * SS + 0.5, 0, 1)

    # the lids, from corner to corner along her own lash line (t = 0 at the outer corner)
    x0, x1 = s['x0'], s['x1']
    width = x1 - x0
    t = np.clip((u - x0) / width, 0, 1)
    if s['outer'] > 0:
        t = 1 - t
    inside = (u > x0) & (u < x1)
    base = np.polyval(s['core'], np.clip(u, x0, x1)) - 0.7 * (1 - t) + 0.3 * t
    up = base - look['peak'] * np.sin(math.pi * t ** 1.15) ** 0.8 * inside
    lo = base + look['low'] * np.sin(math.pi * t ** 0.9) ** 1.1 * inside
    UP, LO = up[None, :], lo[None, :]
    eye_a = aa(V - UP) * aa(LO - V) * inside[None, :]

    canvas = np.zeros((Hf, Wf, 4))

    def over(rgb, a):
        a = a[..., None]
        canvas[..., :3] = rgb * a + canvas[..., :3] * (1 - a)
        canvas[..., 3:] = a + canvas[..., 3:] * (1 - a)

    ink, skin, light = s['ink'], s['skin'], s['light']
    white = light * 0.45 + np.array([255, 250, 242]) * 0.55
    over(white, eye_a)
    # the upper lid's shadow on the white
    over(skin * 0.82, eye_a * (1 - smoothstep(0, 3.2, V - UP)) * 0.75)

    # iris: lash ink at the top warming to her brow colour at the bottom, a dark pupil and a rim
    mid_i = int(np.argmax(lo - up))
    ix = u[mid_i]
    iy = (up[mid_i] + lo[mid_i]) / 2 + look['iris_dy']
    R = look['iris'] * width
    d = np.hypot(U - ix, V - iy)
    k = np.clip((V - iy + R) / (2 * R), 0, 1)[..., None] ** 1.2
    col = ink * (1 - k) + (hair * 0.4 + brow * 0.6 + 26) * k
    col = col * (1 - 0.55 * smoothstep(R - 1.3, R - 0.2, d)[..., None]) + ink * 0.55 * smoothstep(R - 1.3, R - 0.2, d)[..., None]
    pupil = (1 - smoothstep(2.4, 3.2, d)) * (1 - 0.5 * k[..., 0])
    col = col * (1 - pupil[..., None]) + ink * 0.75 * pupil[..., None]
    over(col, aa(R - d) * eye_a)
    # the lid's shadow over the iris too
    over(ink * 0.9, aa(R - d) * eye_a * (1 - smoothstep(0, 2.6, V - UP)) * 0.55)
    # highlights: a big one towards the outer corner, a small one low on the inner side
    for hx, hy, hr, a in [(-2.3, -2.4, 1.7, 1.0), (2.4, 2.3, 0.8, 0.85)]:
        hd = np.hypot(U - (ix + hx * -s['outer']), V - (iy + hy))
        over(np.array([255, 255, 252]), aa(hr - hd) * eye_a * a)

    # lower lid: a soft line of watered-down ink along the outer two thirds
    lo_line = aa(0.55 - np.abs(V - LO - 0.25)) * (smoothstep(0.0, 0.08, t) * (1 - smoothstep(0.55, 0.8, t)))[None, :]
    over(ink * 0.5 + skin * 0.5, lo_line * 0.6)

    # the lid highlight she paints above a closed eye, now resting in the crease above the open one
    crease = aa(0.7 - np.abs(V - (UP - 3.6 - 0.6 * np.sin(math.pi * t[None, :])))) * (smoothstep(0.12, 0.3, t) * (1 - smoothstep(0.75, 0.95, t)))[None, :]
    over(light, cv2.GaussianBlur(crease, (0, 0), 0.5 * SS) * 0.85)
    crease_line = aa(0.4 - np.abs(V - (UP - 2.6 - 0.4 * np.sin(math.pi * t[None, :])))) * (smoothstep(0.1, 0.3, t) * (1 - smoothstep(0.7, 0.9, t)))[None, :]
    over(brow, cv2.GaussianBlur(crease_line, (0, 0), 0.4 * SS) * 0.35)

    # her own lash stroke: lifted off the closed eye, flipped so the lashes point up, bent onto the upper lid
    src = cv2.warpAffine(orig, to_frame(eye, SS), (Wf, Hf), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    sl = lum(src)
    lash_a = np.clip((s['lum_skin'] - 12 - sl) / (s['lum_skin'] - 12 - s['lum_ink']), 0, 1) ** 0.85
    near = (np.abs(V - np.polyval(s['core'], U)) < 6.5) & (U > x0 - 2) & (U < x1 + 2)
    lash_a *= near
    # unmix the skin from the stroke's edge pixels so the lifted lashes carry no halo
    a3 = np.maximum(lash_a, 1e-3)[..., None]
    lash_rgb = np.clip((src[..., :3] - (1 - a3) * skin) / a3, 0, 255)
    lash_rgb = np.where(lash_a[..., None] > 0.05, lash_rgb, ink)
    core_u = np.polyval(s['core'], U)
    # flip about the core and drop it on the lid; past the core the lashes are drawn shorter
    up_from_lid = UP - 0.9 - V
    sy = core_u + np.where(up_from_lid > 1.2, 1.2 + (up_from_lid - 1.2) / LASH_LENGTH, up_from_lid)
    map_x = ((U + FRAME[0] / 2) * SS - 0.5).astype(np.float32)
    map_y = ((sy + FRAME[1] / 2) * SS - 0.5).astype(np.float32)
    lash = np.dstack([lash_rgb, lash_a])
    bent = cv2.remap(lash.astype(np.float32), map_x, map_y, cv2.INTER_LINEAR, borderValue=0)
    # the long lashes gather at the outer corner and thin out towards the inner one
    hairs = up_from_lid > 1.2
    bent[..., 3] *= np.where(hairs, 1 - 0.85 * smoothstep(0.35, 0.85, t)[None, :], 1)
    over(bent[..., :3], bent[..., 3])

    canvas[..., :3] *= canvas[..., 3:]  # premultiply for the turn back
    return canvas


def paint(look_name, img, cleaned, studies, brow, hair):
    bw, bh = BOX[2] - BOX[0], BOX[3] - BOX[1]
    out = cleaned[BOX[1]:BOX[3], BOX[0]:BOX[2]].copy()
    for eye, s in zip(EYES, studies):
        layer = paint_eye(img, eye, s, LOOKS[look_name], brow, hair)
        # frame (SS) -> girl.webp px -> patch px at SS
        to_patch = np.array([[SS, 0, -BOX[0] * SS], [0, SS, -BOX[1] * SS], [0, 0, 1]], float)
        m = (to_patch @ np.linalg.inv(as3(to_frame(eye, SS))))[:2]
        turned = cv2.warpAffine(layer.astype(np.float32), m, (bw * SS, bh * SS), flags=cv2.INTER_LINEAR, borderValue=0)
        small = cv2.resize(turned, (bw, bh), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), 0.3)  # her painting is soft; take the vector edge off
        a = small[..., 3:]
        out[..., :3] = small[..., :3] + out[..., :3] * (1 - a)

    # keep only what changed, feathered, so the patch melts into the untouched picture
    orig = img[BOX[1]:BOX[3], BOX[0]:BOX[2]]
    diff = (np.abs(out[..., :3] - orig[..., :3]).max(-1) > 3).astype(np.uint8) * 255
    diff = cv2.dilate(diff, np.ones((3, 3), np.uint8), iterations=2)
    alpha = np.clip(cv2.GaussianBlur(diff.astype(float), (0, 0), 1.2) / 255 * 1.6, 0, 1) * orig[..., 3]
    out[..., 3] = alpha
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', help='also write a closed / drowsy / open comparison of her face here')
    args = ap.parse_args()

    girl = Image.open(ASSETS / 'girl.webp').convert('RGBA')
    img = np.array(girl).astype(float)
    studies = [study(img, e) for e in EYES]
    brow_px = img[150:175, 800:835]
    brow = np.median(brow_px[lum(brow_px) < np.percentile(lum(brow_px), 20)][:, :3], 0)
    hair_px = img[60:90, 760:800]
    hair = np.median(hair_px[lum(hair_px) < 120][:, :3], 0)
    for s in studies:
        print(f"lash {s['x0']:+.0f}..{s['x1']:+.0f} px, outer corner {'left' if s['outer'] < 0 else 'right'}, "
              f"ink {s['ink'].round()}, skin {s['skin'].round()}, highlight {s['light'].round()}")
    cleaned = clean(img, studies)

    patches = {}
    for name in LOOKS:
        patches[name] = paint(name, img, cleaned, studies, brow, hair)
        patches[name].save(ASSETS / f'girl-eyes-{name}.webp', quality=95, method=6)
        print('wrote', ASSETS / f'girl-eyes-{name}.webp')

    if args.preview:
        crop = (690, 120, 880, 230)
        frames = []
        for p in [None, patches['drowsy'], patches['open']]:
            c = girl.copy()
            if p:
                c.alpha_composite(p, BOX[:2])
            frames.append(c.crop(crop).resize(((crop[2] - crop[0]) * 3, (crop[3] - crop[1]) * 3), Image.LANCZOS))
        sheet = Image.new('RGBA', (frames[0].width * 3 + 20, frames[0].height), (255, 255, 255, 255))
        for i, f in enumerate(frames):
            sheet.alpha_composite(f, (i * (f.width + 10), 0))
        sheet.convert('RGB').save(args.preview)
        print('wrote', args.preview)


if __name__ == '__main__':
    main()
