"""Her falling picture, with her glasses, watch and shoes taken off so they can slip away from her as she falls:
girl-falling.webp is scripts/source/girl-falling.png (its leftover background glow dropped, trimmed to her),
with the glasses, watch and shoes painted out; falling-watch.webp and falling-shoe-{0,1}.webp are the watch and
shoes cut out of it. meadow.ts lays them back where they were (FALLER.watch and FALLER.shoes, printed below) and
lets them drift off, with a pair of glasses painted by props.ts in place of the ones taken off (their wire is too
fine to cut out cleanly). girl-falling-eyes-{half,shut}.webp are her face with the lids half down and shut, for
her to blink with (FALLER.eyes, printed below).

The glasses come off the way take-off.py takes them off the meadow picture: each rim is fitted to the painted line
and filled across from either side of it, the brows are mended, and the bridge and hinges are inpainted.
The watch: its face and strap, inside a hand-drawn outline, minus anything skin- or sleeve-coloured; her wrist is
painted back in its own skin under it.
The shoes: everything cream round a point on each, with the brown rim of the sole; the foot under one is the
shoe's outline drawn in a little, in her skin carried on from her instep, shaded toward its edge and outlined, with
the toes marked at its tip. Each shoe keeps its opening, painted as its lining.
The lids: each eye is filled in with the skin round it, and a lash line drawn across it (a quadratic from corner
to corner, through a control point): halfway down for the half-shut lid, along the lower lid for the shut one.

    .venv/bin/python scripts/falling-props.py [--preview preview.png]
"""

import argparse
import importlib.util
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'source/girl-falling.png'
OUT = ROOT.parent / 'src/assets/meadow'
GLOW = 16  # alpha below this in the source is the leftover glow round her

# the glasses, in trimmed px, for take-off.py's remove_glasses: first guesses for the rims (centre x, y, radius
# x, y, turn in degrees), the bridge and hinges as strokes, a box round the bridge, and boxes round her brows
GLASSES = dict(
    RIMS=[(174, 552, 22, 21, 0), (130, 590, 26, 25, 0)],
    FRAME_STROKES=[[(150, 568), (155, 571), (160, 575)], [(195, 543), (203, 535), (211, 526), (218, 517)], [(106, 604), (101, 611), (97, 617)]],
    BRIDGE=(148, 560, 162, 580),
    # the rims only graze her brows here, and mending them thickens them, so they are left as they are
    BROWS=[],
)
# the watch: its face (centre, radius) and the strap as a polygon
WATCH_FACE = (666, 560, 17)
WATCH_STRAP = [(674, 558), (697, 572), (690, 594), (664, 578)]
# her wrist where the watch was, from its edge by the hand down into her cuff
WRIST = [(664, 536), (698, 559), (683, 580), (670, 592), (655, 562)]
SKIN = np.array([253, 221, 179])
SLEEVE = np.array([250, 246, 180])

# each shoe: a point on it, a point on her leg above it, and its foot's axis from ankle to the tip of the toes
SHOES = [
    dict(seed=(780, 120), leg=(800, 170), ankle=(830, 200), tip=(722, 105)),
    dict(seed=(1160, 60), leg=(1180, 120), ankle=(1195, 185), tip=(1150, 25)),
]
WALL = 4  # how much thinner the foot is than the shoe, all round (px)
SS = 4  # supersampling while painting the feet and lids
FOOT_SHADE = np.array([236, 186, 140])
FOOT_LINE = np.array([153, 127, 91])  # the line round her legs
LINING = np.array([238, 224, 202])
LINING_SHADE = np.array([214, 194, 166])

# each eye: its corners (outer first), and the control points of its upper lid, its lower lid and the shut lash
# line; the patch box round both (left, top, right, bottom)
EYES = [
    dict(corners=((111, 605), (139, 586)), upper=(115, 570.5), lower=(130, 611), shut=(128, 603)),
    dict(corners=((175, 550), (153, 565)), upper=(160, 534.5), lower=(168, 573), shut=(166, 563)),
]
EYE_BOX = (98, 528, 188, 618)
LASH = np.array([62, 40, 32])


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def trimmed():
    a = np.array(Image.open(SOURCE).convert('RGBA')).astype(float)
    a[..., 3] = np.clip((a[..., 3] - GLOW) / (255 - GLOW), 0, 1) * 255
    ys, xs = np.nonzero(a[..., 3] > 0)
    x0, y0 = max(xs.min() - 8, 0), max(ys.min() - 8, 0)
    x1, y1 = min(xs.max() + 9, a.shape[1]), min(ys.max() + 9, a.shape[0])
    return a[y0:y1, x0:x1]


def cut(img, mask, pad=6):
    """The masked part of img as its own RGBA sprite, and where its top-left sits."""
    ys, xs = np.nonzero(mask > 0.02)
    x0, y0, x1, y1 = xs.min() - pad, ys.min() - pad, xs.max() + pad + 1, ys.max() + pad + 1
    spr = img[y0:y1, x0:x1].copy()
    spr[..., 3] = spr[..., 3] * mask[y0:y1, x0:x1]
    return spr, (int(x0), int(y0))


def remove_glasses(img):
    spec = importlib.util.spec_from_file_location('take_off', ROOT / 'take-off.py')
    take_off = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(take_off)
    for k, v in GLASSES.items():
        setattr(take_off, k, v)
    return take_off.remove_glasses(img)


def watch(img):
    H, W = img.shape[:2]
    region = np.zeros((H, W), np.uint8)
    cx, cy, r = WATCH_FACE
    cv2.circle(region, (cx, cy), r, 255, -1, cv2.LINE_AA)
    cv2.fillPoly(region, [np.array(WATCH_STRAP, np.int32)], 255, cv2.LINE_AA)
    region = region / 255
    away = np.minimum(np.linalg.norm(img[..., :3] - SKIN, axis=-1), np.linalg.norm(img[..., :3] - SLEEVE, axis=-1))
    # the strap is a soft grey, the sleeve a strong yellow
    rgb = img[..., :3]
    sat = (rgb.max(-1) - rgb.min(-1)) / np.maximum(rgb.max(-1), 1)
    # the face and its rim are all watch; along the strap, only what isn't her skin or sleeve
    face = np.zeros((H, W), np.uint8)
    cv2.circle(face, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return np.maximum(region * smoothstep(30, 55, away) * smoothstep(0.42, 0.34, sat), face / 255)


def bare_wrist(img, band):
    """Her wrist under the watch: inside its outline (WRIST) it is painted in her skin colour, lighter toward the
    hand; the rest of what the watch covered (cuff, sleeve) is inpainted from what is round it, transparency and all."""
    m = cv2.dilate((band > 0.05).astype(np.uint8), np.ones((7, 7), np.uint8))
    outline = np.zeros_like(m)
    cv2.fillPoly(outline, [np.array(WRIST, np.int32)], 1)
    wrist = m & outline
    rest = m & (1 - wrist)
    H, W = img.shape[:2]
    Y, X = np.mgrid[0:H, 0:W].astype(float)
    cx, cy, _ = WATCH_FACE
    # toward the hand (up and to the right) a touch lighter, toward the cuff a touch warmer
    t = np.clip(((X - cx) - (Y - cy)) / 60 + 0.5, 0, 1)[..., None]
    skin = SKIN * (0.97 + 0.03 * t) + np.array([0, -6, -8]) * (1 - t)
    # the skin first, so the inpainting round it draws on her wrist and not on the watch
    out = img.copy()
    soft = cv2.GaussianBlur(wrist.astype(np.float32), (0, 0), 1.0)[..., None]
    out[..., :3] = out[..., :3] * (1 - soft) + skin * soft
    out[..., 3] = np.maximum(out[..., 3], wrist * 255)
    premul = np.concatenate([out[..., :3] * out[..., 3:] / 255, out[..., 3:]], -1).round().astype(np.uint8)
    filled = cv2.inpaint(np.ascontiguousarray(premul[..., :3]), rest * 255, 4, cv2.INPAINT_TELEA).astype(float)
    alpha = cv2.inpaint(np.ascontiguousarray(premul[..., 3]), rest * 255, 4, cv2.INPAINT_TELEA).astype(float)
    a = np.maximum(alpha, 1)[..., None]
    out[..., :3] = np.where(rest[..., None] > 0, filled * 255 / a, out[..., :3])
    out[..., 3] = np.where(rest > 0, alpha, out[..., 3])
    return out


def body_skin(img, legs):
    """Her skin (and the skirt it runs into), without the thin skin-coloured lines round her shoes."""
    rgb, al = img[..., :3], img[..., 3]
    ratio = rgb[..., 2] / np.maximum(rgb[..., 0], 1)
    like = (ratio < 0.76) & (lum(rgb) > 195) & (al > 200)
    op = cv2.morphologyEx(like.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    _, cc = cv2.connectedComponents(op)
    return like & np.isin(cc, [cc[y, x] for x, y in legs]) & (cv2.dilate(op, np.ones((3, 3), np.uint8)) > 0)


def find_shoes(img):
    """Each shoe as a mask (cream upper, bow and the sole's rim), and its outline filled in across the opening."""
    rgb, al = img[..., :3], img[..., 3]
    ratio = rgb[..., 2] / np.maximum(rgb[..., 0], 1)
    skin = body_skin(img, [s_['leg'] for s_ in SHOES])
    _, lab = cv2.connectedComponents(((ratio > 0.8) & (al > 128)).astype(np.uint8))
    out = []
    for s_ in SHOES:
        x, y = s_['seed']
        cream = (lab == lab[y, x]).astype(np.uint8)
        band = cv2.dilate(cream, np.ones((7, 7), np.uint8)) > 0
        shoe = (cream > 0) | (band & ((lum(rgb) < 205) | (al < 250) | (ratio > 0.78)) & ~skin)
        hull = np.zeros_like(cream)
        cv2.fillConvexPoly(hull, cv2.convexHull(cv2.findNonZero(cream)), 1)
        out.append((shoe, hull > 0))
    return out, skin


def bare_feet(img, shoes, skin):
    H, W = img.shape[:2]
    out = img.copy()
    for s_, (shoe, hull) in zip(SHOES, shoes):
        showing = skin & ~(cv2.dilate(shoe.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0)
        # the foot: the shoe's outline drawn in by WALL, rounded, at SS
        big = cv2.resize(hull.astype(np.float32), (W * SS, H * SS), interpolation=cv2.INTER_LINEAR) > 0.5
        k = 2 * WALL * SS + 1
        big = cv2.erode(big.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
        big = cv2.GaussianBlur(big.astype(np.float32), (0, 0), 2 * SS)
        foot = cv2.resize(smoothstep(0.35, 0.65, big), (W, H), interpolation=cv2.INTER_AREA)
        foot = np.maximum(foot, (skin & hull) * 1.0)
        # what is repainted: the shoe and round it, and the faint edge of its rim further out
        region = (cv2.dilate(hull.astype(np.uint8), np.ones((13, 13), np.uint8)) > 0) & ~showing & ~(skin & ~hull)
        region |= (cv2.dilate(hull.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0) & (img[..., 3] < 200)
        # her skin carried on into the foot from what shows of it, shaded toward the edge and outlined
        src = img[..., :3].copy()
        src[~skin] = SKIN
        known = (region | ~skin).astype(np.uint8) * 255
        col = cv2.inpaint(src.clip(0, 255).astype(np.uint8), known, 6, cv2.INPAINT_TELEA).astype(float)
        d = cv2.distanceTransform(((foot > 0.5) | skin).astype(np.uint8), cv2.DIST_L2, 3)
        col += (FOOT_SHADE - col) * (0.6 * (1 - smoothstep(0, 6, d)))[..., None]
        # the toes: a blush toward the tip and the creases between them, along the axis
        (ax, ay), (tx, ty) = s_['ankle'], s_['tip']
        L = np.hypot(tx - ax, ty - ay)
        ux, uy = (tx - ax) / L, (ty - ay) / L
        Y, X = np.mgrid[0:H, 0:W].astype(float)
        along, across = (X - ax) * ux + (Y - ay) * uy, (X - ax) * -uy + (Y - ay) * ux
        tip = smoothstep(L - 30, L - 4, along) * (foot > 0.5)
        col = col * (1 - 0.35 * tip[..., None]) + np.array([246, 180, 146]) * 0.35 * tip[..., None]
        ink = (1 - smoothstep(0, 1.6, d)) * 0.75
        row = (np.abs(along - (L - 14)) < 1) & (foot > 0.5)
        if row.any():
            lo, hi = across[row].min(), across[row].max()
            for f in (0.38, 0.58, 0.76):
                crease = smoothstep(0.9, 0.2, np.abs(across - (lo + f * (hi - lo)))) * smoothstep(L - 13, L - 6, along)
                ink = np.maximum(ink, crease * (d > 0.8) * 0.45)
        col = col * (1 - ink[..., None]) + FOOT_LINE * ink[..., None]
        pm = np.where(region, 1, cv2.GaussianBlur(region.astype(np.float32), (0, 0), 0.8) * hull)
        out[..., :3] = out[..., :3] * (1 - pm[..., None]) + col * pm[..., None]
        out[..., 3] = np.where(region, foot * 255, out[..., 3])
        # what is left clear round the foot takes its line colour, so nothing cream bleeds in when it is filtered
        out[..., :3] = np.where((region & (foot < 0.5))[..., None], FOOT_LINE, out[..., :3])
    return out


def shoe_sprite(img, shoe, hull):
    """The shoe cut out, its opening painted as the lining (shaded under the rim)."""
    # the hull's straight edge across the opening, softened
    mask = np.maximum(shoe, cv2.GaussianBlur(hull.astype(np.float32), (0, 0), 0.7))
    opening = hull & ~shoe
    d = cv2.distanceTransform((~shoe).astype(np.uint8), cv2.DIST_L2, 3)
    t = smoothstep(0, 8, d)[..., None]
    out = img.copy()
    out[..., :3] = np.where(opening[..., None], LINING_SHADE * (1 - t) + LINING * t, out[..., :3])
    out[..., 3] = np.where(opening, 255, out[..., 3])
    return cut(out, mask)


def bezier(p0, c, p1, n=64):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * np.array(p0) + 2 * (1 - t) * t * np.array(c) + t ** 2 * np.array(p1)


def eyelids(img, ctrl, shut):
    """Her face (EYE_BOX) with each eye's lid down to the lash line through `ctrl(eye)`: above it the eye is filled
    with the skin round it, and the line is drawn in, thick at the outer corner."""
    x0, y0, x1, y1 = EYE_BOX
    patch = img[y0:y1, x0:x1].copy()
    h, w = patch.shape[:2]
    for e in EYES:
        p0, p1 = e['corners']
        line = bezier(p0, ctrl(e), p1)
        # shut, the whole eye goes (down to its lower lid); half shut, only what is above the line
        below = e['lower'] if shut else ctrl(e)
        lid = np.concatenate([bezier(p0, e['upper'], p1), bezier(p0, below, p1)[::-1]]) - (x0, y0)
        hole = np.zeros((h * SS, w * SS), np.uint8)
        cv2.fillPoly(hole, [np.round(lid * SS).astype(np.int32)], 255)
        hole = cv2.resize(hole, (w, h), interpolation=cv2.INTER_AREA)
        # the old lid line and lashes round it go too
        hole = cv2.dilate((hole > 20).astype(np.uint8), np.ones((7, 7) if shut else (5, 5), np.uint8))
        if not shut:
            # but not the eye below the line
            keep = np.zeros((h * SS, w * SS), np.uint8)
            cv2.fillPoly(keep, [np.round((np.concatenate([line, bezier(p0, e['lower'], p1)[::-1]]) - (x0, y0)) * SS).astype(np.int32)], 1)
            hole &= 1 - cv2.resize(keep, (w, h), interpolation=cv2.INTER_NEAREST)
        # filled with the skin round the eye: its lighter pixels, blurred in across the hole
        rl = lum(patch[..., :3])
        near = (cv2.dilate(hole, np.ones((15, 15), np.uint8)) > 0) & ~(cv2.dilate(hole, np.ones((3, 3), np.uint8)) > 0)
        wt = (near & (rl > np.percentile(rl[near], 40))).astype(np.float32)
        # (a close blur keeps its shading; a wide one reaches the middle of the eye, where the close one runs out)
        def spread(sigma):
            b = lambda a: cv2.GaussianBlur(a, (0, 0), sigma)
            return np.dstack([b(patch[..., c].astype(np.float32) * wt) for c in range(3)]), b(wt)[..., None]
        (c4, w4), (c12, w12) = spread(4), spread(12)
        k = smoothstep(0.02, 0.15, w4)
        fill = k * c4 / np.maximum(w4, 1e-6) + (1 - k) * c12 / np.maximum(w12, 1e-6)
        soft = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 1.0)[..., None]
        patch[..., :3] = patch[..., :3] * (1 - soft) + fill * soft
        # the lash line, and a few lashes off its outer end
        ink = np.zeros((h * SS, w * SS), np.float32)
        q = (line - (x0, y0)) * SS
        for i in range(len(q) - 1):
            r = 1.0 - 0.7 * i / len(q)
            cv2.line(ink, tuple(np.round(q[i]).astype(int)), tuple(np.round(q[i + 1]).astype(int)), 1.0, max(1, int(round(r * 1.8 * SS))), cv2.LINE_AA)
        chord = np.array(p1, float) - p0
        down = np.array([-chord[1], chord[0]]) / np.hypot(*chord)
        if np.dot(down, np.array(ctrl(e)) - (np.array(p0) + p1) / 2) < 0:
            down = -down
        out_dir = -chord / np.hypot(*chord)
        for k, (at, ang) in enumerate([(0.02, 0.9), (0.1, 0.55), (0.2, 0.3)]):
            a = q[int(at * (len(q) - 1))]
            v = (down * np.cos(ang) + out_dir * np.sin(ang)) * (3.2 - 0.6 * k) * SS
            cv2.line(ink, tuple(np.round(a).astype(int)), tuple(np.round(a + v).astype(int)), 0.9, max(1, int(0.8 * SS)), cv2.LINE_AA)
        ink = cv2.resize(ink, (w, h), interpolation=cv2.INTER_AREA).clip(0, 1)[..., None]
        patch[..., :3] = patch[..., :3] * (1 - ink) + LASH * ink
    return patch


def save(a, path):
    Image.fromarray(a.round().clip(0, 255).astype(np.uint8)).save(path, quality=92, method=6)
    print('wrote', path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', help='also write a before / after of her face and wrist here')
    args = ap.parse_args()
    img = trimmed()
    band = watch(img)
    wspr, wat = cut(img, band)
    save(wspr, OUT / 'falling-watch.webp')
    print('  watch at', wat, 'size', wspr.shape[1::-1])

    shoes, skin = find_shoes(img)
    for i, (shoe, hull) in enumerate(shoes):
        sspr, sat = shoe_sprite(img, shoe, hull)
        save(sspr, OUT / f'falling-shoe-{i}.webp')
        print('  shoe at', sat, 'size', sspr.shape[1::-1])

    girl = bare_feet(bare_wrist(remove_glasses(img), band), shoes, skin)
    save(girl, OUT / 'girl-falling.webp')
    print('  size', girl.shape[1::-1])
    half = lambda e: (np.array(e['upper']) + e['shut']) / 2
    for name, ctrl in [('half', half), ('shut', lambda e: e['shut'])]:
        save(eyelids(girl, ctrl, name == 'shut'), OUT / f'girl-falling-eyes-{name}.webp')
    print('  eyes at', EYE_BOX[:2])

    if args.preview:
        rows = []
        x0, y0, x1, y1 = EYE_BOX
        half, shut = girl.copy(), girl.copy()
        half[y0:y1, x0:x1] = eyelids(girl, lambda e: (np.array(e['upper']) + e['shut']) / 2, False)
        shut[y0:y1, x0:x1] = eyelids(girl, lambda e: e['shut'], True)
        for (cx0, cy0, cx1, cy1), k in [((70, 490, 260, 660), 4), ((620, 520, 720, 610), 6), ((700, 0, 1260, 260), 1)]:
            pair = []
            for a_ in [img, girl, half, shut]:
                im = Image.fromarray(a_.round().clip(0, 255).astype(np.uint8))
                bg = Image.new('RGBA', im.size, (170, 205, 232, 255))
                bg.alpha_composite(im)
                c = bg.crop((cx0, cy0, cx1, cy1))
                pair.append(c.resize((c.width * k, c.height * k), Image.LANCZOS))
            rows.append(pair)
        for spr in [wspr]:
            im = Image.fromarray(spr.round().clip(0, 255).astype(np.uint8))
            bg = Image.new('RGBA', im.size, (170, 205, 232, 255))
            bg.alpha_composite(im)
            rows.append([bg.resize((im.width * 4, im.height * 4), Image.LANCZOS)])
        Wd = max(sum(p.width for p in r) + 10 for r in rows)
        sheet = Image.new('RGB', (Wd, sum(r[0].height for r in rows) + 10 * len(rows)), (255, 255, 255))
        y = 0
        for r in rows:
            x = 0
            for p in r:
                sheet.paste(p.convert('RGB'), (x, y))
                x += p.width + 10
            y += r[0].height + 10
        sheet.save(args.preview)
        print('wrote', args.preview)


if __name__ == '__main__':
    main()
