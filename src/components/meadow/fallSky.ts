// The sky she falls through, painted in watercolour (no photo): painted once while the meadow loads, in two sheets of the
// same size that the sky shader (fall.ts) tiles with mirrored repeats.
//  - `sky`   : the backdrop. A mottled blue wash laid in broad blotches and short slanting strokes, a few feathery wisps
//              brushed across it, and the clouds painted over the top.
//  - `clouds`: the same clouds alone, on transparency: the cloud layers that fly toward the camera.
// The clouds are painted puff by puff like the landing cloud (cloud.ts): a blue-grey belly, a paler body toward the light
// and a bright cap, bled together, with feathered dry-brushed edges. Everything is seeded, so it paints the same every time.

import { bleed, blob, makeCanvas, mulberry, paintPuffs, paper, stroke, type Puff } from './cloud'

const SIZE = { w: 1024, h: 1280 }

const SKY_TOP = [146, 200, 232]
const SKY_LOW = [172, 216, 240]
const SKY_DARK = [128, 186, 224]
const SKY_PALE = [192, 226, 243]
const WHITE = [252, 253, 252]

// light comes from above, a little from the left
const LIGHT: [number, number] = [-0.35, -0.94]

/** one cloud, `w` wide and `h` tall about (cx, cy): a flattish row of puffs along its base with taller domes heaped on top */
function cloudPuffs(cx: number, cy: number, w: number, h: number, rand: () => number): Puff[] {
  const puffs: Puff[] = []
  const base = Math.max(2, Math.round(w / (h * 0.8)))
  for (let i = 0; i < base; i++) {
    const t = base === 1 ? 0.5 : i / (base - 1)
    // the ends taper: smaller puffs, sitting a little higher
    const end = 1 - Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.5
    puffs.push({ x: cx + (t - 0.5) * w * 0.82 + (rand() - 0.5) * h * 0.15, y: cy + h * 0.14 - (1 - end) * h * 0.08, r: h * (0.4 + rand() * 0.1) * end, squash: 0.7 + rand() * 0.1 })
  }
  const domes = 1 + Math.floor(rand() * 1.6) + Math.floor(w / (h * 3))
  for (let i = 0; i < domes; i++) {
    const t = domes === 1 ? 0.45 + rand() * 0.2 : 0.2 + (i / (domes - 1)) * 0.6 + (rand() - 0.5) * 0.12
    puffs.push({ x: cx + (t - 0.5) * w * 0.8, y: cy - h * (0.08 + rand() * 0.14), r: h * (0.48 + rand() * 0.14), squash: 0.78 + rand() * 0.1 })
  }
  return puffs
}

/** a feathery wisp: a drift of thin pale strokes, all leaning the same way */
function wisp(ctx: CanvasRenderingContext2D, cx: number, cy: number, len: number, rand: () => number) {
  const ang = -0.25 + (rand() - 0.5) * 0.5
  const ca = Math.cos(ang), sa = Math.sin(ang)
  for (let i = 0; i < 40; i++) {
    const t = rand() - 0.5, s = (rand() - 0.5) * len * 0.22 * (1 - Math.abs(t) * 1.4)
    stroke(ctx, cx + ca * t * len - sa * s, cy + sa * t * len + ca * s, len * (0.12 + rand() * 0.16), len * 0.02, ang + (rand() - 0.5) * 0.5, WHITE, 0.08 + rand() * 0.14)
  }
}

export function paintFallSky(seed = 7) {
  const { w: W, h: H } = SIZE
  const rand = mulberry(seed)

  // ---- the clouds alone, on transparency ----
  const raw = makeCanvas(W, H)
  {
    const g = raw.getContext('2d')!
    // spread over the sheet on a jittered grid so they never clump, in a mix of sizes (it is tiled, so no edge is special)
    const cols = 2, rows = 4
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (rand() < 0.3) continue
      const cw = W * (0.34 + rand() * 0.3), ch = cw * (0.36 + rand() * 0.14)
      const cx = ((c + 0.5 + (rand() - 0.5) * 0.6 + (r % 2) * 0.35) / cols) * W
      const cy = ((r + 0.5 + (rand() - 0.5) * 0.4) / rows) * H
      paintPuffs(g, cloudPuffs(cx, cy, cw, ch, rand), LIGHT, 0.5, rand, 260)
    }
    // small stray puffs between them
    for (let i = 0; i < 3; i++) {
      const cw = W * (0.14 + rand() * 0.1)
      paintPuffs(g, cloudPuffs(rand() * W, rand() * H, cw, cw * 0.4, rand), LIGHT, 0.4, rand, 40)
    }
  }
  const clouds = bleed(raw, 9, 0.18)
  paper(clouds, rand, W * 0.02, 4)

  // ---- the backdrop: the blue wash, the wisps, then the clouds over it ----
  const sky = makeCanvas(W, H)
  {
    const g = sky.getContext('2d')!
    const gr = g.createLinearGradient(0, 0, 0, H)
    gr.addColorStop(0, `rgb(${SKY_TOP.join(',')})`)
    gr.addColorStop(1, `rgb(${SKY_LOW.join(',')})`)
    g.fillStyle = gr
    g.fillRect(0, 0, W, H)
    const wash = makeCanvas(W, H)
    const wg = wash.getContext('2d')!
    // broad blotches where the pigment settled thicker or thinner
    for (let i = 0; i < 160; i++) {
      const r = W * (0.06 + rand() * 0.16)
      blob(wg, rand() * W, rand() * H, r, r * (0.5 + rand() * 0.4), rand() < 0.5 ? SKY_DARK : SKY_PALE, 0.06 + rand() * 0.1, rand, 0.25)
    }
    // short slanting brush strokes through the wash
    for (let i = 0; i < 1400; i++) {
      const len = W * (0.03 + rand() * 0.06)
      stroke(wg, rand() * W, rand() * H, len, len * (0.12 + rand() * 0.1), -0.5 + (rand() - 0.5) * 0.8, rand() < 0.5 ? SKY_DARK : SKY_PALE, 0.05 + rand() * 0.09)
    }
    for (let i = 0; i < 9; i++) wisp(wg, rand() * W, rand() * H, W * (0.14 + rand() * 0.14), rand)
    g.drawImage(bleed(wash, 2.5, 0.35), 0, 0)
    g.drawImage(clouds, 0, 0)
  }
  paper(sky, rand, W * 0.02, 2.2)

  return { sky, clouds }
}
