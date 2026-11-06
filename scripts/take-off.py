"""Take her glasses and shoes off: girl.webp is scripts/source/girl-dressed.webp with the glasses painted out of
her face and bare feet painted over her shoes (meadow.ts lays the glasses and shoes on the grass beside her).

The glasses: the two rims are found by fitting an ellipse to the thin painted line around each eye, the bridge and
hinges are short strokes between them, and the whole frame is inpainted from the skin, brows and hair around it.
The feet: each is drawn along its own axis (ankle under the hem to the tip of the toes) in her skin colours,
lit from the instep that already shows, with a tan pencil outline like the rest of her; the hem is laid back on top.

Run paint-eyes.py afterwards, so the open and drowsy eyes are painted without the glasses too:

    .venv/bin/python scripts/take-off.py [--preview preview.png]
    .venv/bin/python scripts/paint-eyes.py
"""

import argparse
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source/girl-dressed.webp'
OUT = ROOT.parent / 'src/assets/meadow/girl.webp'
SS = 4  # supersampling while painting the feet

# first guesses for the rims (centre x, y, radius x, y, turn in degrees), refined against the picture
RIMS = [(738, 155, 28, 27, 0), (808, 188, 32, 29, 0)]
# the bridge and the hinges with the stub of each temple, as strokes in girl.webp px
FRAME_STROKES = [
    [(763, 161), (768, 159), (773, 161), (778, 165), (781, 169)],
    [(709, 136), (713, 138), (717, 140)],
    [(836, 193), (840, 196), (845, 200)],
    [(833, 170), (835, 172)],
    [(779, 177), (782, 179)],
]

RIM_HALF = 3.6  # half the rim's painted width, px
DARK = 100  # brows and hair are darker than this
BRIDGE = (762, 156, 784, 174)  # box round the bridge, girl.webp px
BROWS = [(705, 118, 770, 142), (790, 145, 845, 178)]  # boxes round her brows, where the rims cut through them

# the bottom edge of her hem over her feet (girl.webp px): below it, round the feet, the shoes are taken away
HEM = [(240, 1505), (330, 1503), (345, 1515), (360, 1523), (382, 1530), (405, 1535), (411, 1545), (420, 1556), (432, 1565),
       (456, 1572), (462, 1582), (470, 1598), (490, 1605), (512, 1603), (540, 1612)]
# each foot: ankle (under the hem) -> tip of the toes, and which side the big toe is on (1 = to the right of the axis
# looking from ankle to toe, -1 = left); the big toes are on the inside, toward each other
FEET = [
    dict(ankle=(380, 1520), tip=(293, 1682), big=-1),
    dict(ankle=(442, 1556), tip=(356, 1720), big=1),
]
FEET_RIGHT = 500  # nothing of her but her feet below the hem left of this
# the toes: where across the front of the foot each sits (-1 little-toe edge .. 1 big-toe edge), radius (px for a
# 52 px wide foot), and how far short of the tip each one ends
TOES = [(0.64, 9.0, 0.0), (0.12, 6.4, 2.0), (-0.3, 5.8, 5.5), (-0.62, 5.1, 10.0), (-0.86, 4.5, 15.5)]
WALL = 3.0  # how much thinner the foot is than the shoe, all round (px)
NAIL = np.array([255, 232, 214])
SKIN = np.array([251, 207, 156])  # her instep, in the light
SKIN_SHADE = np.array([236, 168, 128])
TOE_BLUSH = np.array([246, 172, 140])
OUTLINE = np.array([186, 128, 92])


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def ellipse_pts(p, n=360):
    cx, cy, rx, ry, a = p
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    a = np.deg2rad(a)
    return np.c_[cx + rx * np.cos(t) * np.cos(a) - ry * np.sin(t) * np.sin(a),
                 cy + rx * np.cos(t) * np.sin(a) + ry * np.sin(t) * np.cos(a)]


def fit_rim(detail, guess):
    """Nudge the ellipse until it runs along the painted rim (where fine detail is strongest)."""
    def score(p):
        q = ellipse_pts(p).astype(np.float32)
        v = cv2.remap(detail, q[None, :, 0], q[None, :, 1], cv2.INTER_LINEAR)[0]
        return np.median(v) + 0.5 * np.mean(v)
    best = np.array(guess, float)
    bs = score(best)
    for step in [3, 1.5, 0.75, 0.4, 0.2]:
        improved = True
        while improved:
            improved = False
            for i in range(5):
                for s in (-1, 1):
                    q = best.copy()
                    q[i] += s * step * (4 if i == 4 else 1)
                    sc = score(q)
                    if sc > bs:
                        best, bs, improved = q, sc, True
    return best


def remove_glasses(img):
    rgb = img[..., :3]
    detail = cv2.GaussianBlur(np.abs(rgb - cv2.medianBlur(rgb.astype(np.uint8), 9)).sum(-1).astype(np.float32), (0, 0), 0.8)
    H, W = img.shape[:2]
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
    out = img.copy()
    dark = lum(rgb) < DARK
    near = np.zeros((H, W), bool)
    mask = np.zeros((H, W), np.uint8)
    # each rim is a ring: fill it across from just inside to just outside it. On plain skin the two sides are blended;
    # where it runs along a brow or the hair line each side is carried up to the middle, so the edge stays crisp,
    # and the brows and hair themselves are left as they are
    for guess in RIMS:
        rim = fit_rim(detail, guess)
        cx, cy, rx, ry, a = rim
        a = np.deg2rad(a)
        dx, dy = X - cx, Y - cy
        u, v = dx * np.cos(a) + dy * np.sin(a), -dx * np.sin(a) + dy * np.cos(a)
        R = (rx * ry) ** 0.5
        # the rim is hand drawn, not a true ellipse: follow it angle by angle
        th = np.linspace(-np.pi, np.pi, 720, endpoint=False)
        offs = np.linspace(-4, 4, 33)
        prof = []
        for o in offs:
            q = 1 + o / R
            ex, ey = rx * q * np.cos(th), ry * q * np.sin(th)
            px, py = cx + ex * np.cos(a) - ey * np.sin(a), cy + ex * np.sin(a) + ey * np.cos(a)
            prof.append(cv2.remap(detail, px.astype(np.float32)[None], py.astype(np.float32)[None], cv2.INTER_LINEAR)[0])
        prof = np.array(prof)
        found = (prof * offs[:, None]).sum(0) / np.maximum(prof.sum(0), 1e-6)  # detail-weighted offset per angle
        found = np.convolve(np.r_[found[-15:], found, found[:15]], np.ones(31) / 31, 'same')[15:-15]
        print('rim', np.round(rim, 1).tolist(), 'drifts', np.round(found.min(), 1), '..', np.round(found.max(), 1), 'px')
        ang = np.arctan2(v / ry, u / rx)
        shift = np.interp(ang, th, found, period=2 * np.pi)
        rho = np.sqrt((u / rx) ** 2 + (v / ry) ** 2) + 1e-6 - shift / R
        half = RIM_HALF / R
        ring = np.abs(rho - 1) < half
        near |= np.abs(rho - 1) < 6.5 / R
        def at(r):
            k = (r + shift / R) / (rho + shift / R)
            return cv2.remap(rgb.astype(np.float32), (cx + dx * k).astype(np.float32), (cy + dy * k).astype(np.float32), cv2.INTER_LINEAR)
        inner, outer = at(np.float32(1 - half - 1 / R)), at(np.float32(1 + half + 1 / R))
        t = np.clip((rho - (1 - half)) / (2 * half), 0, 1)
        sharp = smoothstep(35, 80, np.abs(lum(inner) - lum(outer)))
        t = (t * (1 - sharp) + smoothstep(0.42, 0.58, t) * sharp)[..., None]
        out[..., :3] = np.where((ring & ~dark)[..., None], inner * (1 - t) + outer * t, out[..., :3])
    # what is left of the rims' pale shine and grey edging, next to the brows and hair: back to the skin around it
    skin = cv2.medianBlur(out[..., :3].clip(0, 255).astype(np.uint8), 13).astype(float)
    off = lum(out[..., :3]) - lum(skin)
    stray = near & ~dark & ((off > 5) | ((off < -10) & (lum(out[..., :3]) > DARK + 40)))
    stray = cv2.dilate(stray.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~dark
    soft = cv2.GaussianBlur(stray.astype(np.float32), (0, 0), 0.8)[..., None]
    out[..., :3] = out[..., :3] * (1 - soft) + skin * soft
    # her brows, mended where a rim crossed them: the gaps closed up in the brow's own colour
    for x0, y0, x1, y1 in BROWS:
        d = dark[y0:y1, x0:x1].astype(np.uint8)
        closed = cv2.morphologyEx(d, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
        cover = cv2.GaussianBlur(np.maximum(closed, d).astype(np.float32), (0, 0), 0.7)[..., None]
        brow = np.median(rgb[y0:y1, x0:x1][d > 0], 0)
        out[y0:y1, x0:x1, :3] = np.where(d[..., None] > 0, out[y0:y1, x0:x1, :3], out[y0:y1, x0:x1, :3] * (1 - cover) + brow * cover)
    # the bridge between the lenses: whatever isn't skin
    x0, y0, x1, y1 = BRIDGE
    box = np.zeros((H, W), bool)
    box[y0:y1, x0:x1] = True
    mask |= (box & (lum(out[..., :3]) < 222)).astype(np.uint8) * 255
    # the bridge, nose pads and hinges: short strokes, inpainted
    strokes = np.zeros((H, W), np.uint8)
    for st in FRAME_STROKES:
        cv2.polylines(strokes, [np.round(np.array(st) * 16).astype(np.int32)], False, 255, 4, cv2.LINE_AA, 4)
    mask |= (strokes > 40).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((2, 2), np.uint8))
    out[..., :3] = cv2.inpaint(np.ascontiguousarray(out[..., :3].astype(np.uint8)), mask, 2, cv2.INPAINT_TELEA)
    return out


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def seg_dist(s, w, s0, w0, s1, w1):
    es, ew = s1 - s0, w1 - w0
    k = np.clip(((s - s0) * es + (w - w0) * ew) / (es * es + ew * ew), 0, 1)
    return np.hypot(s - s0 - es * k, w - w0 - ew * k)


def foot_layer(img, below, foot, other):
    """One bare foot seen from above, shaped by the shoe it was in: the shoe's outline, drawn in a little (the shoe's
    walls), with the toes rounded off along its front. As premultiplied RGBA at 1x, painted at SS x."""
    H, W = img.shape[:2]
    (ax, ay), (tx, ty) = foot['ankle'], foot['tip']
    L = np.hypot(tx - ax, ty - ay)
    ux, uy = (tx - ax) / L, (ty - ay) / L
    vx, vy = -uy, ux
    x0, x1 = max(int(min(ax, tx)) - 50, 0), min(int(max(ax, tx)) + 50, W)
    y0, y1 = max(int(min(ay, ty)) - 50, 0), min(int(max(ay, ty)) + 50, H)
    # the shoe: everything of her below the hem on this foot's side of the gap between the two
    Y, X = np.mgrid[y0:y1, x0:x1].astype(float)
    def axis_dist(f):
        (px, py), (qx, qy) = f['ankle'], f['tip']
        ex, ey = qx - px, qy - py
        k = np.clip(((X - px) * ex + (Y - py) * ey) / (ex * ex + ey * ey), 0, 1)
        return np.hypot(X - px - ex * k, Y - py - ey * k)
    mine = axis_dist(foot) < axis_dist(other)
    shoe = (below[y0:y1, x0:x1] > 0) & (img[y0:y1, x0:x1, 3] > 128) & mine
    shoe = cv2.morphologyEx(shoe.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    # upsample it, and measure how far inside its edge each point is (px at 1x)
    big = cv2.resize(shoe * 255, ((x1 - x0) * SS, (y1 - y0) * SS), interpolation=cv2.INTER_LINEAR)
    big = cv2.GaussianBlur(big, (0, 0), SS * 1.2)
    depth = cv2.distanceTransform((big > 127).astype(np.uint8), cv2.DIST_L2, 5) / SS - WALL
    # the hem side: let the foot run on up under the skirt
    Yb, Xb = np.mgrid[y0 * SS:y1 * SS, x0 * SS:x1 * SS].astype(float)
    Xb, Yb = (Xb + 0.5) / SS, (Yb + 0.5) / SS
    s = (Xb - ax) * ux + (Yb - ay) * uy
    w = ((Xb - ax) * vx + (Yb - ay) * vy) * foot['big']
    depth = np.where(s < 12, np.maximum(depth, 6 - np.abs(w) * 0.0 + (12 - s)), depth)

    # the toes, along the front of the foot: spread over the foot's width where they start
    base = L - 24
    row = (np.abs(s - base) < 1.5) & (depth > 0)
    lo, hi = (w[row].min(), w[row].max()) if row.any() else (-24, 24)
    span, mid = hi - lo, (hi + lo) / 2
    toes = []
    for frac, r, back in TOES:
        wc = mid + frac * span / 2
        sc = L - r - back
        toes.append(r * span / 52 - seg_dist(s, w, sc - 16, wc - 0.15 * (wc - mid), sc, wc))
    toe = np.max(toes, 0)
    body = np.minimum(depth, base + 5 - 0.008 * (w - mid - 0.2 * span) ** 2 - s)
    inside = np.maximum(body, np.minimum(toe, depth + 6))
    a = np.clip(inside + 0.5, 0, 1)

    # skin: lit along the ridge of the foot, shaded toward its edges, warm toward the toes
    sh = 1 - smoothstep(0, 11, depth)
    col = SKIN * (1 - sh[..., None]) + SKIN_SHADE * sh[..., None]
    warm = 0.4 * smoothstep(base - 10, L, s)
    col = col * (1 - warm[..., None]) + TOE_BLUSH * warm[..., None]
    ink = smoothstep(1.6, 0.3, inside) * smoothstep(-20, -8, s) * 0.85
    for i, (frac, r, back) in enumerate(TOES):
        wc, sc = mid + frac * span / 2, L - r - back
        rr = r * span / 52
        # the crease round each toe where it lies against the foot or the next toe
        ink = np.maximum(ink, smoothstep(1.0, 0.15, np.abs(toes[i])) * (inside > 0.8) * smoothstep(sc - 9, sc - 4, s) * 0.5)
        nd = np.hypot((s - (sc + rr * 0.15)) / 0.9, w - wc) - rr * 0.5
        nail = smoothstep(0.5, -0.3, nd)
        col = col * (1 - 0.6 * nail[..., None]) + NAIL * 0.6 * nail[..., None]
        ink = np.maximum(ink, smoothstep(0.6, 0.0, np.abs(nd)) * 0.3)
    col = col * (1 - ink[..., None]) + OUTLINE * ink[..., None]

    layer = np.concatenate([col * a[..., None], a[..., None] * 255], -1).astype(np.float32)
    small = cv2.resize(layer, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    full = np.zeros((H, W, 4), np.float32)
    full[y0:y1, x0:x1] = small
    return full


def put_on_feet(img):
    H, W = img.shape[:2]
    below = np.zeros((H, W), np.uint8)
    cv2.fillPoly(below, [np.array(HEM + [(HEM[-1][0], H), (HEM[0][0], H)], np.int32)], 1)
    below[:, FEET_RIGHT:] = 0
    feet = np.zeros((H, W, 4), np.float32)
    for i, f in enumerate(FEET):
        layer = foot_layer(img, below, f, FEET[1 - i])
        feet = layer + feet * (1 - layer[..., 3:] / 255)
    # out with the shoes; the feet go under the hem
    base = img.copy()
    base[below.astype(bool)] = 0
    pm = np.concatenate([base[..., :3] * base[..., 3:] / 255, base[..., 3:]], -1)
    over = pm + feet * (1 - pm[..., 3:] / 255)
    a = over[..., 3:]
    out = np.concatenate([np.where(a > 0, over[..., :3] * 255 / np.maximum(a, 1e-6), 0), a], -1)
    return np.clip(out, 0, 255)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', help='also write a before / after of her face and feet here')
    args = ap.parse_args()
    src = np.array(Image.open(SOURCE).convert('RGBA')).astype(float)
    img = put_on_feet(remove_glasses(src))
    out = Image.fromarray(img.round().astype(np.uint8))
    out.save(OUT, quality=95, method=6)
    print('wrote', OUT)
    if args.preview:
        rows = []
        for crop, k in [((680, 100, 880, 240), 3), ((240, 1480, 520, 1770), 2)]:
            pair = []
            for im in [Image.fromarray(src.astype(np.uint8)), out]:
                bg = Image.new('RGBA', im.size, (70, 120, 40, 255))
                bg.alpha_composite(im)
                c = bg.crop(crop)
                pair.append(c.resize((c.width * k, c.height * k), Image.LANCZOS))
            rows.append(pair)
        Wd = max(p[0].width * 2 + 10 for p in rows)
        sheet = Image.new('RGB', (Wd, sum(p[0].height for p in rows) + 10), (255, 255, 255))
        y = 0
        for a, b in rows:
            sheet.paste(a.convert('RGB'), (0, y))
            sheet.paste(b.convert('RGB'), (a.width + 10, y))
            y += a.height + 10
        sheet.save(args.preview)
        print('wrote', args.preview)


if __name__ == '__main__':
    main()
