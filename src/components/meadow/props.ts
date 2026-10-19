// The things she has taken off and left on the grass beside her: her round glasses, folded, by her head; her bucket
// hat, cast off above it; and her cream ballet flats, kicked off by her feet. Each is painted once while the meadow
// loads, the way the rest of the picture was: a watercolour wash pooling darker at its edges, a wobbly pencil line
// over it, and the paper's grain; and each gets a soft shadow on the grass.

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
}

type Pt = [number, number]

// px per scene px; the camera closes in on her face with the glasses and hat in view, so they are painted fine
const D = 7

const INK = 'rgba(92, 70, 50, 0.62)'
const CREAM = [246, 240, 222]
const BAND = [244, 232, 140] // the yellow of her dress
const RIM = [214, 196, 168] // her glasses' pale gold wire

// a small seeded random, so the props are painted the same every time
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rgba = (c: number[], a = 1) => `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${a})`
const shade = (c: number[], k: number) => c.map((v) => v * k)

function canvas(w: number, h: number) {
  const cv = document.createElement('canvas')
  cv.width = Math.ceil(w * D)
  cv.height = Math.ceil(h * D)
  const ctx = cv.getContext('2d')!
  // scene px, origin in the middle of the box
  ctx.setTransform(D, 0, 0, D, (w * D) / 2, (h * D) / 2)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return { cv, ctx }
}

// a closed hand-drawn loop round an ellipse: the radius wanders a little, as a brush would
function loop(rx: number, ry: number, wobble: number, rand: () => number, cx = 0, cy = 0, n = 48): Pt[] {
  const ph = [rand() * 6.28, rand() * 6.28, rand() * 6.28]
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    const k = 1 + wobble * (0.5 * Math.sin(a * 2 + ph[0]) + 0.3 * Math.sin(a * 3 + ph[1]) + 0.2 * Math.sin(a * 5 + ph[2]))
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k] as Pt
  })
}

// a smooth path through the points (quadratics between midpoints)
function trace(ctx: CanvasRenderingContext2D, pts: Pt[], closed: boolean) {
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
function pencil(ctx: CanvasRenderingContext2D, pts: Pt[], closed: boolean, rand: () => number, width = 0.32, ink = INK) {
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
function grain(cv: HTMLCanvasElement, rand: () => number, amount = 0.08) {
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

// ---------- her glasses, folded: two round wire rims, the bridge, and the temples folded across the lenses ----------
function paintGlasses() {
  const rand = rng(5)
  const W = 34, H = 20
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
  // the temples, folded in across the lenses (the far one first, partly under the near one)
  wire([[cx + R + 0.6, -0.8], [6, 0.6], [-2, 1.6], [-8.6, 2.3], [-10.8, 3.4]], false, 0.5)
  wire([[-cx - R - 0.6, -1.2], [-5, -0.2], [3, 0.6], [9.4, 1.4], [11.6, 2.6]], false, 0.5)
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

export function paintProps(): Prop[] {
  return [
    { x: 452, y: 280, rot: 0.3, ...paintHat() },
    { x: 470, y: 352, rot: -0.5, ...paintGlasses() },
    { x: 280, y: 628, rot: 2.1, ...paintShoe(3, -1) },
    { x: 268, y: 656, rot: 1.8, ...paintShoe(8, 1) },
  ]
}
