// The deep blue she falls through, painted once while the meadow loads: a saturated blue, lighter down the middle
// and darkening toward the edges and the bottom, worked in long, soft vertical brush strokes; and the trail of
// white mist she leaves behind her, billowing down from above in a column that narrows as it reaches her,
// with fine glints of bubbles caught in its lower end.
// `water` covers the viewport behind everything; `trail` is laid over it, above her.

import { grain, rgba, rng } from './props'

const WATER = { w: 1000, h: 1600 }
const TRAIL = { w: 700, h: 1000 }

const BLUE = [22, 96, 214]
const BLUES = [[40, 120, 232], [18, 86, 200], [58, 138, 238], [12, 70, 180], [30, 108, 224]]
const DEEP = [8, 46, 146]

function canvas(w: number, h: number) {
  const cv = document.createElement('canvas')
  cv.width = Math.ceil(w)
  cv.height = Math.ceil(h)
  const ctx = cv.getContext('2d')!
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  return { cv, ctx }
}

// a soft round dab: solid to `core` of its radius, fading out to nothing at its edge
function dab(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: number[], a: number, core = 0.7) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(col, a))
  g.addColorStop(core, rgba(col, a))
  g.addColorStop(1, rgba(col, 0))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

const pick = <T>(list: T[], rand: () => number) => list[Math.floor(rand() * list.length)]
// roughly normal, -1..1 mostly
const gauss = (rand: () => number) => (rand() + rand() + rand() - 1.5) / 1.5

function paintWater() {
  const rand = rng(61)
  const { w: W, h: H } = WATER
  const { cv, ctx } = canvas(W, H)
  ctx.fillStyle = rgba(BLUE)
  ctx.fillRect(0, 0, W, H)
  // lighter down the middle, where the light comes through
  const mid = ctx.createRadialGradient(W / 2, H * 0.38, 0, W / 2, H * 0.38, W * 0.75)
  mid.addColorStop(0, rgba([62, 140, 240], 0.85))
  mid.addColorStop(1, rgba([62, 140, 240], 0))
  ctx.fillStyle = mid
  ctx.fillRect(0, 0, W, H)
  // long soft strokes, mostly straight down, curving in a little toward the bottom like a bowl of light
  for (let i = 0; i < 1100; i++) {
    const x = rand() * W, y = rand() * H * 1.1 - H * 0.05, len = 140 + rand() * 520, wd = 20 + rand() * 60
    const side = (x - W / 2) / (W / 2), bend = -side * len * 0.18 * (y / H)
    ctx.strokeStyle = rgba(pick(BLUES, rand), 0.03 + rand() * 0.05)
    ctx.lineWidth = wd
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x + bend * 0.2, y + len * 0.5, x + bend, y + len)
    ctx.stroke()
  }
  // darker toward the edges and the bottom, in the same soft strokes
  const edge = ctx.createRadialGradient(W / 2, H * 0.42, W * 0.32, W / 2, H * 0.5, W * 0.95)
  edge.addColorStop(0, rgba(DEEP, 0))
  edge.addColorStop(1, rgba(DEEP, 0.85))
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, W, H)
  const low = ctx.createLinearGradient(0, H * 0.6, 0, H)
  low.addColorStop(0, rgba(DEEP, 0))
  low.addColorStop(1, rgba(DEEP, 0.45))
  ctx.fillStyle = low
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 260; i++) {
    const side = rand() < 0.5 ? rand() * 0.22 : 1 - rand() * 0.22, x = side * W, y = rand() * H, len = 200 + rand() * 500
    ctx.strokeStyle = rgba(DEEP, 0.05 + rand() * 0.07)
    ctx.lineWidth = 10 + rand() * 30
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(x, y + len * 0.5, x + (0.5 - side) * len * 0.25, y + len)
    ctx.stroke()
  }
  grain(cv, rand, 0.05)
  return cv
}

// the trail: soft white dabs heaped in a column, broad and thick at the top, thinning and narrowing toward its
// lower end (where she is), with fine glints of bubbles there
function paintTrail() {
  const rand = rng(72)
  const { w: W, h: H } = TRAIL
  const { cv, ctx } = canvas(W, H)
  // (fewer, stronger dabs than a wash would take: many faint ones pile up into visible bands)
  const spread = (s: number) => W * (0.3 - 0.18 * s)
  for (let i = 0; i < 650; i++) {
    const s = Math.pow(rand(), 1.15), y = s * H * 0.94
    const x = W / 2 + gauss(rand) * spread(s)
    const r = (95 - 60 * s) * (0.5 + rand() * 0.8)
    dab(ctx, x, y, r, [244, 248, 255], (0.07 + rand() * 0.11) * Math.pow(1 - s, 0.6), 0)
  }
  // billows: a few brighter heaps in the upper part
  for (let i = 0; i < 46; i++) {
    const s = rand() * 0.6
    dab(ctx, W / 2 + gauss(rand) * spread(s) * 0.8, s * H, 50 + rand() * 70, [255, 255, 255], 0.1 + rand() * 0.1, 0.1)
  }
  for (let i = 0; i < 160; i++) {
    const s = 0.55 + rand() * 0.45, x = W / 2 + gauss(rand) * spread(s), y = s * H
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + rand() * 0.5})`
    ctx.beginPath()
    ctx.arc(x, y, 0.8 + rand() * 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  return cv
}

export function paintSky() {
  return { water: paintWater(), trail: paintTrail() }
}
