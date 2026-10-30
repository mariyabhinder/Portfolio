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
  /** the window's scale at the start, as a fraction of its final size (0.04 = a speck) */
  startScale: 0.04,
  /** the share of the scroll over which the window fades in as it starts to grow (it is already growing, so it never pops) */
  fadeIn: 0.06,
  /** how far each shutter swings (degrees) when fully open: past 90 it has swung outward, toward us, and lies beside the frame */
  openAngle: 100,
  /** how far away the viewer is, in the drawing's units: the nearer, the bigger the outer (free) edge of an open shutter looks */
  viewer: 1800,
  /** how far each hinge slides outward as the shutter opens, to the frame's outer edge, so the open shutter lies beside the frame */
  hingeSlide: 24,
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
  // the window ends in the bottom-right corner, leaving the margins (counted from the open shutter): its centre there, from the middle of the viewport
  const endX = vw * (1 - C.margin.right) - ((300 + SPREAD) * full) / 800, endY = vh * (1 - C.margin.bottom) - full / 2
  return {
    dx: -C.move.x * vw * m,
    dy: C.move.y * vh * m,
    scale: 1 + (C.endScale - 1) * m,
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

// The drawing is in a 600 x 800 box: a broad round-headed frame, a fan transom over a rail, and two casement shutters hung on
// the frame's sides. Shut, each covers half of the opening; the frame is one picture, each shutter another (box below, in the
// frame's units, with its hinge on its outer edge).
export const SHUTTER_BOX = { x: 38, y: 314, w: 262, h: 416 }
const STROKE = '#c9bfa6'

const DEFS = `<defs>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdfbf6"/><stop offset=".55" stop-color="#f3eee1"/><stop offset="1" stop-color="#e6ddca"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef3f2" stop-opacity=".6"/><stop offset="1" stop-color="#d3dedd" stop-opacity=".3"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0b563"/><stop offset=".5" stop-color="#b88a3e"/><stop offset="1" stop-color="#8f6628"/></linearGradient>
</defs>`

// one shutter, flat and shut, in its own box (262 x 416) with the hinge on its left edge (the right one is this mirrored)
function shutter(): string {
  const { w, h } = SHUTTER_BOX, stile = 11, bar = 8
  const colW = (w - stile * 2 - bar) / 2, rowH = (h - stile * 2 - bar * 2) / 3
  const panes = [0, 1].map((c) => [0, 1, 2].map((r) => {
    const x = stile + c * (colW + bar), y = stile + r * (rowH + bar)
    return `<rect x="${x}" y="${y}" width="${colW}" height="${rowH}" rx="1.5" fill="url(#glass)" stroke="#d3cab4" stroke-width="1.4"/>` +
      `<rect x="${x + 3}" y="${y + 3}" width="${colW - 6}" height="${rowH - 6}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>`
  }).join('')).join('')
  return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="url(#wood)" stroke="${STROKE}" stroke-width="2" stroke-linejoin="round"/>` +
    `<rect x="6" y="6" width="${w - 12}" height="${h - 12}" fill="none" stroke="#ebe5d5" stroke-width="2"/>` +
    panes +
    // the handle on the free edge, and the hinges on the hinge edge
    `<path d="M${w - 16} 214 h-10 q-5 0 -5 5 v26" fill="none" stroke="url(#brass)" stroke-width="4" stroke-linecap="round"/><rect x="${w - 20}" y="200" width="6" height="24" rx="2" fill="url(#brass)"/>` +
    [30, 197, 364].map((y) => `<rect x="0" y="${y}" width="10" height="22" rx="2" fill="url(#brass)"/>`).join('')
}

function svg(width: number, box: [number, number, number, number], body: string): string {
  const height = Math.round((width * box[3]) / box[2])
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${box.join(' ')}">${DEFS}${body}</svg>`
}

/** The stationary part: the round-headed frame with its fan transom, the rail and the sill (the opening is clear, so the sky shows through). */
export function frameSvg(width: number): string {
  const frame =
    // the outer frame: a semicircular head and straight sides, with an evenodd opening
    `<path fill-rule="evenodd" fill="url(#wood)" stroke="${STROKE}" stroke-width="2" d="M14 744 V300 A286 286 0 0 1 586 300 V744 Z M38 730 V300 A262 262 0 0 1 562 300 V730 Z"/>` +
    '<path fill="none" stroke="#ebe5d5" stroke-width="3" d="M26 738 V300 A274 274 0 0 1 574 300 V738"/>' +
    // the transom: a fan sash set in the head, its glass cut by a centre bar and two slanting bars
    '<path fill="url(#wood)" stroke="#c9bfa6" stroke-width="2" d="M62 292 A238 238 0 0 1 538 292 Z"/>' +
    '<path fill="url(#glass)" stroke="#d3cab4" stroke-width="1.6" d="M78 282 A222 222 0 0 1 522 282 Z"/>' +
    '<path d="M300 60 V282 M300 282 L162 98 M300 282 L438 98" stroke="url(#wood)" stroke-width="9" fill="none"/>' +
    '<path d="M300 60 V282 M300 282 L162 98 M300 282 L438 98" stroke="#c9bfa6" stroke-width="1.2" fill="none"/>' +
    '<path fill="none" stroke="#ebe5d5" stroke-width="2" d="M70 288 A230 230 0 0 1 530 288"/>' +
    '<rect x="276" y="46" width="48" height="9" rx="4" fill="url(#wood)" stroke="#c9bfa6" stroke-width="1.2"/>' +
    // the rail between the transom and the shutters
    '<rect x="38" y="292" width="524" height="22" fill="url(#wood)" stroke="#c9bfa6" stroke-width="2"/>' +
    '<path d="M38 296 H562" stroke="#ebe5d5" stroke-width="2"/>' +
    // the sill: a broad board that sticks out past the frame, with a lip and a groove
    '<path d="M0 744 H600 V776 H0 Z" fill="url(#wood)" stroke="#c9bfa6" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M0 752 H600" stroke="#ebe5d5" stroke-width="2"/><path d="M0 768 H600" stroke="#d6ccb6" stroke-width="1.4"/>'
  return svg(width, [0, 0, 600, 800], frame)
}

/** One shutter, shut, in its own box (SHUTTER_BOX): hinge on the left edge for the left one, on the right edge for the right one. */
export function shutterSvg(width: number, side: 'left' | 'right'): string {
  const { w, h } = SHUTTER_BOX
  return svg(width, [0, 0, w, h], side === 'left' ? shutter() : `<g transform="translate(${w} 0) scale(-1 1)">${shutter()}</g>`)
}

const url = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`

/** The three pictures as data URLs, rasterised by the browser at these widths when loaded */
export function windowUrls(frameWidth = 1400, shutterWidth = 640) {
  return { frame: url(frameSvg(frameWidth)), left: url(shutterSvg(shutterWidth, 'left')), right: url(shutterSvg(shutterWidth, 'right')) }
}
