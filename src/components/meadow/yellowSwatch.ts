// The backdrop she jumps against: a soft yellow watercolour swatch, a warm pool of pigment in the middle that thins out to the About Me
// paper at the edges (so the jump hands over to that page without a seam). Painted once while the meadow loads; seeded, so it is the
// same every time.

import { bleed, blob, makeCanvas, mulberry, paper } from './cloud'
import { ABOUT_BG } from './drop'

const SIZE = { w: 736, h: 1308 }
const YELLOW = [253, 236, 160]
const YELLOW_DEEP = [250, 226, 134]
const YELLOW_PALE = [254, 244, 196]

export function paintYellowSwatch(seed = 21) {
  const { w: W, h: H } = SIZE
  const rand = mulberry(seed)
  const cv = makeCanvas(W, H)
  const g = cv.getContext('2d')!
  g.fillStyle = `rgb(${ABOUT_BG.join(',')})`
  g.fillRect(0, 0, W, H)

  // the pool: a radial wash, deepest a little below the middle, thinning to nothing at the edges
  const gr = g.createRadialGradient(W * 0.54, H * 0.5, 0, W * 0.54, H * 0.5, H * 0.55)
  gr.addColorStop(0, `rgba(${YELLOW_DEEP.join(',')},0.85)`)
  gr.addColorStop(0.35, `rgba(${YELLOW.join(',')},0.6)`)
  gr.addColorStop(0.7, `rgba(${YELLOW_PALE.join(',')},0.28)`)
  gr.addColorStop(1, `rgba(${YELLOW_PALE.join(',')},0)`)
  g.save()
  g.translate(W * 0.54, H * 0.5)
  g.scale(W / H * 1.35, 1)
  g.translate(-W * 0.54, -H * 0.5)
  g.fillStyle = gr
  g.fillRect(-W, 0, W * 3, H)
  g.restore()

  // blooms where the pigment settled thicker or thinner, kept inside the pool
  const wash = makeCanvas(W, H)
  const wg = wash.getContext('2d')!
  for (let i = 0; i < 90; i++) {
    const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * 0.5
    const x = W * 0.54 + Math.cos(a) * d * W * 0.9, y = H * 0.5 + Math.sin(a) * d * H * 0.75
    const r = W * (0.05 + rand() * 0.14)
    blob(wg, x, y, r, r * (0.6 + rand() * 0.4), rand() < 0.5 ? YELLOW_DEEP : YELLOW_PALE, (0.03 + rand() * 0.06) * (1 - d), rand, 0.3)
  }
  g.drawImage(bleed(wash, 2.5, 0.35), 0, 0)
  paper(cv, rand, W * 0.02, 2.2)
  return cv
}
