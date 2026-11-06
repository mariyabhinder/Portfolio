// The recede: once she stands, the girl and her cloud drift away toward the top-left corner, shrinking as they go, as if the
// cloud were travelling off into the distance. Like the rest of the dream it has no clock: its scroll progress (0-1) is the only
// input, and the group's transform is a pure function of it (stop scrolling and it freezes, scroll up and it reverses).
//
// The cloud, the girl, her shadow and the wisps are all drawn inside one camera transform in meadow.ts; the recede is one more
// transform on that whole group (about its resting centre), so she can never slide on the cloud. The background is not in it.

export const RECEDE_CONFIG = {
  /** extra scroll length for the recede, in viewport heights: longer = slower */
  scrollVh: 350,
  /** the group's scale at the end (1 = the size she stood at) on a wide and on a narrow (portrait) viewport; she stays recognisable */
  endScale: { wide: 0.32, narrow: 0.4 },
  /** where the group's resting centre ends up, as a fraction of the viewport (0,0 = top-left). Clamped so nothing is clipped */
  endAt: { x: 0.18, y: 0.1 },
  /** the closest the group's edges may come to the viewport edge (fraction of the shorter side) */
  margin: 0.025,
  /** the most (fraction of the viewport width) the cloud's half-width may push her in from the left edge */
  maxCloudHalf: 0.3,
  /** the group's extent about its centre, in her heights (girl) and in cloud widths (cloud): used only to keep it unclipped */
  extent: { up: 0.72, down: 0.5, cloudHalf: 0.47 },
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
// a quintic ease-in-out: gentle start, a little acceleration through the middle, no jerk or overshoot at the end
const ease = (x: number) => { const t = clamp(x, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }

export interface RecedeFrame {
  /** translation of the group (viewport px, on-screen) and its scale */
  dx: number
  dy: number
  scale: number
}

/**
 * The group's transform for progress r (0-1), given the viewport, the group's resting centre (on screen), her height and the
 * cloud's width (px, at rest). Pure and stateless.
 */
export function recedeAt(r: number, vw: number, vh: number, centre: [number, number], girlH: number, cloudW: number): RecedeFrame {
  const C = RECEDE_CONFIG
  const e = ease(r)
  const narrow = clamp((1 - vw / vh) / 0.5 + 0.5, 0, 1) // 0 on a wide screen, 1 on a tall one
  const end = C.endScale.wide + (C.endScale.narrow - C.endScale.wide) * narrow
  const scale = 1 + (end - 1) * e
  // the end centre, pulled in enough that the scaled group (cloud and her) keeps its margin
  const m = C.margin * Math.min(vw, vh)
  const X = C.extent
  // on a narrow screen the cloud is wider than the viewport at any size she stays readable at: keep her top-left and let its edge crop
  const minX = m + Math.min(cloudW * X.cloudHalf * end, vw * C.maxCloudHalf), minY = m + girlH * X.up * end
  const tx = clamp(vw * C.endAt.x, minX, vw - minX), ty = clamp(vh * C.endAt.y, minY, vh - m - girlH * X.down * end)
  return { dx: (tx - centre[0]) * e, dy: (ty - centre[1]) * e, scale }
}
