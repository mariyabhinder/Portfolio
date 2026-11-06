// The window: once she sits at the edge of her cloud, the girl and cloud drift away toward the bottom-left corner while an arched
// window grows out of the middle of the sky, shut. When it has reached its full size and paused, its two shutters swing open
// around their outer hinges and stay open. Like the rest of the dream it has no clock: its scroll progress (0-1, state.window) is
// the only input, and the group's move, the window's growth and the shutters' swing are all pure functions of it (stop scrolling
// and it freezes, scroll up and it plays backwards: the shutters close first, then the window shrinks).
//
//   progress (WINDOW_CONFIG.phases)   0 ........ 0.5 ...... 0.62 ........ 0.9 ...... 1
//                                     A grow     B pause     C open        D stays open
//   the girl and cloud move over 0 - 0.6 (phases.move), so they carry on through the pause.
//
// The girl, her cloud, her shadow and the wisps are all drawn inside one camera transform in meadow.ts; the move is one more
// transform on that whole group, so she can never slide on the cloud. The window is built from SVG shapes below (no picture): the
// stationary frame and each shutter are rasterised once as three separate pictures, and meadow.ts turns each shutter about its own
// hinge, so only the shutters move: they swing outward, toward us, to lie beside the frame (shutterStrips), drawn in thin slices so the
// edge nearer to us is bigger, as in perspective.

export const WINDOW_CONFIG = {
  /** extra scroll length for the transition, in viewport heights: longer = slower */
  scrollVh: 900,
  /** the last share of the scroll belongs to her launch (land.ts launchAt) and starts once the window is fully open; the window's own stages fit in the rest */
  launchShare: 0.5,
  /** the stages, as [from, to] of the window's scroll progress (0-1). Growing must end before opening starts, so it is closed and still between */
  phases: {
    /** A: the closed window grows from small to full size */
    grow: [0, 0.5] as [number, number],
    /** the girl and cloud's move; it ends after the growth, so they keep drifting during the pause */
    move: [0, 0.6] as [number, number],
    /** C: the shutters swing open (B, the pause, is the gap between grow and open; D, staying open, is everything after) */
    open: [0.62, 0.9] as [number, number],
  },
  /** where the girl and cloud end up: how far the group moves from where she sits, as a fraction of the viewport width (left) and height (down) */
  move: { x: 0.2, y: 0.18 },
  /** the group's scale at the end (1 = the size she sits at): a little smaller, so it feels further off */
  endScale: 0.8,
  /** the window's height at the end, as a fraction of the viewport height*/
  endHeight: 0.92,
  /** the gap left between the window (with its shutters open, on the right) and the right and bottom edges of the viewport, as a fraction of the viewport width and height */
  margin: { right: 0.07, bottom: 0.04 },
  /** extra offsets on a tall (portrait) screen: the group moves further left (fraction of width) and down (of height) and ends this much smaller; the window is centred across the viewport and pinned near the top, this far (fraction of height) from the top, clear of the girl and cloud in the bottom-left (marginRight only eases its path there) */
  narrow: { moveX: 0.08, moveY: 0.08, shrink: 0.2, marginRight: 0.05, marginTop: 0.03 },
  /** the window's scale at the start, as a fraction of its final size (0.04 = a speck) */
  startScale: 0.04,
  /** the share of the scroll over which the window fades in as it starts to grow (it is already growing, so it never pops) */
  fadeIn: 0.06,
  /** how far each shutter swings (degrees) when fully open: past 90 it has swung outward, toward us, and lies beside the frame */
  openAngle: 100,
  /** how far away the viewer is, in the drawing's units: the nearer, the bigger the outer (free) edge of an open shutter looks */
  viewer: 1800,
  /** how far each hinge slides outward as the shutter opens, to the frame's outer edge, so the open shutter lies beside the frame */
  hingeSlide: 80,
}

/** how far (drawing units) an open shutter reaches beyond each side of the 600-wide drawing: the window is placed so it is not cut off */
export const SPREAD = 92

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
// a quintic ease-in-out: gentle start, no jerk or overshoot at the end
const ease = (x: number) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }
// a smooth ease-in-out for the shutters: they start slowly, as if heavy, gather speed and settle gently
const easeShutter = (x: number) => { const t = clamp(x, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
const span = (x: number, [a, b]: [number, number]) => clamp((x - a) / (b - a), 0, 1)

export interface WindowFrame {
  /** the girl-and-cloud group: translation (viewport px) and scale, about the middle of the viewport */
  dx: number
  dy: number
  scale: number
  /** the window: its centre (viewport px), height (px) and opacity */
  x: number
  y: number
  h: number
  alpha: number
  /** how far each shutter has swung about its hinge (radians, 0 = shut) */
  swing: number
}

/** All of it for progress w (0-1) and the viewport: one shared scroll progress drives every part, so they stay in step. Pure and stateless. */
/** the launch's own 0-1 progress at window progress w: 0 until the window has opened completely */
export const launchProgress = (w: number) => clamp((w - (1 - WINDOW_CONFIG.launchShare)) / WINDOW_CONFIG.launchShare, 0, 1)

export function windowAt(w: number, vw: number, vh: number): WindowFrame {
  const C = WINDOW_CONFIG
  w = clamp(w / (1 - C.launchShare), 0, 1)
  const g = ease(span(w, C.phases.grow)), m = ease(span(w, C.phases.move))
  // on a tall (portrait) screen the window is limited by the width instead, so its arch and shutters keep their proportions
  // (the open shutters stick out beyond the frame on both sides, and are counted in the width)
  const full = Math.min(C.endHeight * vh, ((1 - C.margin.right) * vw * 0.92) / ((600 + 2 * SPREAD) / 800))
  // on a tall screen the group sits further into the bottom-left corner and smaller, and the window moves right and up, clear of it
  const narrow = clamp((1 - vw / vh) / 0.5 + 0.5, 0, 1)
  const mr = C.margin.right - C.narrow.marginRight * narrow
  // (on a tall screen it is centred instead of sitting in a corner)
  const cornerX = vw * (1 - mr) - ((300 + SPREAD) * full) / 800
  const endX = cornerX + (vw / 2 - cornerX) * narrow
  const bottomY = vh * (1 - C.margin.bottom) - full / 2
  const topY = vh * C.narrow.marginTop + full / 2
  const endY = bottomY + (topY - bottomY) * narrow
  return {
    dx: -(C.move.x + C.narrow.moveX * narrow) * vw * m,
    dy: (C.move.y + C.narrow.moveY * narrow) * vh * m,
    scale: 1 + (C.endScale - C.narrow.shrink * narrow - 1) * m,
    x: vw / 2 + (endX - vw / 2) * g,
    y: vh / 2 + (endY - vh / 2) * g,
    h: full * (C.startScale + (1 - C.startScale) * g),
    alpha: ease(w / C.fadeIn),
    swing: easeShutter(span(w, C.phases.open)) * (C.openAngle * Math.PI) / 180,
  }
}

// ---------- the window itself ----------

/** One slice of the left shutter as it is seen when swung by `swing` radians, in the drawing's units: where it lies across (x0 to x1) and
 *  down (y0 to y1), and which part of the shut picture it shows (s0 to s1, 0 at the hinge, 1 at the free edge). The shutter turns about
 *  its vertical hinge and is seen in perspective from the middle of the drawing, so the free edge, swung toward us, is the bigger edge.
 *  The right shutter is the mirror image (x -> 600 - x). Pure and stateless. */
export interface Strip { x0: number; x1: number; y0: number; y1: number; s0: number; s1: number }
export function shutterStrips(swing: number, n: number): Strip[] {
  const C = WINDOW_CONFIG, B = SHUTTER_BOX
  const hinge = B.x - C.hingeSlide * ease(swing / ((C.openAngle * Math.PI) / 180))
  const cos = Math.cos(swing), sin = Math.sin(swing)
  const at = (s: number) => {
    const z = s * B.w * sin, k = C.viewer / (C.viewer - z)
    return { x: 300 + (hinge + s * B.w * cos - 300) * k, top: 400 + (B.y - 400) * k, bottom: 400 + (B.y + B.h - 400) * k }
  }
  return Array.from({ length: n }, (_, i) => {
    const s0 = i / n, s1 = (i + 1) / n, a = at(s0), b = at(s1), m = at((s0 + s1) / 2)
    return { x0: a.x, x1: b.x, y0: m.top, y1: m.bottom, s0, s1 }
  })
}

/** width / height of the drawing below */
export const WINDOW_ASPECT = 600 / 800

// The drawing is in a 600 x 800 box: a weathered red-sandstone wall with a cusped (scalloped) arched doorway, and two studded, panelled
// timber doors hung at its sides. Shut, each covers half of the opening; the wall is one picture, each door another (box below, in the
// wall's units, with its hinge on its outer edge). The picture sits behind the wall, so the wall's stone trims it to the arch.
export const SHUTTER_BOX = { x: 100, y: 108, w: 200, h: 612 }

// the cusped arch's outline: left half, from the foot up to the peak (lobes bulge outward and meet in inward cusps); mirrored for the right
const ARCH_LEFT = 'M100 720 V330 Q98 292 122 262 Q132 223 170 208 Q187 164 232 150 Q256 114 300 108'
const ARCH_RIGHT = 'Q344 114 368 150 Q413 164 430 208 Q468 223 478 262 Q502 292 500 330 V720'
const OPENING = `${ARCH_LEFT} ${ARCH_RIGHT} Z`

/** Where a picture of the given aspect (w / h) lies inside the doorway, in the drawing's units: as wide as the opening, centred on its
 *  straight-sided lower part, so all of it shows (the arch above and any space around it is dark interior). */
export function openingFit(aspect: number) {
  const x = 100, w = 400, y = 330, h = 390
  const fw = Math.min(w, h * aspect), fh = fw / aspect
  return { x: x + (w - fw) / 2, y: y + (h - fh) / 2, w: fw, h: fh }
}
/** the whole doorway's bounding box (drawing units): the dark interior behind the picture fills it */
export const OPENING_BOX = { x: 100, y: 108, w: 400, h: 612 }

const DEFS = `<defs>
<linearGradient id="stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#cf7352"/><stop offset=".5" stop-color="#c0603f"/><stop offset="1" stop-color="#ad5237"/></linearGradient>
<linearGradient id="stone2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98a68"/><stop offset="1" stop-color="#b9593c"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6d5953"/><stop offset=".5" stop-color="#7a645d"/><stop offset="1" stop-color="#5f4d48"/></linearGradient>
<linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a4742"/><stop offset="1" stop-color="#4b3b37"/></linearGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .05" numOctaves="4" seed="7" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .35  0 0 0 0 .12  0 0 0 0 .06  0 0 0 .9 -.28"/></filter>
</defs>`

// one door, flat and shut, in its own box (200 x 612) with the hinge on its left edge and the meeting edge on its right (the right door is this mirrored)
function door(): string {
  const { w, h } = SHUTTER_BOX
  const shape = 'M0 612 V222 Q-2 184 22 154 Q32 115 70 100 Q87 56 132 42 Q156 6 200 0 V612 Z'
  const rows = 9, pitch = h / rows
  let body = `<clipPath id="dc"><path d="${shape}"/></clipPath><g clip-path="url(#dc)">` +
    `<rect x="-4" y="0" width="${w + 4}" height="${h}" fill="url(#wood)"/>`
  // recessed panels: two columns by nine rows, between the stiles and rails
  for (let c = 0; c < 2; c++) for (let r = 0; r < rows; r++) {
    const x = c === 0 ? 14 : 106, pw = c === 0 ? 80 : 74, y = r * pitch + 8
    body += `<rect x="${x}" y="${y}" width="${pw}" height="${pitch - 16}" fill="url(#panel)" stroke="#3d2f2b" stroke-width="1.5"/>` +
      `<path d="M${x} ${y + pitch - 16} H${x + pw}" stroke="#7d6862" stroke-opacity=".5" stroke-width="1.4"/>`
  }
  // rails and stiles stand proud: lighter edge lines, and iron studs where they cross
  for (let r = 0; r <= rows; r++) body += `<path d="M0 ${r * pitch} H${w}" stroke="#86716a" stroke-opacity=".55" stroke-width="2"/>`
  for (const x of [11, 100, 191]) body += `<path d="M${x} 0 V${h}" stroke="#86716a" stroke-opacity=".45" stroke-width="2"/>`
  for (let r = 1; r < rows; r++) for (const x of [11, 100, 191]) body += `<circle cx="${x}" cy="${r * pitch}" r="2.6" fill="#b3a595" stroke="#2f2420" stroke-width=".8"/>`
  // the iron strap down the meeting edge, in short links
  body += `<rect x="${w - 11}" y="0" width="11" height="${h}" fill="#4a3f3a"/>`
  for (let y = 12; y < h; y += 17) body += `<path d="M${w - 11} ${y} H${w}" stroke="#2c2420" stroke-width="2"/>`
  body += '</g>' +
    `<path d="${shape}" fill="none" stroke="#33261f" stroke-width="4" stroke-linejoin="round"/>`
  return body
}

function svg(width: number, box: [number, number, number, number], body: string): string {
  const height = Math.round((width * box[3]) / box[2])
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${box.join(' ')}">${DEFS}${body}</svg>`
}

/** The stationary part: the sandstone wall with the cusped doorway cut out of it (the opening is clear), its steps and its weathering. */
export function frameSvg(width: number): string {
  const wall = `M0 0 H600 V800 H0 Z ${OPENING}`
  const frame =
    `<path fill-rule="evenodd" fill="url(#stone)" d="${wall}"/>` +
    // the wall is built of big blocks: a lintel band across the top, pilaster strips down both sides, and a recessed panel round the arch
    '<rect x="0" y="0" width="600" height="56" fill="url(#stone2)" opacity=".55"/>' +
    '<path d="M0 56 H600 M52 56 V720 M548 56 V720 M0 720 H600" stroke="#8f3f29" stroke-opacity=".7" stroke-width="3" fill="none"/>' +
    '<path d="M52 336 H100 M500 336 H548 M52 520 H100 M500 520 H548" stroke="#8f3f29" stroke-opacity=".55" stroke-width="2.5" fill="none"/>' +
    '<path d="M64 70 H536 V710 H64 Z" fill="none" stroke="#e2977a" stroke-opacity=".5" stroke-width="2"/>' +
    // weathering over the stone, not over the opening
    `<path fill-rule="evenodd" filter="url(#grain)" d="${wall}"/>` +
    // the reveal: a dark line and a lit line round the opening give the arch depth
    `<path d="${OPENING}" fill="none" stroke="#6e2c1c" stroke-width="9" stroke-linejoin="round"/>` +
    `<path d="${OPENING}" fill="none" stroke="#e8a88a" stroke-opacity=".6" stroke-width="2" stroke-linejoin="round" transform="translate(0 -5)"/>` +
    // two steps up to the door
    '<path d="M70 720 H530 V748 H70 Z" fill="#d9876a"/>' +
    '<path d="M40 748 H560 V776 H40 Z" fill="#cf7a5c" stroke="#8f3f29" stroke-width="2"/>' +
    '<path d="M0 776 H600 V800 H0 Z" fill="#c4694a" stroke="#8f3f29" stroke-width="2"/>' +
    '<path d="M70 720 H530 M40 748 H560" stroke="#f0b69c" stroke-opacity=".6" stroke-width="2"/>'
  return svg(width, [0, 0, 600, 800], frame)
}

/** One door, shut, in its own box (SHUTTER_BOX): hinge on the left edge for the left one, on the right edge for the right one. */
export function shutterSvg(width: number, side: 'left' | 'right'): string {
  const { w, h } = SHUTTER_BOX
  return svg(width, [0, 0, w, h], side === 'left' ? door() : `<g transform="translate(${w} 0) scale(-1 1)">${door()}</g>`)
}

const url = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`

/** The three pictures as data URLs, rasterised by the browser at these widths when loaded */
export function windowUrls(frameWidth = 1400, shutterWidth = 640) {
  return { frame: url(frameSvg(frameWidth)), left: url(shutterSvg(shutterWidth, 'left')), right: url(shutterSvg(shutterWidth, 'right')) }
}
