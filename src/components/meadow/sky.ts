// The sky she falls through, painted once while the meadow loads: a pale blue with soft, fluffy white clouds; and the trail of
// white mist she leaves behind her, billowing down from above in a column that narrows as it reaches her,
// with fine glints of bubbles caught in its lower end.
// `water` covers the viewport behind everything; `trail` is laid over it, above her.

import { grain, rgba, rng } from './props'

const WATER = { w: 1000, h: 1600 }
const TRAIL = { w: 700, h: 1000 }

const TOP = [172, 210, 244]
const BLUE = [188, 220, 247]

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

// seeded value noise (smooth), summed over octaves
function noiser(rand: () => number) {
  const N = 256, lat = Float32Array.from({ length: N * N }, () => rand())
  const at = (x: number, y: number) => lat[((y & (N - 1)) * N) + (x & (N - 1))]
  const sm = (t: number) => t * t * (3 - 2 * t)
  const v = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = sm(x - xi), fy = sm(y - yi)
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1)
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
  }
  return (x: number, y: number, oct = 5) => {
    let s = 0, amp = 0.5, f = 1, tot = 0
    for (let i = 0; i < oct; i++) { s += v(x * f, y * f) * amp; tot += amp; amp *= 0.5; f *= 2.03 }
    return s / tot
  }
}
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

// cumulus: [x, y, size] with x and size in fractions of the width, y of the height; some run off the edges. Each is a
// heap of round puffs [x, y, radius] (in sizes)
const CLOUDS = [[0.72, 0.03, 0.17], [0.1, 0.2, 0.22], [0.74, 0.42, 0.2], [0.08, 0.63, 0.16], [0.78, 0.74, 0.2], [0.3, 0.98, 0.24]]
const PUFFS = [[-1.3, 0.25, 0.5], [-0.8, -0.1, 0.7], [-0.2, -0.35, 0.8], [0.45, -0.25, 0.75], [1.0, 0.0, 0.65], [1.5, 0.3, 0.45], [0.1, 0.2, 0.8], [0.8, 0.3, 0.6]]

// a soft, airy sky: pale blue with fluffy white cumulus whose edges are cottony and fade into the blue
function paintWater() {
  const rand = rng(61)
  const { w: W, h: H } = WATER
  const { cv, ctx } = canvas(W, H)
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, rgba(TOP))
  sky.addColorStop(0.5, rgba(BLUE))
  sky.addColorStop(1, rgba(TOP))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  const noise = noiser(rand)
  const w = 400, h = 640
  const layer = canvas(w, h)
  const img = layer.ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, vv = y / h
      // puffs heaped into clouds; fine noise bites the outline into a cauliflower fluff
      let m = 0
      const fluff = noise(u * 26, vv * 42, 4) - 0.5, bulge = noise(u * 7, vv * 11, 3) - 0.5
      for (const [cx, cy, s] of CLOUDS) {
        const sz = s * w, px = (u - cx) * w, py = (vv - cy) * h
        if (py > sz * 0.9) continue
        const base = 1 - smooth(0.45, 0.9, py / sz)
        for (const [ox, oy, r] of PUFFS) {
          const d = Math.hypot(px - ox * sz, py - oy * sz) / (r * sz)
          m = Math.max(m, (1 - d + fluff * 0.5 + bulge * 0.3) * base)
        }
      }
      // wide soft edge, brighter in the core, a cool blue-white toward the rim
      const body = smooth(-0.05, 0.55, m), core = smooth(0.15, 0.8, m)
      const k = (y * w + x) * 4
      img.data[k] = 226 + 29 * core
      img.data[k + 1] = 239 + 16 * core
      img.data[k + 2] = 252 + 3 * core
      img.data[k + 3] = 255 * body * (0.92 + 0.08 * fluff)
    }
  }
  layer.ctx.putImageData(img, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(layer.cv, 0, 0, W, H)
  grain(cv, rand, 0.015)
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

// the cloud she lands on: a big cottony cumulus with a flat-ish base and a heaped, puffy top. Its volume is shaded from a
// height field (lit from the upper left, bluish-grey in the hollows and underside) so it reads clearly against the sky
const LANDING = { w: 900, h: 460 }
function paintLandingCloud() {
  const rand = rng(83)
  const { w, h } = LANDING
  const noise = noiser(rand)
  const { cv, ctx } = canvas(w, h)
  const img = ctx.createImageData(w, h)
  const sz = w * 0.1, cy = 0.62
  // heaps of puffs [x (fraction of width), y (in sizes from the base line), radius (sizes)]
  const puffs = [
    [0.12, 0.3, 0.8], [0.22, -0.35, 1.0], [0.34, -0.9, 1.15], [0.48, -1.3, 1.3], [0.62, -0.95, 1.2],
    [0.74, -0.4, 1.0], [0.86, 0.15, 0.8], [0.3, 0.2, 1.0], [0.5, 0.1, 1.1], [0.7, 0.2, 1.0], [0.05, 0.6, 0.5], [0.95, 0.6, 0.5],
  ]
  const H = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, vv = y / h
      const fluff = noise(u * 30, vv * 20, 4) - 0.5, bulge = noise(u * 8, vv * 6, 3) - 0.5
      const py = (vv - cy) * h
      // flat-ish base: everything is cut off below the base line
      const base = 1 - smooth(0.35, 0.75, py / sz)
      let m = 0
      if (base > 0) for (const [ox, oy, r] of puffs) {
        const d = Math.hypot(x - ox * w, py - oy * sz) / (r * sz)
        // a dome profile (rounder than a cone) so each puff has body
        m = Math.max(m, (Math.sqrt(Math.max(0, 1 - d * d)) + fluff * 0.45 + bulge * 0.25 - 0.1) * base)
      }
      H[y * w + x] = m
    }
  }
  const at = (x: number, y: number) => H[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const m = H[y * w + x], vv = y / h
      const body = smooth(0.02, 0.22, m)
      // lit from the upper left: slopes that rise away from the light are bright, those facing away are in shade
      const lit = at(x + 5, y + 5) - at(x - 5, y - 5)
      const shade = Math.min(1, Math.max(0, 0.55 + lit * 1.6))
      const under = smooth(0.5, 1, vv) * 0.7 + (1 - smooth(0.1, 0.7, m)) * 0.3
      const k = (y * w + x) * 4
      const t = Math.min(1, Math.max(0, (1 - shade) * 0.75 + under * 0.6))
      img.data[k] = 255 - 78 * t
      img.data[k + 1] = 255 - 58 * t
      img.data[k + 2] = 255 - 22 * t
      img.data[k + 3] = 255 * body
    }
  }
  ctx.putImageData(img, 0, 0)
  grain(cv, rand, 0.012)
  return cv
}

export function paintSky() {
  return { water: paintWater(), trail: paintTrail(), cloud: paintLandingCloud() }
}
