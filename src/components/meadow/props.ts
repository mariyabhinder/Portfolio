// The things she has taken off and left on the grass beside her: her round glasses, folded, by her head; her bucket
// hat, cast off above it; a black cap with the Crescentic swirl stitched on it, past her right hand; and her cream
// ballet flats, kicked off by her feet. Each is painted once while the meadow loads, the way the rest of the picture
// was: a watercolour wash pooling darker at its edges, a wobbly pencil line over it, and the paper's grain; and each
// gets a soft shadow on the grass.

// in scene px: where it lies, how it is turned (radians), and the box it is painted in
export interface Prop {
  x: number
  y: number
  rot: number
  w: number
  h: number
  sprite: HTMLCanvasElement
  shadow: HTMLCanvasElement
  /** how far its shadow falls (scene px, down and to the right like the rest) */
  lift: number
  /** set on the props something else has to find (the bag, which bagItems.ts opens; the phone, which the gallery lifts) */
  id?: string
}

export type Pt = [number, number]

// px per scene px; the camera closes in on her face with the glasses and hat in view, so they are painted fine
const D = 7

const INK = 'rgba(92, 70, 50, 0.62)'
const CREAM = [246, 240, 222]
const BAND = [244, 232, 140] // the yellow of her dress
const RIM = [214, 196, 168] // her glasses' pale gold wire

// a small seeded random, so the props are painted the same every time
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rgba = (c: number[], a = 1) => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`
const shade = (c: number[], k: number) => c.map((v) => v * k)

function canvas(w: number, h: number, d = D) {
  const cv = document.createElement('canvas')
  cv.width = Math.ceil(w * d)
  cv.height = Math.ceil(h * d)
  const ctx = cv.getContext('2d')!
  // scene px, origin in the middle of the box
  ctx.setTransform(d, 0, 0, d, (w * d) / 2, (h * d) / 2)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return { cv, ctx }
}

// a closed hand-drawn loop round an ellipse: the radius wanders a little, as a brush would
export function loop(rx: number, ry: number, wobble: number, rand: () => number, cx = 0, cy = 0, n = 48): Pt[] {
  const ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28]
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = 1 + wobble * (0.5 * Math.sin(a * 2 + ph[0]) + 0.3 * Math.sin(a * 3 + ph[1]) + 0.2 * Math.sin(a * 5 + ph[2]))
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as Pt
  })
}

// a smooth path through the points (quadratics between midpoints)
export function trace(ctx: CanvasRenderingContext2D, pts: Pt[], closed: boolean) {
  ctx.beginPath()
  if (closed) {
    const m = (i: number) => {
      const a = pts[(i + pts.length) % pts.length], b = pts[(i + 1) % pts.length]
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    }
    ctx.moveTo(...(m(-1) as Pt))
    for (let i = 0; i < pts.length; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], ...(m(i) as Pt))
    ctx.closePath()
  } else {
    ctx.moveTo(...pts[0])
    for (let i = 1; i < pts.length - 1; i++) {
      const b = pts[i + 1]
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + b[0]) / 2, (pts[i][1] + b[1]) / 2)
    }
    ctx.lineTo(...pts[pts.length - 1])
  }
}

// watercolour: a flat wash, lighter blooms inside it, and the pigment pooling darker at the edge
function wash(ctx: CanvasRenderingContext2D, pts: Pt[], col: number[], rand: () => number, pool = 0.8) {
  ctx.save()
  trace(ctx, pts, true)
  ctx.fillStyle = rgba(col, 0.96)
  ctx.fill()
  ctx.clip()
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const size = Math.max(x1 - x0, y1 - y0)
  for (let i = 0; i < 7; i++) {
    const x = x0 + rand() * (x1 - x0), y = y0 + rand() * (y1 - y0), r = size * (0.15 + rand() * 0.3)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const c = shade(col, rand() < 0.6 ? 1.04 : 0.95)
    g.addColorStop(0, rgba(c, 0.35))
    g.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // the edge: a few strokes of the darker pigment, clipped inside, widest and faintest first
  for (const [w, a] of [[2.4, 0.07], [1.3, 0.1], [0.6, 0.16]]) {
    trace(ctx, pts, true)
    ctx.strokeStyle = rgba(shade(col, 0.78), a * pool)
    ctx.lineWidth = w
    ctx.stroke()
  }
  ctx.restore()
}

// a pencil line: two light passes that never quite agree, a little heavier in the middle of each stroke
export function pencil(ctx: CanvasRenderingContext2D, pts: Pt[], closed: boolean, rand: () => number, width = 0.32, ink = INK) {
  ctx.save()
  ctx.strokeStyle = ink
  for (let pass = 0; pass < 2; pass++) {
    const j = 0.12 + pass * 0.06
    const jitter = pts.map(([x, y]) => [x + (rand() - 0.5) * j, y + (rand() - 0.5) * j] as Pt)
    ctx.lineWidth = width * (pass ? 0.7 : 1)
    ctx.globalAlpha = pass ? 0.55 : 0.9
    trace(ctx, jitter, closed)
    ctx.stroke()
  }
  ctx.restore()
}

// the paper's tooth, laid over everything painted so far (and only there)
export function grain(cv: HTMLCanvasElement, rand: () => number, amount = 0.08) {
  const ctx = cv.getContext('2d')!
  const img = ctx.getImageData(0, 0, cv.width, cv.height), px = img.data
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue
    const n = 1 + (rand() - 0.5) * amount
    px[i] *= n
    px[i + 1] *= n
    px[i + 2] *= n
  }
  ctx.putImageData(img, 0, 0)
}

// its shadow: the painted shape, flattened to a soft dark blot (blurred by shrinking it and scaling it back up)
function shadowOf(sprite: HTMLCanvasElement, soften: number) {
  const k = Math.max(1, Math.round(soften * D))
  const small = document.createElement('canvas')
  small.width = Math.ceil(sprite.width / k)
  small.height = Math.ceil(sprite.height / k)
  const sctx = small.getContext('2d')!
  sctx.imageSmoothingQuality = 'high'
  sctx.drawImage(sprite, 0, 0, small.width, small.height)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = '#000'
  sctx.fillRect(0, 0, small.width, small.height)
  const out = document.createElement('canvas')
  out.width = sprite.width
  out.height = sprite.height
  const octx = out.getContext('2d')!
  octx.imageSmoothingQuality = 'high'
  octx.drawImage(small, 0, 0, out.width, out.height)
  return out
}

// ---------- her bucket hat, seen from above: a deep crown with a flat top, a ribbon round it, and the soft brim ----------
function paintHat() {
  const rand = rng(11)
  const W = 50, H = 50
  const { cv, ctx } = canvas(W, H)
  const ring = (r: number, cx = 0, cy = 0, n = 56) => loop(r, r * 0.97, 0.015, rand, cx, cy, n)
  // the brim: soft, a little floppy, sloping down from the crown, so it darkens toward its edge and away from the light
  const brim = loop(22, 21, 0.06, rand, 0, 0, 64).map(([x, y], i) => {
    const k = 1 + 0.025 * Math.sin((i / 64) * Math.PI * 14)
    return [x * k, y * k] as Pt
  })
  wash(ctx, brim, shade(CREAM, 0.98), rand)
  ctx.save()
  trace(ctx, brim, true)
  ctx.clip()
  const g = ctx.createRadialGradient(-1.5, -2, 13, 1.5, 1.5, 24)
  g.addColorStop(0, 'rgba(255, 252, 240, 0.25)')
  g.addColorStop(0.6, 'rgba(130, 110, 70, 0.06)')
  g.addColorStop(1, 'rgba(120, 100, 60, 0.26)')
  ctx.fillStyle = g
  ctx.fillRect(-25, -25, 50, 50)
  // the crown's shadow on the brim, down and to the right
  ctx.fillStyle = 'rgba(110, 92, 58, 0.2)'
  trace(ctx, ring(15, 2.2, 2.6), true)
  ctx.fill()
  ctx.restore()
  // rows of stitching round the brim
  for (const r of [16.8, 18.6, 20.3]) {
    ctx.save()
    ctx.setLineDash([0.9, 0.7])
    pencil(ctx, ring(r, 0, 0, 72), true, rand, 0.15, 'rgba(150, 126, 88, 0.6)')
    ctx.restore()
  }
  pencil(ctx, brim, true, rand)
  // the ribbon round the foot of the crown
  const band = ring(15.2, -0.4, -0.5)
  wash(ctx, band, BAND, rand, 1)
  pencil(ctx, band, true, rand, 0.26)
  // the crown's sides, seen steeply from above: a ring, in shadow on the far side from the light
  const side = ring(13.6, -0.6, -0.8)
  wash(ctx, side, shade(CREAM, 0.95), rand, 0.9)
  ctx.save()
  trace(ctx, side, true)
  ctx.clip()
  const sg = ctx.createLinearGradient(-10, -10, 10, 10)
  sg.addColorStop(0, 'rgba(255, 253, 244, 0.35)')
  sg.addColorStop(1, 'rgba(120, 100, 64, 0.22)')
  ctx.fillStyle = sg
  ctx.fillRect(-15, -15, 30, 30)
  ctx.restore()
  for (const r of [12.2, 10.9]) {
    ctx.save()
    ctx.setLineDash([0.8, 0.65])
    pencil(ctx, ring(r, -0.8, -1.1), true, rand, 0.14, 'rgba(150, 126, 88, 0.55)')
    ctx.restore()
  }
  pencil(ctx, side, true, rand, 0.28)
  // the flat top, catching the light, with a ring of stitching round it
  const top = ring(9.4, -1.2, -1.6)
  wash(ctx, top, shade(CREAM, 1.01), rand, 0.6)
  ctx.save()
  trace(ctx, top, true)
  ctx.clip()
  const lit = ctx.createRadialGradient(-4, -5, 0.5, -1.2, -1.6, 10)
  lit.addColorStop(0, 'rgba(255, 254, 248, 0.8)')
  lit.addColorStop(1, 'rgba(255, 254, 248, 0)')
  ctx.fillStyle = lit
  ctx.fillRect(-12, -12, 24, 24)
  ctx.restore()
  ctx.save()
  ctx.setLineDash([0.8, 0.65])
  pencil(ctx, ring(7.9, -1.2, -1.6), true, rand, 0.14, 'rgba(150, 126, 88, 0.55)')
  ctx.restore()
  pencil(ctx, top, true, rand, 0.3)
  // a little bow where the ribbon ties, its tails lying on the brim
  ctx.save()
  ctx.translate(10.4, 10.2)
  ctx.rotate(0.8)
  for (const s of [-1, 1]) {
    pencil(ctx, [[s * 0.3, 0.5], [s * 1.0, 2.6], [s * 1.9, 4.8], [s * 2.2, 5.6]], false, rand, 0.7, rgba(shade(BAND, 0.9), 0.95))
    const wing: Pt[] = [[0, 0], [s * 2.4, -1.9], [s * 3.7, -0.6], [s * 3.4, 1.2], [s * 1.6, 0.9]]
    wash(ctx, wing, BAND, rand, 1)
    pencil(ctx, wing, true, rand, 0.2)
  }
  ctx.fillStyle = rgba(shade(BAND, 0.92))
  ctx.beginPath()
  ctx.ellipse(0, 0.2, 0.8, 0.9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  grain(cv, rand)
  return { w: W, h: H, sprite: cv, shadow: shadowOf(cv, 1.6), lift: 2.6 }
}

// ---------- a soft washed black cotton cap, sitting on the grass the right way up, seen from above ----------
// A slim, low cricket cap, seen from overhead and a little in front, so its two big front panels face us, split
// by the centre seam, with the button near the top of the crown and the side seams running off to either side; the
// back is out of sight. The crown is shallow and close-fitting, softened by a couple of creases, with a row of
// stitching round its foot; the peak juts out in front (towards +y), curving down at its sides, a band of stitching across it.
// Seams are raised ridges, the centre one stitched twice down either side. The cotton is stone washed: mottled,
// flecked with paler fibres and worn palest where it stands proud. The Crescentic logo is cross-stitched in orange on
// the front panels.
const BLACK = [46, 46, 50]
const ORANGE = [222, 138, 34]
function paintCap() {
  const rand = rng(41)
  const W = 46, H = 48
  // painted twice as fine as the other props, so each cross stitch of the logo stays an X
  const { cv, ctx } = canvas(W, H, D * 2)
  // the crown's outline and the button, near its top as we look down on its front
  const C = { x: 0, y: -3, rx: 15, ry: 11.5 }
  const button: Pt = [0, -10.4]
  // a point on the crown's foot, `th` round from the front (radians, positive towards +x), pulled in by `inset`
  const rim = (th: number, inset = 0): Pt => [C.x + Math.sin(th) * (C.rx - inset), C.y + Math.cos(th) * (C.ry - inset)]
  const crown = Array.from({ length: 64 }, (_, i) => rim((i / 64) * Math.PI * 2))
  // the brim's edge, a rounded D in front of the crown; `inset` walks in from the edge for the stitching
  const brimEdge = (inset: number) =>
    Array.from({ length: 41 }, (_, i) => {
      const t = (Math.PI * i) / 40, c = Math.cos(t)
      return [Math.sign(c) * Math.abs(c) ** 0.8 * (13.6 - inset), 3.4 + Math.sin(t) * (15.8 - inset)] as Pt
    })
  const brim: Pt[] = [...brimEdge(0), [-12.6, 0.5], [12.6, 0.5]]
  // stone washing, inside the outline: soft paler and darker clouds, a mist of short pale fibres, the twill's
  // diagonal ribs, and the light from the top left
  const washed = (pts: Pt[], light: [number, number]) => {
    ctx.save()
    trace(ctx, pts, true)
    ctx.clip()
    for (let i = 0; i < 44; i++) {
      const x = -20 + rand() * 40, y = -20 + rand() * 40, r = 1.5 + rand() * 5
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      const pale = rand() < 0.6
      g.addColorStop(0, pale ? `rgba(205, 205, 210, ${0.05 + rand() * 0.08})` : 'rgba(0, 0, 0, 0.14)')
      g.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    for (let i = 0; i < 800; i++) {
      const x = -20 + rand() * 40, y = -20 + rand() * 40, len = 0.25 + rand() * 1.1, a = rand() * Math.PI
      ctx.strokeStyle = `rgba(215, 215, 220, ${0.02 + rand() * 0.05})`
      ctx.lineWidth = 0.06 + rand() * 0.12
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
      ctx.stroke()
    }
    ctx.strokeStyle = 'rgba(220, 220, 225, 0.045)'
    ctx.lineWidth = 0.12
    for (let d = -50; d < 50; d += 0.45) {
      ctx.beginPath()
      ctx.moveTo(d, -24)
      ctx.lineTo(d + 24, 24)
      ctx.stroke()
    }
    const lit = ctx.createRadialGradient(light[0], light[1], 1, light[0] + 5, light[1] + 6, 24)
    lit.addColorStop(0, 'rgba(255, 255, 255, 0.13)')
    lit.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)')
    lit.addColorStop(1, 'rgba(0, 0, 0, 0.28)')
    ctx.fillStyle = lit
    ctx.fillRect(-23, -24, 46, 48)
    ctx.restore()
  }
  // a pale, worn ridge along a line: a broad faint stroke with a narrower brighter one on it
  const worn = (pts: Pt[], w: number) => {
    pencil(ctx, pts, false, rand, w, 'rgba(205, 205, 212, 0.07)')
    pencil(ctx, pts, false, rand, w * 0.4, 'rgba(215, 215, 220, 0.1)')
  }
  const stitches = (pts: Pt[], a = 0.4) => {
    ctx.save()
    ctx.setLineDash([0.55, 0.36])
    pencil(ctx, pts, false, rand, 0.1, `rgba(0, 0, 0, ${a + 0.1})`)
    ctx.translate(-0.06, -0.08)
    pencil(ctx, pts, false, rand, 0.07, `rgba(170, 170, 176, ${a})`)
    ctx.restore()
  }
  // ----- the brim -----
  wash(ctx, brim, shade(BLACK, 1.06), rand, 0.4)
  washed(brim, [-6, 10])
  ctx.save()
  trace(ctx, brim, true)
  ctx.clip()
  // flat on top in the middle, darkening as its sides curve down and away from the light
  const curve = ctx.createLinearGradient(-15, 0, 15, 0)
  curve.addColorStop(0, 'rgba(0, 0, 0, 0.3)')
  curve.addColorStop(0.2, 'rgba(0, 0, 0, 0.04)')
  curve.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)')
  curve.addColorStop(0.8, 'rgba(0, 0, 0, 0.07)')
  curve.addColorStop(1, 'rgba(0, 0, 0, 0.4)')
  ctx.fillStyle = curve
  ctx.fillRect(-16, 0, 32, 22)
  // the crown's shadow on it, down and to the right
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.07)'
    ctx.beginPath()
    ctx.ellipse(C.x + 0.6, C.y + 0.6 + i * 0.5, C.rx, C.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // the front edge, rubbed palest of all
  for (const [w, a] of [[3.2, 0.05], [1.8, 0.07], [0.8, 0.1]]) {
    ctx.strokeStyle = `rgba(215, 215, 220, ${a})`
    ctx.lineWidth = w
    trace(ctx, brimEdge(0), false)
    ctx.stroke()
  }
  ctx.restore()
  // rows of stitching following the edge
  for (let i = 0; i < 5; i++) stitches(brimEdge(2.6 + i * 0.62).slice(3, 38), 0.5)
  pencil(ctx, brim, true, rand, 0.22, 'rgba(10, 10, 12, 0.6)')
  // ----- the crown -----
  wash(ctx, crown, BLACK, rand, 0.4)
  washed(crown, [-7, -13])
  ctx.save()
  trace(ctx, crown, true)
  ctx.clip()
  // the dome: lit round the button, falling into shade towards its foot, most of all away from the light
  const dome = ctx.createRadialGradient(button[0] - 2.5, button[1] - 2.5, 1, button[0], button[1] + 1, 18)
  dome.addColorStop(0, 'rgba(225, 225, 230, 0.12)')
  dome.addColorStop(0.55, 'rgba(225, 225, 230, 0.02)')
  dome.addColorStop(1, 'rgba(0, 0, 0, 0.22)')
  ctx.fillStyle = dome
  ctx.fillRect(-18, -22, 36, 36)
  // soft creases where the unstructured crown slouches: shallow dark folds with a paler edge above
  for (const [x0, y0, x1, y1, bow] of [[-9.6, 3.2, -4.4, 7.6, 1.2], [10, 2.4, 5.4, 7.6, -1]]) {
    const fold: Pt[] = [[x0, y0], [(x0 + x1) / 2 + bow, (y0 + y1) / 2], [x1, y1]]
    for (const [w, a] of [[2.6, 0.03], [1.4, 0.04], [0.6, 0.05]]) pencil(ctx, fold, false, rand, w, `rgba(0, 0, 0, ${a})`)
    pencil(ctx, fold.map(([x, y]) => [x - 0.6, y - 0.7] as Pt), false, rand, 1.2, 'rgba(210, 210, 215, 0.035)')
  }
  // the seams from the button: the centre one down between the front panels to the brim (stitched twice down either
  // side), the front panels' edges curving out and down to the crown's foot, and the side seams running off to either
  // side; each a fine groove between pale-worn ridges
  const seams: [Pt[], number][] = [
    [[button, [0.3, -1], [0, C.y + C.ry - 0.3]], 2],
    [[button, [-8.8, -5], [-12.6, 3.2]], 1],
    [[button, [8.8, -5], [12.6, 3.2]], 1],
    [[button, [-8, -12.6], [-14.6, -5.6]], 1],
    [[button, [8, -12.6], [14.6, -5.6]], 1],
  ]
  for (const [seam, rows] of seams) {
    // offsets across the seam, square to its run from the button to its end
    const [ex, ey] = seam[2], len = Math.hypot(ex - button[0], ey - button[1])
    const nx = -(ey - button[1]) / len, ny = (ex - button[0]) / len
    const off = (o: number) => seam.map(([x, y]) => [x + nx * o, y + ny * o] as Pt)
    for (const s of [-1, 1]) worn(off(s * 0.6), 0.9)
    pencil(ctx, seam, false, rand, 0.32, 'rgba(0, 0, 0, 0.5)')
    for (const s of [-1, 1]) for (let r = 0; r < rows; r++) stitches(off(s * (0.55 + r * 0.45)))
  }
  // a stitched eyelet high on each front panel, and one on each side panel
  for (const [ex, ey, sq] of [[-5.6, -6.8, 0.85], [5.6, -6.8, 0.85], [-9.2, -8.8, 0.7], [9.2, -8.8, 0.7]]) {
    ctx.strokeStyle = 'rgba(150, 150, 156, 0.4)'
    ctx.lineWidth = 0.32
    ctx.beginPath()
    ctx.ellipse(ex, ey, 0.58, 0.58 * sq, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(6, 6, 8, 0.95)'
    ctx.beginPath()
    ctx.ellipse(ex, ey, 0.32, 0.32 * sq, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // the row of stitching round the front of the crown's foot, just above the brim
  stitches(Array.from({ length: 30 }, (_, i) => rim(-1.25 + (2.5 * i) / 29, 1.1)))
  ctx.restore()
  // the crease where the crown is sewn to the brim, and the crown's outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.lineWidth = 0.8
  trace(ctx, Array.from({ length: 30 }, (_, i) => rim(-1.1 + (2.2 * i) / 29, 0.3)), false)
  ctx.stroke()
  pencil(ctx, crown, true, rand, 0.22, 'rgba(10, 10, 12, 0.6)')
  // the button on top, covered in the same washed cloth
  const bb = ctx.createRadialGradient(button[0] - 0.4, button[1] - 0.4, 0.1, button[0], button[1], 1.4)
  bb.addColorStop(0, 'rgba(110, 110, 116, 1)')
  bb.addColorStop(1, 'rgba(30, 30, 33, 1)')
  ctx.fillStyle = bb
  ctx.beginPath()
  ctx.ellipse(button[0], button[1], 1.4, 1.1, 0, 0, Math.PI * 2)
  ctx.fill()
  // the logo, in the middle of the front panels, a little squashed as they lean back from us
  ctx.save()
  ctx.translate(0, -0.8)
  ctx.scale(1, 0.8)
  stitchSwirl(ctx, 4.4, rand)
  ctx.restore()
  grain(cv, rand, 0.08)
  return { w: W, h: H, sprite: cv, shadow: shadowOf(cv, 2.8), lift: 2.4 }
}

// the Crescentic logo (its SVG path, in a 451 x 443 box), worked in orange cross stitch, r across from its centre to its
// edge: a grid of little X's wherever the logo covers a square, each the under thread one way and the top thread over it
const LOGO = {
  w: 451,
  h: 443,
  d: 'M275.8 437.397C153.852 464.132 32.8404 389.114 5.53145 269.805C-21.8119 150.526 54.8798 32.1383 176.808 5.4072C221.987 -4.51268 266.997 -0.413575 307.192 14.6712C321.398 20.4148 335.008 27.4557 347.761 35.7793C305.15 12.7615 253.747 5.16121 202.999 18.3893C98.7223 45.6268 36.7741 150.372 64.5808 252.396C92.4073 354.426 199.503 415.03 303.776 387.808C395.329 363.916 454.246 280.237 448.394 191.108C454.423 230.367 449.607 269.245 435.971 304.547C408.993 369.486 351.024 420.918 275.8 437.397ZM218.743 73.4238C291.866 55.1031 366.34 98.2114 385.086 169.744C403.852 241.261 359.793 314.114 286.666 332.479C259.564 339.268 232.328 337.62 207.765 329.233C199.09 326.031 190.724 322.009 182.867 317.239C209.033 330.342 240.201 334.007 270.605 325.081C333.042 306.784 368.488 242.404 349.742 181.312C331.016 120.221 265.208 85.5524 202.797 103.873C147.943 119.961 113.964 171.552 119.13 225.25C114.792 201.668 116.926 178.11 124.508 156.525C139.587 116.831 173.609 84.7325 218.719 73.4141L218.743 73.4238ZM253.21 277.348C217.89 286.207 181.906 265.378 172.85 230.825C163.81 196.272 185.08 161.088 220.399 152.209C233.503 148.92 246.663 149.725 258.523 153.781C262.724 155.315 266.751 157.268 270.561 159.573C257.908 153.246 242.843 151.467 228.169 155.787C198.01 164.612 180.9 195.717 189.941 225.241C198.982 254.745 230.776 271.479 260.934 262.64C287.409 254.87 303.84 229.953 301.33 203.998C303.435 215.393 302.395 226.759 298.733 237.191C291.472 256.384 275.023 271.879 253.224 277.348L253.21 277.348Z',
}
function stitchSwirl(ctx: CanvasRenderingContext2D, r: number, rand: () => number) {
  const logo = new Path2D(LOGO.d)
  // a scratch context with no transform, to ask which squares the logo covers (in the SVG's own units)
  const probe = document.createElement('canvas').getContext('2d')!
  const k = (2 * r) / LOGO.w, cell = 15
  // a square is stitched if the logo covers at least half of the four points round its middle
  const covered = (u: number, v: number) =>
    [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].filter(([a, b]) => probe.isPointInPath(logo, u + a * cell, v + b * cell, 'evenodd')).length >= 2
  const h = cell * k * 0.46
  ctx.save()
  ctx.lineCap = 'round'
  for (let v = cell / 2; v < LOGO.h; v += cell) {
    for (let u = cell / 2; u < LOGO.w; u += cell) {
      if (!covered(u, v)) continue
      const x = (u - LOGO.w / 2) * k, y = (v - LOGO.h / 2) * k
      const tone = 0.96 + rand() * 0.12
      const j = () => (rand() - 0.5) * h * 0.2
      // the shadow the thread casts on the cotton, then the under stitch (/), then the top stitch (\) over it
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
      ctx.lineWidth = h * 0.8
      ctx.beginPath()
      ctx.moveTo(x - h + 0.04, y - h + 0.06)
      ctx.lineTo(x + h + 0.04, y + h + 0.06)
      ctx.moveTo(x - h + 0.04, y + h + 0.06)
      ctx.lineTo(x + h + 0.04, y - h + 0.06)
      ctx.stroke()
      ctx.lineWidth = h * 0.7
      ctx.strokeStyle = rgba(shade(ORANGE, tone * 0.86))
      ctx.beginPath()
      ctx.moveTo(x - h + j(), y + h + j())
      ctx.lineTo(x + h + j(), y - h + j())
      ctx.stroke()
      ctx.strokeStyle = rgba(shade(ORANGE, tone))
      ctx.beginPath()
      ctx.moveTo(x - h + j(), y - h + j())
      ctx.lineTo(x + h + j(), y + h + j())
      ctx.stroke()
      // the sheen along the top thread
      ctx.strokeStyle = 'rgba(255, 226, 160, 0.4)'
      ctx.lineWidth = h * 0.18
      ctx.beginPath()
      ctx.moveTo(x - h * 0.6 - h * 0.12, y - h * 0.6 + h * 0.12)
      ctx.lineTo(x + h * 0.4 - h * 0.12, y + h * 0.4 + h * 0.12)
      ctx.stroke()
    }
  }
  ctx.restore()
}

// ---------- her glasses, folded: two round wire rims, the bridge, and the temples folded across the lenses ----------
// (or open, as they slip off her face while she falls: the temples straight out to either side; or worn, seen from the
// front on her face: the temples run back from the hinges and over her ears, so only their first bit shows)
function paintGlasses(pose: 'folded' | 'open' | 'worn' = 'folded') {
  const rand = rng(5)
  const W = pose === 'open' ? 48 : 34, H = 20
  const { cv, ctx } = canvas(W, H)
  const R = 6.4, cx = 7.3
  // the lenses: almost nothing, a breath of sky in them and a streak of light
  for (const s of [-1, 1]) {
    ctx.save()
    trace(ctx, loop(R, R * 0.96, 0.01, rand, s * cx, 0), true)
    ctx.clip()
    ctx.fillStyle = 'rgba(232, 244, 240, 0.28)'
    ctx.fillRect(-W / 2, -H / 2, W, H)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.moveTo(s * cx - 3.6, -1.2)
    ctx.lineTo(s * cx - 0.6, -4.4)
    ctx.stroke()
    ctx.lineWidth = 0.45
    ctx.beginPath()
    ctx.moveTo(s * cx - 2.6, 1.0)
    ctx.lineTo(s * cx + 0.6, -2.4)
    ctx.stroke()
    ctx.restore()
  }
  // wire: a darker edge under a pale gold line, so it reads as round wire
  const wire = (pts: Pt[], closed: boolean, w = 0.62) => {
    pencil(ctx, pts, closed, rand, w + 0.28, 'rgba(110, 88, 62, 0.75)')
    pencil(ctx, pts, closed, rand, w, rgba(RIM, 0.95))
    ctx.save()
    ctx.translate(-0.12, -0.14)
    pencil(ctx, pts, closed, rand, w * 0.35, 'rgba(255, 250, 236, 0.85)')
    ctx.restore()
  }
  if (pose === 'open') {
    // the temples, out to either side (foreshortened, as if seen a little from behind), curling down at the ends
    for (const s of [-1, 1]) wire([[s * (cx + R), -1], [s * 17, -0.6], [s * 21, 0.4], [s * 22.6, 2.2], [s * 22.8, 3.4]], false, 0.5)
  } else if (pose === 'worn') {
    // her ears are just past the hinges and a little lower: the temples dip back to them
    for (const s of [-1, 1]) wire([[s * (cx + R), -1], [s * (cx + R + 0.6), 1], [s * (cx + R + 0.8), 3.4]], false, 0.45)
  } else {
    // the temples, folded in across the lenses (the far one first, partly under the near one)
    wire([[cx + R + 0.6, -0.8], [6, 0.6], [-2, 1.6], [-8.6, 2.3], [-10.8, 3.4]], false, 0.5)
    wire([[-cx - R - 0.6, -1.2], [-5, -0.2], [3, 0.6], [9.4, 1.4], [11.6, 2.6]], false, 0.5)
  }
  for (const s of [-1, 1]) wire(loop(R, R * 0.96, 0.01, rand, s * cx, 0, 40), true)
  // the bridge, arched, and the hinges
  wire([[-cx + R * 0.82, -2.6], [-0.8, -3.6], [0.8, -3.6], [cx - R * 0.82, -2.6]], false, 0.55)
  for (const s of [-1, 1]) {
    ctx.fillStyle = 'rgba(120, 98, 70, 0.85)'
    ctx.fillRect(s * (cx + R) - 0.7, -1.6, 1.4, 1.4)
    // nose pads
    ctx.fillStyle = 'rgba(250, 248, 240, 0.8)'
    ctx.beginPath()
    ctx.ellipse(s * 1.9, -0.6, 0.6, 1.1, s * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(120, 98, 70, 0.5)'
    ctx.lineWidth = 0.15
    ctx.stroke()
  }
  return { w: W, h: H, sprite: cv, shadow: shadowOf(cv, 0.5), lift: 1.4 }
}

// ---------- one cream ballet flat from above: the toe, the opening with its lining, and a little bow ----------
// (side 1 is a right shoe, -1 a left one)
function paintShoe(seed: number, side: number) {
  const rand = rng(seed)
  const W = 32, H = 16
  const { cv, ctx } = canvas(W, H)
  ctx.scale(1, side)
  // the sole's outline, heel at -x, toe at +x: broad across the ball, the big toe's side straighter
  const outline: Pt[] = []
  const n = 60
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const c = Math.cos(a), s = Math.sin(a)
    const rx = c > 0 ? 13.6 : 12.8
    const ry = (5.6 + 0.7 * Math.sin(Math.max(0, c) * 1.6 + 0.3 * c)) * (s < 0 ? 1.04 : 0.96)
    outline.push([c * rx, s * ry])
  }
  wash(ctx, outline, CREAM, rand)
  // the toe, rounded and catching the light
  ctx.save()
  trace(ctx, outline, true)
  ctx.clip()
  const hl = ctx.createRadialGradient(8.5, -1.6, 0.4, 8.5, -1.2, 6.5)
  hl.addColorStop(0, 'rgba(255, 255, 252, 0.85)')
  hl.addColorStop(1, 'rgba(255, 255, 252, 0)')
  ctx.fillStyle = hl
  ctx.fillRect(0, -7, 15, 14)
  const edge = ctx.createLinearGradient(0, -7, 0, 7)
  edge.addColorStop(0, 'rgba(255, 252, 242, 0.25)')
  edge.addColorStop(1, 'rgba(130, 110, 80, 0.16)')
  ctx.fillStyle = edge
  ctx.fillRect(-15, -7, 30, 14)
  ctx.restore()
  // the opening: a cream rim round it, the lining in shadow under the heel, and the insole
  const opening = loop(7.2, 3.9, 0.03, rand, -4.6, 0.1)
  wash(ctx, opening, [236, 222, 196], rand, 1.4)
  ctx.save()
  trace(ctx, opening, true)
  ctx.clip()
  const insole = loop(5.9, 2.7, 0.03, rand, -4.0, 0.5)
  trace(ctx, insole, true)
  ctx.fillStyle = 'rgba(214, 186, 150, 0.7)'
  ctx.fill()
  const g = ctx.createLinearGradient(-12, -4, 3, 3)
  g.addColorStop(0, 'rgba(110, 84, 54, 0.38)')
  g.addColorStop(0.55, 'rgba(110, 84, 54, 0.08)')
  g.addColorStop(1, 'rgba(110, 84, 54, 0)')
  ctx.fillStyle = g
  ctx.fillRect(-13, -5, 17, 10)
  ctx.restore()
  pencil(ctx, opening, true, rand, 0.3)
  pencil(ctx, outline, true, rand, 0.34)
  // the welt, a fine line just inside the edge
  pencil(ctx, outline.map(([x, y]) => [x * 0.92 - 0.2, y * 0.84] as Pt), true, rand, 0.13, 'rgba(150, 130, 100, 0.4)')
  // the bow at the front of the opening, across the foot
  ctx.save()
  ctx.translate(3.4, 0.1)
  for (const s of [-1, 1]) {
    const wing: Pt[] = [[0, 0], [-1.0, s * 2.9], [0.4, s * 3.7], [1.8, s * 2.9], [1.1, s * 0.5]]
    wash(ctx, wing, [252, 249, 240], rand, 1.2)
    pencil(ctx, wing, true, rand, 0.2)
    pencil(ctx, [[0.3, s * 0.9], [0.4, s * 2.6]], false, rand, 0.12, 'rgba(150, 130, 100, 0.5)')
  }
  ctx.fillStyle = rgba([240, 232, 212])
  ctx.beginPath()
  ctx.ellipse(0.3, 0, 0.9, 1.0, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.18
  ctx.stroke()
  ctx.restore()
  grain(cv, rand, 0.06)
  return { w: W, h: H, sprite: cv, shadow: shadowOf(cv, 1), lift: 1.8 }
}

/** Her glasses, open, for the fall: the sprite, its box (scene px), and the distance between the lens centres. */
export function paintFallingGlasses() {
  const { w, h, sprite } = paintGlasses('open')
  return { w, h, sprite, lensGap: 14.6 }
}

/** Her glasses, open, as they sit on her face (wear.ts puts them there): the sprite, its shadow and its box (scene px). */
export function paintWornGlasses() {
  const { w, h, sprite, shadow } = paintGlasses('worn')
  return { w, h, sprite, shadow }
}

/** Her ring, a thin gold band with a small stone, as it sits round her finger and then tumbles off it: the sprite and its box (px). */
export function paintFallingRing() {
  const W = 10, H = 15
  const { cv, ctx } = canvas(W, H)
  // the band, seen a little from the side: an open ellipse, darker underneath and paler along the top
  ctx.beginPath()
  ctx.ellipse(0, 0.6, 2.9, 5.6, 0, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(120, 90, 40, 0.9)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.strokeStyle = 'rgb(236, 198, 96)'
  ctx.lineWidth = 1.1
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(-0.1, 0.5, 2.7, 5.4, 0, Math.PI * 0.95, Math.PI * 1.55)
  ctx.strokeStyle = 'rgba(255, 245, 205, 0.95)'
  ctx.lineWidth = 0.45
  ctx.stroke()
  // the stone, on top, with a glint
  ctx.beginPath()
  ctx.moveTo(0, -7.3)
  ctx.lineTo(1.5, -5.7)
  ctx.lineTo(0, -4.3)
  ctx.lineTo(-1.5, -5.7)
  ctx.closePath()
  ctx.fillStyle = 'rgba(244, 252, 255, 0.95)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(150, 120, 60, 0.9)'
  ctx.lineWidth = 0.35
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-0.4, -6, 0.3, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  return { w: W, h: H, sprite: cv }
}

// ---------- her bag and phone: finished pictures, trimmed to what is drawn and given the same soft shadow ----------
export function paintPicture(img: CanvasImageSource & { width: number; height: number }, h: number, soften: number, lift: number) {
  // the picture's own margins are transparent: find the box the drawing really fills
  const src = document.createElement('canvas')
  src.width = img.width
  src.height = img.height
  const sctx = src.getContext('2d', { willReadFrequently: true })!
  sctx.drawImage(img, 0, 0)
  const px = sctx.getImageData(0, 0, src.width, src.height).data
  let x0 = src.width, y0 = src.height, x1 = 0, y1 = 0
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      if (px[(y * src.width + x) * 4 + 3] > 12) {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
        y0 = Math.min(y0, y)
        y1 = Math.max(y1, y)
      }
    }
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  const w = (h * cw) / ch
  const cv = document.createElement('canvas')
  cv.width = Math.min(cw, Math.ceil(w * D))
  cv.height = Math.min(ch, Math.ceil(h * D))
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, x0, y0, cw, ch, 0, 0, cv.width, cv.height)
  return { w, h, sprite: cv, shadow: shadowOf(cv, soften), lift }
}

export interface PropImages {
  bag: HTMLImageElement
}

// her phone, lying face down: the back of the same gold iPhone the gallery opens in (PhoneGallery.tsx's PhoneBack), drawn
// from the mockup SVG's own paths (its frame spans x 639..2439, y 120..3750) — the frosted back glass and camera plateau
// under her clear case with its black polka dots
const IPHONE = {
  body: 'M2139.82 120L937.844 120C781.196 120 654.207 246.989 654.207 403.637L654.207 3466.19C654.207 3622.84 781.196 3749.83 937.844 3749.83L2139.82 3749.83C2296.46 3749.83 2423.45 3622.84 2423.45 3466.19L2423.45 403.637C2423.45 246.989 2296.46 120 2139.82 120Z',
  groove: 'M2137.62 128.449L940.041 128.449C786.858 128.449 662.656 252.651 662.656 405.834L662.656 3463.91C662.656 3617.09 786.858 3741.29 940.041 3741.29L2137.62 3741.29C2290.8 3741.29 2415 3617.09 2415 3463.91L2415 405.834C2415 252.651 2290.8 128.449 2137.62 128.449ZM2406.55 3461.71C2406.55 3611.51 2285.14 3732.93 2135.34 3732.93L942.322 3732.93C792.519 3732.93 671.105 3611.51 671.105 3461.71L671.105 408.115C671.105 258.312 792.519 136.898 942.322 136.898L2135.42 136.898C2285.22 136.898 2406.64 258.312 2406.64 408.115L2406.64 3461.79L2406.55 3461.71Z',
  glass: 'M2132.72 147.713L945.027 147.713C800.978 147.713 684.203 264.488 684.203 408.537L684.203 3461.29C684.203 3605.34 800.978 3722.11 945.027 3722.11L2132.72 3722.11C2276.77 3722.11 2393.54 3605.34 2393.54 3461.29L2393.54 408.537C2393.54 264.488 2276.77 147.713 2132.72 147.713Z',
}
// the side buttons: [x, width, top, bottom] — power on the right; action and volume on the left (seen from the front)
const IPHONE_BUTTONS = [[2423.45, 15.5, 1047.37, 1484.87], [639, 15.2, 693.53, 835.81], [639, 15.2, 955.36, 1232.5], [639, 15.2, 1303.98, 1581.11]]
// the case and camera, as PhoneBack lays them out: the case's clear rim, the camera plateau and its lenses, the lanyard hole
const CASE_RIM = [698, 164, 2379, 3706, 242]
const CAM = { x: 730, y: 190, s: 700, r: 160 }
const LENSES = [[905, 400], [1258, 545], [905, 700]]
const LANYARD = [2310, 232]

function phoneBack() {
  const s = 0.25
  const cv = document.createElement('canvas')
  cv.width = Math.ceil(1800 * s)
  cv.height = Math.ceil(3630 * s)
  const ctx = cv.getContext('2d')!
  ctx.scale(s, s)
  ctx.translate(-639, -120)
  // seen from behind, the buttons are on the other sides: mirrored across the frame's middle (x 1539)
  for (const [x, w, y0, y1] of IPHONE_BUTTONS) {
    const g = ctx.createLinearGradient(0, y0, 0, y1)
    g.addColorStop(0, '#6D6750')
    g.addColorStop(0.03, '#CCC299')
    g.addColorStop(0.08, '#2E2D1F')
    g.addColorStop(0.15, '#B0AC9C')
    g.addColorStop(0.85, '#B0AC9C')
    g.addColorStop(0.94, '#2E2D1F')
    g.addColorStop(0.98, '#A39A75')
    g.addColorStop(1, '#64604F')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(3078 - x - w, y0, w, y1 - y0, 6)
    ctx.fill()
  }
  const body = new Path2D(IPHONE.body), glass = new Path2D(IPHONE.glass)
  ctx.fillStyle = '#E0D0AF'
  ctx.fill(body)
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fill(new Path2D(IPHONE.groove), 'evenodd')
  ctx.restore()
  // the frosted back glass
  const frost = ctx.createLinearGradient(684, 148, 2393, 3722)
  frost.addColorStop(0, '#dedad4')
  frost.addColorStop(0.5, '#d2cdc6')
  frost.addColorStop(1, '#c8c3bb')
  ctx.fillStyle = frost
  ctx.fill(glass)
  // the camera plateau, its three lenses in silver rings, the flash and the LiDAR dot
  const plateau = ctx.createLinearGradient(CAM.x, CAM.y, CAM.x + CAM.s, CAM.y + CAM.s)
  plateau.addColorStop(0, '#f1efeb')
  plateau.addColorStop(1, '#dcd8d1')
  ctx.fillStyle = plateau
  ctx.strokeStyle = '#c9c4bc'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.roundRect(CAM.x, CAM.y, CAM.s, CAM.s, CAM.r)
  ctx.fill()
  ctx.stroke()
  const disc = (x: number, y: number, r: number, fill: string | CanvasGradient) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const [x, y] of LENSES) {
    const ring = ctx.createLinearGradient(x - 132, y - 132, x + 132, y + 132)
    ring.addColorStop(0, '#fbfbfa')
    ring.addColorStop(0.45, '#bdbab4')
    ring.addColorStop(0.75, '#efedea')
    ring.addColorStop(1, '#a9a6a0')
    disc(x, y, 132, ring)
    disc(x, y, 104, '#0b0b0c')
    const lens = ctx.createRadialGradient(x - 18, y - 22, 0, x - 18, y - 22, 110)
    lens.addColorStop(0, '#5a72b8')
    lens.addColorStop(0.3, '#1c2a55')
    lens.addColorStop(0.7, '#070a14')
    lens.addColorStop(1, '#000')
    disc(x, y, 74, lens)
    disc(x - 24, y - 26, 13, 'rgba(255, 255, 255, 0.4)')
  }
  disc(1258, 300, 50, '#f6f2e8')
  disc(1258, 300, 32, '#f8e7b8')
  disc(1258, 790, 46, '#151515')
  // the clear case: a soft sheen over the glass, then its polka dots, in staggered rows clear of the camera
  const sheen = ctx.createLinearGradient(684, 148, 2393, 3722)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.45)')
  sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0.06)')
  sheen.addColorStop(0.65, 'rgba(255, 255, 255, 0)')
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0.18)')
  ctx.fillStyle = sheen
  ctx.fill(glass)
  const [rx0, ry0, rx1, ry1, rr] = CASE_RIM
  const rim = new Path2D()
  rim.roundRect(rx0, ry0, rx1 - rx0, ry1 - ry0, rr)
  ctx.save()
  ctx.clip(rim)
  for (let row = 0, y = 250; y < 3700; row++, y += 165) {
    for (let x = 770 + (row % 2) * 150; x < 2360; x += 300) {
      if (x < 1500 && y < 950) continue
      disc(x, y, 30, '#141414')
    }
  }
  ctx.restore()
  // the case's raised surround round the camera, and its thick clear rim catching the light
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.roundRect(CAM.x - 26, CAM.y - 26, CAM.s + 52, CAM.s + 52, CAM.r + 26)
  ctx.stroke()
  const band = new Path2D(IPHONE.body)
  band.addPath(rim)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.fill(band, 'evenodd')
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.lineWidth = 30
  ctx.stroke(body)
  ctx.strokeStyle = 'rgba(167, 161, 152, 0.45)'
  ctx.lineWidth = 5
  ctx.stroke(rim)
  disc(LANYARD[0], LANYARD[1], 17, '#bfbab2')
  return cv
}

// a picture turned over left to right
function mirror(cv: HTMLCanvasElement) {
  const out = document.createElement('canvas')
  out.width = cv.width
  out.height = cv.height
  const ctx = out.getContext('2d')!
  ctx.scale(-1, 1)
  ctx.drawImage(cv, -cv.width, 0)
  return out
}

// ---------- her phone's beaded strap, lying in a loose loop on the grass by the phone's bottom corner ----------
// It hangs from a little silver clasp under the phone's edge: a smiling sun and a rainbow cloud by the clasp, then a
// string of pearls, clear crystals and silver beads threaded with pink pixel hearts, a pink bow and a white cloud.
// Drawn in the phone's own frame (scene px from the phone's centre, before it is turned); CHARM_BOX is where its box sits.
const CHARM_BOX = { x: 14, y: 25, w: 30, h: 28 }

// a smooth closed path through the points (Catmull-Rom), sampled evenly enough to thread beads along
function strand(pts: Pt[], n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length], p1 = pts[i], p2 = pts[(i + 1) % pts.length], p3 = pts[(i + 2) % pts.length]
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  return out
}

// points every `gap` along the path, measured round it
function spaced(path: Pt[], gap: number): Pt[] {
  const out: Pt[] = []
  let d = 0
  for (let i = 0; i < path.length; i++) {
    const a = path[i], b = path[(i + 1) % path.length]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    for (; d < len; d += gap) out.push([a[0] + ((b[0] - a[0]) * d) / len, a[1] + ((b[1] - a[1]) * d) / len])
    d -= len
  }
  return out
}

function bead(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, kind: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
  if (kind === 0) {
    // a pearl
    g.addColorStop(0, '#fffefa')
    g.addColorStop(0.7, '#f1ece2')
    g.addColorStop(1, '#cfc6b6')
  } else if (kind === 1) {
    // a clear faceted crystal, catching the grass and a little rainbow
    g.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
    g.addColorStop(0.45, 'rgba(214, 236, 230, 0.75)')
    g.addColorStop(0.8, 'rgba(230, 214, 240, 0.7)')
    g.addColorStop(1, 'rgba(140, 160, 150, 0.8)')
  } else {
    // a little silver spacer
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.5, '#c9cbcf')
    g.addColorStop(1, '#7c7f86')
  }
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(110, 100, 90, 0.45)'
  ctx.lineWidth = 0.08
  ctx.stroke()
  if (kind === 1) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 0.07
    ctx.beginPath()
    ctx.moveTo(x - r * 0.6, y)
    ctx.lineTo(x, y - r * 0.6)
    ctx.lineTo(x + r * 0.6, y)
    ctx.lineTo(x, y + r * 0.6)
    ctx.closePath()
    ctx.stroke()
  }
}

// an alphabet bead: a little white acrylic cube, its letter printed in black, threaded so the letter stays upright
function letterBead(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, ch: string) {
  const g = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.6, '#f4f1ec')
  g.addColorStop(1, '#d9d3c9')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x - s / 2, y - s / 2, s, s, s * 0.22)
  ctx.fill()
  ctx.strokeStyle = 'rgba(110, 100, 90, 0.5)'
  ctx.lineWidth = 0.08
  ctx.stroke()
  ctx.fillStyle = '#1a1a1a'
  ctx.font = `800 ${s * 0.72}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(ch, x, y + s * 0.04)
}

// a chunky pink heart built of little squares, a paler heart set in it
const PIXEL_HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
const PIXEL_HEART_IN = ['.......', '.XX.XX.', '.XXXXX.', '..XXX..', '...X...', '.......']
function pixelHeart(ctx: CanvasRenderingContext2D, size: number) {
  const c = size / 7
  ctx.save()
  ctx.translate(-size / 2, -c * 3)
  ctx.shadowColor = 'rgba(150, 70, 100, 0.35)'
  ctx.shadowBlur = c * 0.6
  for (const [rows, col] of [[PIXEL_HEART, '#f6a9c4'], [PIXEL_HEART_IN, '#fbc8da']] as const) {
    ctx.fillStyle = col
    rows.forEach((row, j) => [...row].forEach((ch, i) => ch === 'X' && ctx.fillRect(i * c - 0.02, j * c - 0.02, c + 0.04, c + 0.04)))
    ctx.shadowColor = 'transparent'
  }
  // the moulded edge: a darker line along the bottom-right of the outer squares
  ctx.strokeStyle = 'rgba(205, 110, 150, 0.7)'
  ctx.lineWidth = 0.1
  PIXEL_HEART.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== 'X') return
      if (PIXEL_HEART[j + 1]?.[i] !== 'X') {
        ctx.beginPath()
        ctx.moveTo(i * c, (j + 1) * c)
        ctx.lineTo((i + 1) * c, (j + 1) * c)
        ctx.stroke()
      }
      if (row[i + 1] !== 'X') {
        ctx.beginPath()
        ctx.moveTo((i + 1) * c, j * c)
        ctx.lineTo((i + 1) * c, (j + 1) * c)
        ctx.stroke()
      }
    }),
  )
  ctx.restore()
}

function puff(ctx: CanvasRenderingContext2D, size: number, fill = '#fbfbf8') {
  const r = size / 4
  const blobs: [number, number, number][] = [[-r * 1.2, r * 0.3, r], [0, -r * 0.35, r * 1.25], [r * 1.2, r * 0.3, r], [0, r * 0.5, r]]
  ctx.save()
  ctx.shadowColor = 'rgba(80, 90, 100, 0.3)'
  ctx.shadowBlur = r * 0.5
  ctx.shadowOffsetY = r * 0.15
  ctx.fillStyle = fill
  ctx.beginPath()
  for (const [x, y, rr] of blobs) {
    ctx.moveTo(x + rr, y)
    ctx.arc(x, y, rr, 0, Math.PI * 2)
  }
  ctx.fill()
  ctx.restore()
  // soft grey under each puff
  ctx.strokeStyle = 'rgba(170, 175, 185, 0.6)'
  ctx.lineWidth = 0.1
  for (const [x, y, rr] of blobs.slice(0, 3)) {
    ctx.beginPath()
    ctx.arc(x, y, rr * 0.85, Math.PI * 0.2, Math.PI * 0.8)
    ctx.stroke()
  }
}

function sunCharm(ctx: CanvasRenderingContext2D, size: number) {
  const r = size * 0.32
  ctx.fillStyle = '#f7c531'
  ctx.beginPath()
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, rr = i % 2 ? r * 1.12 : r * 1.5
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.05)
  g.addColorStop(0, '#fff07a')
  g.addColorStop(1, '#f9cf2e')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(200, 140, 20, 0.6)'
  ctx.lineWidth = 0.1
  ctx.stroke()
  // closed happy eyes, a smile and pink cheeks
  ctx.strokeStyle = '#5a3b1a'
  ctx.lineWidth = 0.12
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(s * r * 0.36, -r * 0.08, r * 0.15, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
    ctx.fillStyle = 'rgba(245, 130, 120, 0.7)'
    ctx.beginPath()
    ctx.ellipse(s * r * 0.58, r * 0.2, r * 0.14, r * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(0, r * 0.12, r * 0.22, Math.PI * 0.15, Math.PI * 0.85)
  ctx.stroke()
}

function rainbowCharm(ctx: CanvasRenderingContext2D, size: number) {
  const bands = ['#f5658f', '#f7a54a', '#f8e15b', '#7fd38a', '#6fb7ef', '#a98ae6']
  const R = size * 0.42, bw = size * 0.055
  ctx.lineCap = 'butt'
  bands.forEach((c, i) => {
    ctx.strokeStyle = c
    ctx.lineWidth = bw * 1.05
    ctx.beginPath()
    ctx.arc(-size * 0.08, size * 0.05, R - i * bw, Math.PI, Math.PI * 1.85)
    ctx.stroke()
  })
  ctx.lineCap = 'round'
  ctx.save()
  ctx.translate(size * 0.14, size * 0.12)
  puff(ctx, size * 0.62)
  ctx.restore()
}

function bowCharm(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 2
  const pink = '#f7b3c9', edge = 'rgba(210, 120, 155, 0.75)'
  const parts: Pt[][] = [
    [[0, 0], [-s * 0.5, -s * 0.55], [-s * 0.95, -s * 0.45], [-s * 0.95, s * 0.2], [-s * 0.5, s * 0.25]],
    [[0, 0], [s * 0.5, -s * 0.55], [s * 0.95, -s * 0.45], [s * 0.95, s * 0.2], [s * 0.5, s * 0.25]],
    [[-s * 0.12, s * 0.1], [-s * 0.45, s * 0.85], [-s * 0.22, s * 0.95], [0, s * 0.2]],
    [[s * 0.12, s * 0.1], [s * 0.45, s * 0.85], [s * 0.22, s * 0.95], [0, s * 0.2]],
  ]
  for (const p of parts) {
    trace(ctx, p, true)
    ctx.fillStyle = pink
    ctx.fill()
    ctx.strokeStyle = edge
    ctx.lineWidth = 0.1
    ctx.stroke()
  }
  // the folds in each loop, and the knot
  ctx.strokeStyle = 'rgba(255, 235, 242, 0.9)'
  ctx.lineWidth = 0.12
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sx * s * 0.25, -s * 0.1)
    ctx.quadraticCurveTo(sx * s * 0.55, -s * 0.3, sx * s * 0.75, -s * 0.2)
    ctx.stroke()
  }
  ctx.fillStyle = '#f39dbb'
  ctx.beginPath()
  ctx.ellipse(0, 0, s * 0.22, s * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = edge
  ctx.stroke()
}

function paintPhoneCharm() {
  const rand = rng(23)
  const { w: W, h: H } = CHARM_BOX
  const { cv, ctx } = canvas(W, H)
  ctx.translate(-CHARM_BOX.x, -CHARM_BOX.y)
  // the clasp: a short silver chain from under the phone's edge to a split ring
  const clasp: Pt = [5.5, 19.6]
  ctx.strokeStyle = '#a9adb4'
  ctx.lineWidth = 0.22
  for (let i = 0; i < 5; i++) {
    const y = 14.6 + i * 0.95
    ctx.beginPath()
    ctx.ellipse(4.6 + i * 0.18, y, i % 2 ? 0.18 : 0.32, 0.45, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#c3c6cc'
  ctx.beginPath()
  ctx.arc(clasp[0], clasp[1], 0.75, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(90, 95, 105, 0.6)'
  ctx.lineWidth = 0.08
  ctx.stroke()
  // the strap: a loose loop of beads lying flat on the grass
  const path = strand(
    [clasp, [4.4, 24], [5.8, 29], [10.4, 33.1], [16.5, 34.4], [22, 32.4], [24.6, 27.4], [22.6, 22.4], [17, 20.1], [11, 19.4]],
    24,
  )
  ctx.strokeStyle = 'rgba(235, 235, 230, 0.8)'
  ctx.lineWidth = 0.12
  trace(ctx, path, true)
  ctx.stroke()
  // pearls mostly, a crystal every few, a silver spacer either side of it
  const beads = spaced(path, 0.95).slice(1)
  const pattern = [0, 0, 2, 1, 2, 0, 0, 0, 1]
  beads.forEach(([x, y], i) => {
    const kind = pattern[i % pattern.length]
    bead(ctx, x, y, kind === 2 ? 0.32 : kind === 1 ? 0.5 : 0.44, kind)
  })
  // the charms threaded on it, each lying at its own angle; the sun and rainbow cloud hang together from the clasp
  const at = (t: number) => path[Math.floor(t * path.length) % path.length]
  const charms: [Pt, number, number, (c: CanvasRenderingContext2D, s: number) => void][] = [
    [at(0.13), 4.2, 0.2, pixelHeart],
    [at(0.27), 3.8, -0.3, bowCharm],
    [at(0.43), 3.8, 0.1, (c, s) => puff(c, s)],
    [at(0.58), 4.8, -0.4, pixelHeart],
    [at(0.82), 3.6, 0.5, bowCharm],
    [[9, 22], 4.6, 0.15, rainbowCharm],
    [[3, 21.6], 4.4, -0.2, sunCharm],
  ]
  for (const [[x, y], size, rot, draw] of charms) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot + (rand() - 0.5) * 0.2)
    draw(ctx, size)
    ctx.restore()
  }
  grain(cv, rand, 0.04)
  return { w: W, h: H, sprite: cv, shadow: shadowOf(cv, 0.4), lift: 0.7 }
}

// the same strap hanging from the corner of her phone case (PhoneGallery's back view): the chain at the top, the sun and
// rainbow cloud by the clasp, and the beads falling in a long loop below. Its box is HANGING_CHARM.w by .h, the chain's
// top at HANGING_CHARM.top; painted `d` canvas px to each unit so it stays crisp at the size it is shown.
export const HANGING_CHARM = { w: 16, h: 36, top: [3, 0.5] as Pt }
export function paintHangingCharm(d = 20) {
  const rand = rng(23)
  const { w: W, h: H } = HANGING_CHARM
  const { cv, ctx } = canvas(W, H, d)
  ctx.translate(-W / 2, -H / 2)
  const clasp: Pt = [3, 5.4]
  ctx.strokeStyle = '#a9adb4'
  ctx.lineWidth = 0.22
  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.ellipse(3, 0.9 + i * 0.85, i % 2 ? 0.18 : 0.32, 0.45, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#c3c6cc'
  ctx.beginPath()
  ctx.arc(clasp[0], clasp[1], 0.75, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(90, 95, 105, 0.6)'
  ctx.lineWidth = 0.08
  ctx.stroke()
  const path = strand(
    [clasp, [2.5, 12], [3.1, 20], [4.8, 27], [8.2, 32.6], [11.6, 33.2], [13.2, 29], [12.8, 21], [10.6, 13.2], [6.6, 7.2]],
    24,
  )
  ctx.strokeStyle = 'rgba(235, 235, 230, 0.8)'
  ctx.lineWidth = 0.12
  trace(ctx, path, true)
  ctx.stroke()
  const beads = spaced(path, 0.95).slice(1)
  const pattern = [0, 0, 2, 1, 2, 0, 0, 0, 1]
  beads.forEach(([x, y], i) => {
    const kind = pattern[i % pattern.length]
    bead(ctx, x, y, kind === 2 ? 0.32 : kind === 1 ? 0.5 : 0.44, kind)
  })
  const at = (t: number) => path[Math.floor(t * path.length) % path.length]
  const charms: [Pt, number, number, (c: CanvasRenderingContext2D, s: number) => void][] = [
    [at(0.16), 4.2, 0.1, pixelHeart],
    [at(0.3), 3.8, -0.2, bowCharm],
    [at(0.45), 3.8, 0.1, (c, s) => puff(c, s)],
    [at(0.6), 4.8, -0.15, pixelHeart],
    [at(0.8), 3.6, 0.3, bowCharm],
    [[6.4, 8.4], 4.6, 0.15, rainbowCharm],
    [[2, 8], 4.4, -0.2, sunCharm],
  ]
  for (const [[x, y], size, rot, draw] of charms) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot + (rand() - 0.5) * 0.2)
    draw(ctx, size)
    ctx.restore()
  }
  grain(cv, rand, 0.04)
  return cv
}

// a second strap from the same lanyard hole: a short chain, then a drop of beads with her name in alphabet beads down
// the middle and a little pixel heart at the end. It hangs as a real one does, never quite straight: the thread kinks
// left into the strap's loop and back out, and each bead tips with it. Its box is NAME_CHARM.w by .h, the chain's top at .top.
export const NAME_CHARM = { w: 10, h: 23, top: [7, 0.3] as Pt }
export function paintNameCharm(name = 'MARIYAH', d = 20) {
  const rand = rng(31)
  const { w: W, h: H } = NAME_CHARM
  const { cv, ctx } = canvas(W, H, d)
  ctx.translate(-W / 2, -H / 2)
  ctx.strokeStyle = '#a9adb4'
  ctx.lineWidth = 0.22
  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.ellipse(7, 0.75 + i * 0.85, i % 2 ? 0.18 : 0.32, 0.45, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.lineWidth = 0.3
  ctx.strokeStyle = '#c3c6cc'
  ctx.beginPath()
  ctx.arc(7, 4.3, 0.6, 0, Math.PI * 2)
  ctx.stroke()
  // the thread: an open bend through these, walked by distance so the beads sit evenly along it
  const pts: Pt[] = [[7, 4.9], [6.7, 7.2], [5.4, 9.6], [3.4, 11.6], [2.4, 14.2], [2.9, 17], [4.4, 19.4], [4.6, 21.8], [3.6, 23.6]]
  const path = strand([pts[0], ...pts, pts[pts.length - 1]], 16).slice(16, 16 * pts.length + 1)
  const lens = [0]
  for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]))
  // where the thread is `s` along it, and which way it runs there
  const along = (s: number): [number, number, number] => {
    let i = 1
    while (i < path.length - 1 && lens[i] < s) i++
    const [ax, ay] = path[i - 1], [bx, by] = path[i]
    const k = Math.min(1, Math.max(0, (s - lens[i - 1]) / (lens[i] - lens[i - 1] || 1)))
    return [ax + (bx - ax) * k, ay + (by - ay) * k, Math.atan2(by - ay, bx - ax) - Math.PI / 2]
  }
  // pearl, spacer, crystal either side of the name
  const ends: [number, number, number][] = [[0.5, 0.44, 0], [1.25, 0.32, 2], [2.1, 0.5, 1]]
  for (const [s, r, kind] of ends) {
    const [x, y] = along(s)
    bead(ctx, x, y, r, kind)
  }
  for (let i = 0; i < name.length; i++) {
    const [x, y, a] = along(3.5 + i * 1.4)
    ctx.save()
    ctx.translate(x, y)
    // each cube turns with the thread, and a little on its own
    ctx.rotate(a + (rand() - 0.5) * 0.25)
    letterBead(ctx, 0, 0, 1.3, name[i])
    ctx.restore()
  }
  const after = 3.5 + (name.length - 1) * 1.4
  // the thread runs as far as the heart's jump ring and no further
  const tail = after + 4.4
  ctx.strokeStyle = 'rgba(235, 235, 230, 0.8)'
  ctx.lineWidth = 0.12
  ctx.globalCompositeOperation = 'destination-over'
  ctx.beginPath()
  path.forEach(([x, y], i) => lens[i] <= tail && (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
  for (const [s, r, kind] of ends) {
    const [x, y] = along(after + 3.5 - s)
    bead(ctx, x, y, r, kind)
  }
  const [hx, hy, ha] = along(tail)
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(ha * 0.6 + (rand() - 0.5) * 0.2)
  ctx.translate(0, 1.1)
  pixelHeart(ctx, 2.6)
  ctx.restore()
  grain(cv, rand, 0.04)
  return cv
}

// her tote, tipped over on its side: where it lies (scene px), how it is turned (radians) and its height. The bag reveal
// (bagItems.ts), the camera that closes in on it and its hotspot (DreamLanding) all read this one place.
export const BAG_PLACE = { x: 226, y: 515, rot: -1.2, h: 80 }

// her glasses, folded on the grass by her head, and her hat above it: where they lie (scene px) and how they are turned
// (radians). wear.ts lifts them from here onto her face, and DreamLanding puts their hotspots here.
export const GLASSES_PLACE = { x: 470, y: 352, rot: -0.5 }
export const HAT_PLACE = { x: 452, y: 280, rot: 0.3 }

// the black cap with the orange Crescentic swirl, dropped on the grass past her right hand, its brim towards her feet
export const CAP_PLACE = { x: 502, y: 536, rot: -0.5 }

// her phone, face down on the grass between the hat and glasses, a little to their right: where it lies (scene px), how it
// is turned (radians) and its height. It lies upside down, so the case's lanyard hole is by the strap at its bottom corner;
// its hotspot (DreamLanding) and the gallery that lifts it off the grass (PhoneGallery) read this too
export const PHONE_PLACE = { x: 496, y: 318, rot: 0.25 + Math.PI, h: 34 }

// where each lies, in scene px: her phone and its strap, and her tote tipped over on its side on her other side, by her left hip
export function paintProps(imgs: PropImages): Prop[] {
  const { x, y, rot, h } = PHONE_PLACE
  // the strap, turned over to lie by the lanyard hole, is placed in the phone's frame turned the right way up
  const c = Math.cos(rot - Math.PI), s = Math.sin(rot - Math.PI)
  const strap = paintPhoneCharm()
  return [
    { id: 'hat', ...HAT_PLACE, ...paintHat() },
    { id: 'glasses', ...GLASSES_PLACE, ...paintGlasses() },
    { id: 'cap', ...CAP_PLACE, ...paintCap() },
    // the strap first, so its clasp slips under the phone's edge
    { id: 'strap', x: x - CHARM_BOX.x * c - CHARM_BOX.y * s, y: y - CHARM_BOX.x * s + CHARM_BOX.y * c, rot: rot - Math.PI, ...strap, sprite: mirror(strap.sprite), shadow: mirror(strap.shadow) },
    { id: 'phone', x, y, rot, ...paintPicture(phoneBack(), h, 0.5, 1.2) },
    { id: 'bag', x: BAG_PLACE.x, y: BAG_PLACE.y, rot: BAG_PLACE.rot, ...paintPicture(imgs.bag, BAG_PLACE.h, 1, 2.8) },
  ]
}
