// The About Me backdrop, which she also falls against on the way down: a very light watercolour pool seen from above, soft rings spreading
// out from a faint warm glow in the middle, with a few pale stars scattered over it. It is a square (circles stay circles whatever the
// viewport), painted once while the meadow loads and seeded, so it is the same every time. It is meant to stay quiet: every mark is faint.

import { blob, makeCanvas, mulberry } from './cloud'
import { ABOUT_BG } from './drop'

const SIZE = 1200
const BLUE = [196, 224, 248]
const BLUE_DEEP = [176, 211, 242]
const WHITE = [255, 255, 255]
const GLOW = [255, 248, 208]
const STAR = [255, 241, 176]

const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number, col: number[], a: number) {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const ang = spin + (i * Math.PI) / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r
    g[i ? 'lineTo' : 'moveTo'](x + Math.cos(ang) * rad, y + Math.sin(ang) * rad)
  }
  g.closePath()
  g.fillStyle = rgba(col, a)
  g.fill()
}

export function paintAboutBg(seed = 5) {
  const S = SIZE, C = S / 2
  const rand = mulberry(seed)
  const cv = makeCanvas(S, S)
  const g = cv.getContext('2d')!
  g.fillStyle = `rgb(${ABOUT_BG.join(',')})`
  g.fillRect(0, 0, S, S)

  // the washes: broad bands of pigment, alternately thicker and thinner with the distance from the middle
  const wash = makeCanvas(S, S)
  const wg = wash.getContext('2d')!
  wg.filter = 'blur(10px)'
  for (let r = S * 0.12, k = 0; r < S * 0.78; r += S * (0.05 + rand() * 0.03), k++) {
    wg.lineWidth = S * (0.018 + rand() * 0.03)
    wg.strokeStyle = rgba(k % 2 ? BLUE_DEEP : BLUE, 0.09 + rand() * 0.06)
    wg.beginPath()
    wg.ellipse(C + (rand() - 0.5) * 14, C + (rand() - 0.5) * 14, r, r * (0.97 + rand() * 0.05), rand() * Math.PI, 0, Math.PI * 2)
    wg.stroke()
  }
  wg.filter = 'none'
  g.drawImage(wash, 0, 0)

  // mottled blooms, so the water is not a flat tone
  const bloom = makeCanvas(S, S)
  const bg = bloom.getContext('2d')!
  bg.filter = 'blur(26px)'
  for (let i = 0; i < 70; i++) {
    const a = rand() * Math.PI * 2, d = 0.1 + Math.sqrt(rand()) * 0.62
    const r = S * (0.04 + rand() * 0.09)
    blob(bg, C + Math.cos(a) * d * S, C + Math.sin(a) * d * S, r, r * (0.6 + rand() * 0.4), rand() < 0.6 ? BLUE : WHITE, 0.05 + rand() * 0.06, rand, 0.3)
  }
  g.drawImage(bloom, 0, 0)

  // the warm glow in the middle, thinning out before it gets anywhere near the edge
  const gr = g.createRadialGradient(C, C, 0, C, C, S * 0.34)
  gr.addColorStop(0, rgba(GLOW, 0.55))
  gr.addColorStop(0.45, rgba(GLOW, 0.25))
  gr.addColorStop(1, rgba(GLOW, 0))
  g.fillStyle = gr
  g.fillRect(0, 0, S, S)

  // the ripples: short brushed arcs, white and pale blue, each breaking off and starting again along its ring
  g.lineCap = 'round'
  for (let r = S * 0.09, k = 0; r < S * 0.82; r += S * (0.03 + rand() * 0.025), k++) {
    const pieces = 2 + Math.floor(rand() * 3)
    let at = rand() * Math.PI * 2
    for (let i = 0; i < pieces; i++) {
      const len = 0.35 + rand() * 1.1
      g.lineWidth = S * (0.003 + rand() * 0.006)
      g.strokeStyle = rgba(k % 3 === 0 ? BLUE_DEEP : WHITE, k % 3 === 0 ? 0.16 : 0.34 + rand() * 0.16)
      g.beginPath()
      g.arc(C, C, r + (rand() - 0.5) * 5, at, at + len)
      g.stroke()
      at += len + 0.25 + rand() * 0.9
    }
  }

  // a few stars, small and pale, set out of the way of the middle
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2, d = 0.14 + Math.sqrt(rand()) * 0.5
    const x = C + Math.cos(a) * d * S, y = C + Math.sin(a) * d * S
    const r = S * (0.005 + rand() * 0.007)
    if (rand() < 0.65) star(g, x, y, r, rand() * 1.2, STAR, 0.4 + rand() * 0.25)
    else {
      g.fillStyle = rgba(WHITE, 0.6)
      g.beginPath()
      g.arc(x, y, r * 0.55, 0, Math.PI * 2)
      g.fill()
    }
  }
  return cv
}
