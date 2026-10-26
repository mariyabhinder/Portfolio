// A cloud, painted entirely in code (no image): the surface she lands on, seen from above.
//
// It is rendered, not drawn: a heap of soft domes is summed into one height field (a smooth union, so the lobes melt into
// each other instead of overlapping like bubbles), roughened with fine noise, pressed in where she will lie, and then lit
// pixel by pixel from its slope: sky-white where the surface faces the light, pale blue where it turns away, and a cool
// ambient shade in the creases between lobes (a blur of the height field gives the occlusion). The silhouette's alpha comes
// from the same height, so the edge is soft and feathery rather than outlined.
//  - `body`  : the whole cloud, with a shallow dent where she lands.
//  - `front` : the body again, kept only in a lumpy lip round the dent. Drawn over her lower body it puts her *in* the cloud,
//              and nudged up it shows the cloud giving way.
//  - `hollow`: a soft blue bowl (with a pale rim of cloud pushed up) to deepen the dent when she presses into it.
//  - `wisps` : small feathery puffs, thrown off when she lands.
// Everything is seeded: the same options always paint the same cloud. Sizes are canvas px; the caller places and scales the
// sprites, so the cloud works at any viewport size.

export interface CloudOptions {
  /** size of the body sprite (px) */
  width: number
  height: number
  seed?: number
  /** where the landing zone is, as a fraction of the sprite (the dent, and the lip) */
  centre?: [number, number]
  /** how wide the landing zone is, as a fraction of the sprite width */
  zone?: number
  /** how deep the permanent dent is, as a fraction of the cloud's height field */
  dent?: number
  /** direction the light comes from (x right, y down), pointing toward the light */
  light?: [number, number]
  /** 0..1 amount of blue shade */
  shade?: number
  /** how far the heap spreads from the middle (1 = a cloud floating in the sky, ~1.75 = cloud to the edges of the sprite, for a view down onto a sea of cloud) */
  spread?: number
  /** how many wisps to paint */
  wisps?: number
}

export interface CloudSprites {
  body: HTMLCanvasElement
  front: HTMLCanvasElement
  hollow: HTMLCanvasElement
  wisps: HTMLCanvasElement[]
  /** the landing zone in body px: centre and the radii of the dent */
  zone: { x: number; y: number; rx: number; ry: number }
}

interface Dome { x: number; y: number; r: number; squash: number; h: number }

const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }

const makeCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = Math.round(w)
  c.height = Math.round(h)
  return c
}

// the cloud's colours (sRGB): lit sky-white, its soft mid-tone, the blue of the shaded side and the deep blue of the creases
const WHITE = [255, 252, 243]
const WARM = [255, 244, 224]
const MID = [234, 239, 248]
const SHADE = [168, 197, 236]
const DEEP = [130, 166, 218]
const mixc = (a: number[], b: number[], t: number, out: number[]) => {
  out[0] = a[0] + (b[0] - a[0]) * t
  out[1] = a[1] + (b[1] - a[1]) * t
  out[2] = a[2] + (b[2] - a[2]) * t
}

// (1 - d^2)^0.75: the profile of a dome, tabulated (the splat loop is the hot path)
const PROFILE = new Float32Array(1025)
for (let i = 0; i <= 1024; i++) PROFILE[i] = Math.pow(1 - i / 1024, 0.75)

/** sums domes into a height field with a smooth union (sixth root of the sum of sixth powers: lobes stay distinct, with a crease between them), noise-roughened */
function heightField(w: number, h: number, domes: Dome[], rand: () => number, rough: number) {
  const sq = new Float32Array(w * h)
  for (const d of domes) {
    const rx = d.r, ry = d.r * d.squash
    const x0 = Math.max(0, Math.floor(d.x - rx)), x1 = Math.min(w - 1, Math.ceil(d.x + rx))
    const y0 = Math.max(0, Math.floor(d.y - ry)), y1 = Math.min(h - 1, Math.ceil(d.y + ry))
    const ix = 1 / rx, iy = 1 / ry
    for (let y = y0; y <= y1; y++) {
      const dy = (y - d.y) * iy, dy2 = dy * dy
      let o = y * w + x0
      for (let x = x0; x <= x1; x++, o++) {
        const dx = (x - d.x) * ix
        const d2 = dx * dx + dy2
        if (d2 >= 1) continue
        const c = PROFILE[(d2 * 1024) | 0] * d.h
        const c2 = c * c, c3 = c2 * c
        sq[o] += c3 * c3
      }
    }
  }
  const hf = new Float32Array(w * h)
  let max = 0
  for (let i = 0; i < hf.length; i++) { hf[i] = Math.pow(sq[i], 1 / 6); if (hf[i] > max) max = hf[i] }
  // fine roughness: two octaves of value noise, only where there is cloud, so the surface is cauliflower and not glass
  const lat = (n: number) => { const a = new Float32Array((n + 1) * (n + 1)); for (let i = 0; i < a.length; i++) a[i] = rand(); return a }
  const octave = (cell: number, amp: number) => {
    const nx = Math.ceil(w / cell) + 1, ny = Math.ceil(h / cell) + 1
    const l = new Float32Array((nx + 1) * (ny + 1))
    for (let i = 0; i < l.length; i++) l[i] = rand()
    for (let y = 0; y < h; y++) {
      const fy = y / cell, j = Math.floor(fy), ty = fy - j, sy = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (hf[i] <= 0) continue
        const fx = x / cell, k = Math.floor(fx), tx = fx - k, sx = tx * tx * (3 - 2 * tx)
        const a = l[j * (nx + 1) + k], b = l[j * (nx + 1) + k + 1], c = l[(j + 1) * (nx + 1) + k], e = l[(j + 1) * (nx + 1) + k + 1]
        const v = lerp(lerp(a, b, sx), lerp(c, e, sx), sy) - 0.5
        hf[i] += v * amp * Math.min(1, 0.4 + hf[i] / (max * 0.25))
      }
    }
  }
  if (rough > 0) {
    octave(w / 30, max * rough)
    octave(w / 12, max * rough * 0.6)
    octave(w / 5, max * rough * 0.45)
  }
  return { hf, max }
}

/** box blur of a height field (two passes each way), for the ambient occlusion */
function blur(src: Float32Array, w: number, h: number, r: number) {
  let a = src.slice(), b = new Float32Array(src.length)
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      let sum = 0
      for (let x = -r; x <= r; x++) sum += a[y * w + clamp(x, 0, w - 1)]
      for (let x = 0; x < w; x++) {
        b[y * w + x] = sum / (2 * r + 1)
        sum += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)]
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0
      for (let y = -r; y <= r; y++) sum += b[clamp(y, 0, h - 1) * w + x]
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / (2 * r + 1)
        sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]
      }
    }
  }
  return a
}

/** lights a height field: slope against the light, ambient occlusion from its blur, soft alpha from its height */
function lightField(hf: Float32Array, max: number, w: number, h: number, light: [number, number], shade: number, aoRadius: number, relief: number) {
  const hb = blur(hf, w, h, aoRadius)
  const out = new Uint8ClampedArray(w * h * 4)
  const L = [light[0] * 0.6, light[1] * 0.6, 0.42]
  const ln = Math.hypot(L[0], L[1], L[2])
  L[0] /= ln; L[1] /= ln; L[2] /= ln
  const col = [0, 0, 0], tmp = [0, 0, 0]
  const k = relief / max * w * 0.03
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const z = hf[i]
      const o = i * 4
      if (z <= 0) continue
      const gx = (hf[y * w + Math.min(w - 1, x + 1)] - hf[y * w + Math.max(0, x - 1)]) * k
      const gy = (hf[Math.min(h - 1, y + 1) * w + x] - hf[Math.max(0, y - 1) * w + x]) * k
      const inv = 1 / Math.hypot(gx, gy, 1)
      const lam = (-gx * L[0] - gy * L[1] + L[2]) * inv // 1 facing the light, lower as the surface turns away
      const t = z / max
      const cav = clamp((hb[i] - z) / max * 5.5, 0, 1)
      // sky-white where lit, mid-tone, then the blue of the shaded side
      const lit = smooth(0.5, 0.95, lam)
      mixc(SHADE, MID, smooth(0.1, 0.6, lam), col)
      mixc(col, WHITE, lit * 0.9, tmp)
      mixc(tmp, WARM, smooth(0.9, 1, lam) * 0.5, col)
      // the crests of tall lobes catch more light; the creases between them sit in the blue ambient
      mixc(col, WHITE, smooth(0.45, 1, t) * 0.28, tmp)
      mixc(tmp, DEEP, cav * 0.55 * shade + (1 - smooth(0, 0.35, t)) * 0.12 * shade, col)
      out[o] = col[0]; out[o + 1] = col[1]; out[o + 2] = col[2]
      out[o + 3] = smooth(0.0, 0.3, t) * 255
    }
  }
  return new ImageData(out, w, h)
}

/** smooth value noise in 0..1, three octaves from `cell` px down: the clumpy grain of a photographed cloud */
function fbm(w: number, h: number, cell: number, rand: () => number) {
  const out = new Float32Array(w * h)
  let amp = 0.5, total = 0
  for (let o = 0; o < 3; o++, amp *= 0.55) {
    const c = cell / (1 << o), nx = Math.ceil(w / c) + 2, ny = Math.ceil(h / c) + 2
    const l = Float32Array.from({ length: nx * ny }, rand)
    for (let y = 0; y < h; y++) {
      const fy = y / c, j = Math.floor(fy), ty = fy - j, sy = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < w; x++) {
        const fx = x / c, k = Math.floor(fx), tx = fx - k, sx = tx * tx * (3 - 2 * tx)
        out[y * w + x] += amp * lerp(lerp(l[j * nx + k], l[j * nx + k + 1], sx), lerp(l[(j + 1) * nx + k], l[(j + 1) * nx + k + 1], sx), sy)
      }
    }
    total += amp
  }
  for (let i = 0; i < out.length; i++) out[i] /= total
  return out
}

/** roughens a lit cloud like the photographed ones: the edge is eaten into ragged tufts and the surface gets a clumpy grain */
function rag(img: ImageData, rand: () => number, cell: number) {
  const { width: w, height: h, data } = img
  const n = fbm(w, h, cell, rand)
  for (let i = 0; i < n.length; i++) {
    const o = i * 4
    const a = data[o + 3] / 255
    if (a <= 0) continue
    const v = a + (n[i] - 0.5) * 1.1 * (1 - a)
    data[o + 3] = smooth(0.3, 0.62, v) * 255
    // clumps: darker blue in the hollows of the grain, a touch brighter on its crests
    const g = (n[i] - 0.5) * 0.16
    data[o] = clamp(data[o] * (1 + g * 0.6), 0, 255)
    data[o + 1] = clamp(data[o + 1] * (1 + g * 0.8), 0, 255)
    data[o + 2] = clamp(data[o + 2] * (1 + g * 0.3), 0, 255)
  }
}

export function paintCloud(opts: CloudOptions): CloudSprites {
  const { width: W, height: H } = opts
  const rand = mulberry(opts.seed ?? 11)
  const light: [number, number] = opts.light ?? [-0.55, -0.83]
  const shade = opts.shade ?? 0.9
  const [zcx, zcy] = opts.centre ?? [0.5, 0.5]
  const zr = W * (opts.zone ?? 0.2) * 0.5
  const zone = { x: W * zcx, y: H * zcy, rx: zr, ry: zr * 0.66 }
  const u = H / 1000

  // ---- the heap of domes: heavy core, big shoulders, a rim that breaks into small lobes ----
  const domes: Dome[] = []
  const add = (x: number, y: number, r: number, hgt: number, squash = 0.9) => domes.push({ x, y, r, h: hgt, squash })
  const spread = opts.spread ?? 1, area = spread * spread
  const cx = W / 2, cy = H * 0.5, ax = W * 0.345 * spread, ay = H * 0.3 * spread
  for (let i = 0; i < Math.round(44 * area); i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 0.8
    const r = (120 + rand() * 90) * u
    add(cx + Math.cos(a) * ax * d, cy + Math.sin(a) * ay * d, r, r * (0.5 + rand() * 0.2))
  }
  const rings = [
    { d: 0.9, n: Math.round(20 * spread), r: [100, 165], hh: 0.5 },
    { d: 1.0, n: Math.round(30 * spread), r: [64, 115], hh: 0.45 },
    { d: 1.06, n: Math.round(40 * spread), r: [38, 76], hh: 0.42 },
  ]
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const a = ((i + rand() * 0.8) / ring.n) * Math.PI * 2
      const wob = 1 + (rand() - 0.5) * 0.14 + 0.06 * Math.sin(a * 3 + 1) + 0.045 * Math.sin(a * 5 + 2)
      const r = (ring.r[0] + rand() * (ring.r[1] - ring.r[0])) * u
      add(cx + Math.cos(a) * ax * ring.d * wob, cy + Math.sin(a) * ay * ring.d * wob, r, r * (ring.hh + rand() * 0.2), 0.84 + rand() * 0.14)
    }
  }
  // the lip: lumps round the landing zone, a little proud of the surface around them
  const lip: Dome[] = []
  const lipN = 15
  for (let i = 0; i < lipN; i++) {
    const a = ((i + rand() * 0.6) / lipN) * Math.PI * 2
    const d = 1.3 + rand() * 0.35
    const r = (54 + rand() * 54) * u
    lip.push({ x: zone.x + Math.cos(a) * zone.rx * d, y: zone.y + Math.sin(a) * zone.ry * d, r, h: r * (0.62 + rand() * 0.25), squash: 0.88 })
  }

  const all = [...domes, ...lip]
  const { hf, max } = heightField(W, H, all, rand, 0.11)
  // fine lobes ride on top of the heap (added, not unioned, so they are never swallowed by the big domes): the cauliflower surface
  const fine: Dome[] = []
  for (let i = 0; i < Math.round(420 * area); i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 1.0
    const r = (26 + rand() * 54) * u
    fine.push({ x: cx + Math.cos(a) * ax * d, y: cy + Math.sin(a) * ay * d, r, h: r * (0.55 + rand() * 0.4), squash: 0.86 + rand() * 0.1 })
  }
  const fineField = heightField(W, H, fine, rand, 0.06)
  const ff = fineField.hf, fineScale = (0.17 * max) / fineField.max
  for (let i = 0; i < hf.length; i++) if (hf[i] > 0) hf[i] += ff[i] * fineScale * Math.min(1, hf[i] / (0.22 * max))
  // the dent: a shallow bowl pressed into the cloud where she will lie
  const dent = (opts.dent ?? 0.34) * max
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x
    if (hf[i] <= 0) continue
    const dx = (x - zone.x) / zone.rx, dy = (y - zone.y) / zone.ry
    hf[i] = Math.max(hf[i] * 0.4, hf[i] - dent * Math.exp(-(dx * dx + dy * dy) * 1.3))
  }
  const img = lightField(hf, max, W, H, light, shade, Math.round(W * 0.02), 1.9)
  rag(img, rand, W * 0.012)
  // painted softly, like the photographed clouds of the sky: a slight blur takes the CG crispness off every lobe and edge
  const raw = makeCanvas(W, H)
  raw.getContext('2d')!.putImageData(img, 0, 0)
  const body = makeCanvas(W, H)
  {
    const bg = body.getContext('2d')!
    if ('filter' in bg) bg.filter = `blur(${Math.max(0.8, W * 0.0009).toFixed(1)}px)`
    bg.drawImage(raw, 0, 0)
  }
  const soft = body.getContext('2d')!.getImageData(0, 0, W, H)

  // ---- front: the body kept only where the lip's lobes are, on the near side of the dent ----
  const front = makeCanvas(W, H)
  {
    const lf = heightField(W, H, lip, rand, 0)
    const fd = new Uint8ClampedArray(soft.data)
    for (let y = 0; y < H; y++) {
      const near = smooth(zone.y - zone.ry * 0.3, zone.y + zone.ry * 0.6, y)
      for (let x = 0; x < W; x++) {
        const i = y * W + x
        // only the lumps at her sides: nothing over her legs and shoes
        const side = smooth(0.55, 1.15, Math.abs(x - zone.x) / zone.rx)
        fd[i * 4 + 3] = fd[i * 4 + 3] * smooth(0.04, 0.36, lf.hf[i] / lf.max) * near * side
      }
    }
    front.getContext('2d')!.putImageData(new ImageData(fd, W, H), 0, 0)
  }

  // ---- hollow: the soft bowl she presses into it, with a pale rim of cloud pushed up around ----
  const hs = 512
  const hollow = makeCanvas(hs, hs * 0.66)
  {
    const h = hollow.getContext('2d')!
    const hx = hs / 2, hy = hollow.height / 2
    h.save()
    h.translate(hx, hy)
    h.scale(1, hollow.height / hs)
    h.translate(-hx, -hy)
    const rim = h.createRadialGradient(hx, hy, hs * 0.28, hx, hy, hs * 0.5)
    rim.addColorStop(0, 'rgba(255,255,255,0)')
    rim.addColorStop(0.55, 'rgba(255,255,255,0.6)')
    rim.addColorStop(1, 'rgba(255,255,255,0)')
    h.fillStyle = rim
    h.fillRect(0, 0, hs, hs)
    const bowl = h.createRadialGradient(hx - light[0] * hs * 0.05, hy - light[1] * hs * 0.07, hs * 0.02, hx, hy, hs * 0.34)
    bowl.addColorStop(0, `rgba(${SHADE.join(',')},0.55)`)
    bowl.addColorStop(0.6, `rgba(${DEEP.join(',')},0.34)`)
    bowl.addColorStop(1, `rgba(${DEEP.join(',')},0)`)
    h.fillStyle = bowl
    h.fillRect(0, 0, hs, hs)
    h.restore()
  }

  // ---- wisps: small feathery clusters, rendered with the same lighting ----
  const wisps: HTMLCanvasElement[] = []
  const ww = 220, wh = 154
  for (let n = 0; n < (opts.wisps ?? 8); n++) {
    const ds: Dome[] = []
    const cnt = 6 + Math.floor(rand() * 5)
    for (let i = 0; i < cnt; i++) {
      const a = rand() * Math.PI * 2, d = rand() * 0.3
      const r = ww * (0.1 + rand() * 0.12)
      ds.push({ x: ww / 2 + Math.cos(a) * ww * d, y: wh / 2 + Math.sin(a) * wh * d, r, h: r * 0.55, squash: 0.85 })
    }
    const hfw = heightField(ww, wh, ds, rand, 0.05)
    const raw = makeCanvas(ww, wh)
    raw.getContext('2d')!.putImageData(lightField(hfw.hf, hfw.max, ww, wh, light, shade * 0.6, 8, 0.8), 0, 0)
    // feathered, so a wisp is a breath of cloud and not a little cloud of its own
    const c = makeCanvas(ww, wh)
    const wg = c.getContext('2d')!
    if ('filter' in wg) wg.filter = 'blur(3.5px)'
    wg.drawImage(raw, 0, 0)
    wisps.push(c)
  }
  return { body, front, hollow, wisps, zone }
}
