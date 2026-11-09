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

// The drawing is in a 600 x 800 box: a carved cream sandstone wall with a cusped (scalloped) arched doorway, and two jade-green, panelled
// doors hung at its sides. Shut, each covers half of the opening; the wall is one picture, each door another (box below, in the
// wall's units, with its hinge on its outer edge). The picture sits behind the wall, so the wall's stone trims it to the arch.
export const SHUTTER_BOX = { x: 100, y: 108, w: 200, h: 612 }

// the cusped arch's outline: left half, from the foot up to the peak (lobes bulge outward and meet in inward cusps); mirrored for the right
const ARCH_LEFT = 'M100 720 V330 Q98 292 122 262 Q132 223 170 208 Q187 164 232 150 Q256 114 300 108'
const ARCH_RIGHT = 'Q344 114 368 150 Q413 164 430 208 Q468 223 478 262 Q502 292 500 330 V720'
const OPENING = `${ARCH_LEFT} ${ARCH_RIGHT} Z`

/** the whole doorway's bounding box (drawing units): the dark interior behind the picture fills it */
export const OPENING_BOX = { x: 100, y: 108, w: 400, h: 612 }

/** Where a picture of the given aspect (w / h) lies inside the doorway, in the drawing's units: as wide as the opening, centred on its
 *  straight-sided lower part, so all of it shows (the arch above and any space around it is dark interior). */
export function openingFit(_aspect?: number) {
  return { ...OPENING_BOX }
}
/** the part of the picture (fractions 0-1: x, y, w, h) that fills the doorway edge to edge, centred, nothing stretched */
export function openingCrop(aspect: number) {
  const target = OPENING_BOX.w / OPENING_BOX.h
  if (aspect > target) { const w = target / aspect; return { x: (1 - w) / 2, y: 0, w, h: 1 } }
  const h = aspect / target
  return { x: 0, y: (1 - h) / 2, w: 1, h }
}

const DEFS = `<defs>
<linearGradient id="stone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1e6c8"/><stop offset=".55" stop-color="#e6d6ad"/><stop offset="1" stop-color="#d6c08f"/></linearGradient>
<linearGradient id="carve" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6edd3"/><stop offset="1" stop-color="#dcc796"/></linearGradient>
<linearGradient id="jade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34a070"/><stop offset="1" stop-color="#1f7a55"/></linearGradient>
<linearGradient id="leaf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a6b4d"/><stop offset=".5" stop-color="#35805c"/><stop offset="1" stop-color="#235a40"/></linearGradient>
<radialGradient id="boss" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#f4f1e4"/><stop offset="1" stop-color="#a9b59c"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .045" numOctaves="4" seed="5" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .55  0 0 0 0 .38  0 0 0 0 .16  0 0 0 .8 -.3" result="c"/><feComposite in="c" in2="SourceGraphic" operator="in"/></filter>
</defs>`

// a carved eight-petal rosette, centred on (0, 0)
function rosette(r: number): string {
  let s = `<circle r="${r}" fill="#e0cb9a" stroke="#b79a62" stroke-width="2"/>`
  for (let i = 0; i < 8; i++) s += `<ellipse cx="0" cy="${-r * 0.55}" rx="${r * 0.24}" ry="${r * 0.4}" fill="#f3e8c9" stroke="#b79a62" stroke-width="1.6" transform="rotate(${i * 45})"/>`
  return s + `<circle r="${r * 0.3}" fill="#c9ad74" stroke="#a88a52" stroke-width="1.6"/><circle r="${r * 0.12}" fill="#f3e8c9"/>`
}

// a white four-pointed ornament between the door's panels, centred on (0, 0)
const star = (r: number) => `<path d="M0 ${-r} Q${r * 0.25} ${-r * 0.25} ${r} 0 Q${r * 0.25} ${r * 0.25} 0 ${r} Q${-r * 0.25} ${r * 0.25} ${-r} 0 Q${-r * 0.25} ${-r * 0.25} 0 ${-r} Z" fill="#dfe3ea" stroke="#52605a" stroke-width="1.4"/>`

// one door, flat and shut, in its own box (200 x 612) with the hinge on its left edge and the meeting edge on its right (the right door is this mirrored)
function door(): string {
  const { w, h } = SHUTTER_BOX
  const shape = 'M0 612 V222 Q-2 184 22 154 Q32 115 70 100 Q87 56 132 42 Q156 6 200 0 V612 Z'
  let body = `<clipPath id="dc"><path d="${shape}"/></clipPath><g clip-path="url(#dc)">` +
    `<rect x="-4" y="0" width="${w + 4}" height="${h}" fill="#1d4a39"/>` +
    // the carved leaf border running round the door, olive on dark green
    `<path d="M16 ${h - 10} V232 Q14 196 34 170 Q44 134 80 120 Q98 74 140 62 Q166 26 ${w - 22} 20 V${h - 10} Z" fill="url(#leaf)" stroke="#8d9a4c" stroke-width="3"/>`
  // two panels: an upper one under the arch and a taller lower one, each a rounded jade slab with a pale boss
  const panels: [number, number][] = [[200, 130], [372, 200]]
  for (const [y, ph] of panels) {
    const x = 34, pw = 142
    body += `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="22" fill="url(#jade)" stroke="#7d8a45" stroke-width="5"/>` +
      `<rect x="${x + 8}" y="${y + 8}" width="${pw - 16}" height="${ph - 16}" rx="16" fill="none" stroke="#16543a" stroke-width="2" stroke-opacity=".7"/>` +
      `<circle cx="${x + pw / 2}" cy="${y + ph / 2}" r="15" fill="url(#boss)" stroke="#2b3a32" stroke-width="1.6"/><circle cx="${x + pw / 2}" cy="${y + ph / 2}" r="5" fill="#16231d"/>`
  }
  // the bands between and below the panels carry a boss and white ornaments at each end
  for (const cy of [338, h - 22]) {
    body += `<circle cx="100" cy="${cy}" r="12" fill="url(#boss)" stroke="#2b3a32" stroke-width="1.6"/><circle cx="100" cy="${cy}" r="4.5" fill="#16231d"/>` +
      `<g transform="translate(34 ${cy})">${star(22)}</g><g transform="translate(176 ${cy})">${star(22)}</g>`
  }
  // studs up the arch
  for (const [cx, cy] of [[44, 190], [166, 190], [100, 132], [66, 150]]) body += `<circle cx="${cx}" cy="${cy}" r="5" fill="#c9d0bd" stroke="#26332c" stroke-width="1"/>`
  // the meeting stile: dark, with studs
  body += `<rect x="${w - 16}" y="0" width="16" height="${h}" fill="#143528"/>`
  for (let y = 40; y < h; y += 46) body += `<circle cx="${w - 8}" cy="${y}" r="3.2" fill="#9fb08a"/>`
  body += '</g>' + `<path d="${shape}" fill="none" stroke="#10281e" stroke-width="4" stroke-linejoin="round"/>`
  return body
}

function svg(width: number, box: [number, number, number, number], body: string): string {
  const height = Math.round((width * box[3]) / box[2])
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${box.join(' ')}">${DEFS}${body}</svg>`
}

/** The stationary part: the cream carved-sandstone wall with the cusped doorway cut out of it (the opening is clear), its rosettes and its sill. */
export function frameSvg(width: number): string {
  const wall = `M0 0 H600 V800 H0 Z ${OPENING}`
  const frame =
    `<clipPath id="wallclip"><path clip-rule="evenodd" d="${wall}"/></clipPath>` +
    `<path fill-rule="evenodd" fill="url(#stone)" d="${wall}"/>` +
    '<g clip-path="url(#wallclip)">' +
    // the cornice across the top, and the pilasters at both sides
    '<rect x="0" y="0" width="600" height="46" fill="url(#carve)" stroke="#b79a62" stroke-width="2"/>' +
    '<rect x="0" y="46" width="600" height="14" fill="#cdb480"/>' +
    '<path d="M44 60 V720 M556 60 V720" stroke="#b79a62" stroke-width="3"/>' +
    // the carved border round the arch: a wide pale band along the doorway's outline with a darker groove outside it
    `<path d="${OPENING}" fill="none" stroke="#b79a62" stroke-width="82" stroke-linejoin="round"/>` +
    `<path d="${OPENING}" fill="none" stroke="url(#carve)" stroke-width="74" stroke-linejoin="round"/>` +
    // rosettes above the arch's shoulders and at its crown
    `<g transform="translate(150 118)">${rosette(36)}</g><g transform="translate(450 118)">${rosette(36)}</g>` +
    `<g transform="translate(300 78)">${rosette(20)}</g>` +
    // small carved capitals on the pilasters
    '<rect x="30" y="300" width="28" height="22" rx="4" fill="#e0cb9a" stroke="#b79a62" stroke-width="2"/><rect x="542" y="300" width="28" height="22" rx="4" fill="#e0cb9a" stroke="#b79a62" stroke-width="2"/>' +
    '</g>' +
    // weathering over the stone, not over the opening
    `<path fill-rule="evenodd" filter="url(#grain)" d="${wall}"/>` +
    // the reveal: a brown line and a lit line round the opening give the arch depth
    `<path d="${OPENING}" fill="none" stroke="#8a5a2e" stroke-width="10" stroke-linejoin="round"/>` +
    `<path d="${OPENING}" fill="none" stroke="#f7efd8" stroke-opacity=".7" stroke-width="2" stroke-linejoin="round" transform="translate(0 -6)"/>` +
    // the sill: a white slab, then the base
    '<path d="M30 720 H570 V756 H30 Z" fill="#f4efe2" stroke="#b9ad92" stroke-width="2"/>' +
    '<path d="M0 756 H600 V800 H0 Z" fill="#e3d6b4" stroke="#b79a62" stroke-width="2"/>' +
    '<path d="M30 726 H570" stroke="#ffffff" stroke-opacity=".8" stroke-width="2"/>'
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
