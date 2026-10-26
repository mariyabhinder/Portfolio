// The rise: she wakes on the cloud, sits up and stands. Everything tunable about it, and the pure function of scroll progress
// that drives it. landing.ts draws it (p5), land.ts is the landing it follows (she begins in the landing's final frame).
//
// Like the fall and the landing, the rise has no clock of its own. Its scroll progress (0-1) is mapped onto `duration` seconds
// of "virtual time", and everything below is a closed-form function of that time: stop scrolling and it freezes, scroll up and
// it runs backwards, nothing is integrated frame to frame.
//
// One number, `pose` (0-3), says how far through her four pictures she is: 0 = lying (the landing's eyes-open picture),
// 1 = start.webp (lifting onto her elbow), 2 = middle.webp (sitting up, knees drawn in), 3 = end.webp (standing). It is the sum of
// three eased segments that overlap in time, so she never stops between pictures: the next movement begins as the last one ends.
//
// The pictures are flattened illustrations, so a pose change is not a cross-fade. Between two pictures:
//  - both are drawn on the same head position and tilt, each at its own scale (the head, with her glasses, never slides across the face),
//  - the two pictures are morphed: matching landmarks (face, hands, waist, shoes, hem...) are interpolated and each picture is warped
//    onto the in-between positions, then they are cross-dissolved, so her body moves continuously from one pose to the next,
//  - her loose fabric (hijab, skirt, sleeves) trails the movement: it is displaced by how far her body moved a moment ago.
//
// Timeline, in virtual seconds (progress = t / duration), with the default config:
//   0.0 - 1.6   A  RESTING   she is exactly the landing's last frame; a slow breath, her head turns a hair as she takes it in
//   1.2 - 4.4   B  LIFT      head and shoulders rise onto the supporting hand (picture 0 -> 1); the cloud dents under that hand
//   3.8 - 7.0   B  SIT UP    torso comes upright, legs gather in (picture 1 -> 2)
//   6.4 - 9.4   C  RISE      she leans forward over her feet, then hips, knees and torso straighten (picture 2 -> 3)
//   9.4 - 12    D  BALANCE   a small damped adjustment of shoulders and feet; the dress and hijab settle, the cloud recovers

export const RISE_CONFIG = {
  /** extra scroll length for the rise, in viewport heights: longer = slower */
  scrollVh: 600,
  /** the rise's virtual duration (s) for its whole scroll progress */
  duration: 12,

  /** the three movements: [start, end] in virtual seconds. They overlap, so she is never still between pictures */
  segments: [
    [1.2, 4.4],
    [3.8, 7.0],
    [6.2, 9.8],
  ] as [number, number][],

  /**
   * Where she is at each picture, in px of the landing sprite (the frame the landing draws her in): `head` is her face point
   * (see POSES.face), `scale` is landing px per picture px (each picture is drawn at its own, so none is ever stretched to
   * fit another) and `rot` her tilt (rad, clockwise). In between, head and tilt are interpolated smoothly through these.
   */
  keys: [
    { head: [126, 44], scale: 0.62, rot: 0 },
    { head: [134, 50], scale: 0.95, rot: -0.02 },
    { head: [132, 60], scale: 0.9, rot: 0.02 },
    { head: [128, 28], scale: 0.95, rot: 0.01 },
  ] as { head: [number, number]; scale: number; rot: number }[],

  /** between the sitting and the standing picture she leans forward over her feet first: head dips (landing px), swells toward the camera, tilts */
  lean: { drop: 22, shift: [-6, 0] as [number, number], swell: 0.05, tilt: -0.05 },
  /** the awake-and-looking-around of the first seconds: a slow head turn (rad) and breath (fraction of scale) */
  look: { turn: 0.025, breath: 0.006, period: 4.2 },
  /** once standing: a damped adjustment of her shoulders (rad) and feet (landing px), its delay after standing (s) and period (s) */
  balance: { sway: 0.03, step: 3, period: 1.9, damping: 0.3 },

  /** between two pictures both are warped toward each other (matching landmarks, POSES.marks) and cross-dissolved: the span of the movement over which the next fades in and the old one fades out */
  morph: { fadeIn: [0, 0.7] as [number, number], fadeOut: [0.6, 1] as [number, number] },

  /** loose fabric trails by this many seconds [skirt near, skirt far, hijab] and answers with this gain; shown at full looseness */
  cloth: { lag: [0.18, 0.4, 0.3] as [number, number, number], gain: 1.0 },

  /** how deep the cloud dents: under her supporting hand, under her feet, and under her body (all 0-1 of the landing's own dent) */
  cloud: { hand: 0.75, feet: 0.8, body: 0.25 },

  /** with reduced motion the lean, breath, head turn and balance shrink to this fraction (the poses still change) */
  reducedMotion: 0.3,
}

/**
 * The four pictures, in their own px: where her face point, waist and feet are, the hand she props herself on (null once she
 * is not), the stick figure that decides which fabric is loose: [x, y, radius], and `marks`, the same eight landmarks on every picture
 * (face, hijab's far edge, watch, far hand, waist, far shoe, near shoe, hem) that the morph lines up. `face` is the same point that is the
 * `face` of the landing sprite; picture 0 is the landing's eyes-open picture, placed as landing.ts places it (poses.open).
 */
export const POSES = [
  {
    key: 'open', w: 570, h: 703,
    face: [177, 83], waist: [250, 250], feet: [420, 610], hand: null as [number, number] | null,
    skeleton: [[[177, 83, 62], [235, 190, 70], [300, 330, 85], [420, 600, 80]]],
    marks: [[177, 83], [250, 95], [305, 205], [35, 365], [250, 250], [490, 535], [395, 635], [330, 520]],
  },
  {
    key: 'start', w: 323, h: 443,
    face: [111, 62], waist: [152, 152], feet: [240, 380], hand: [20, 208] as [number, number] | null,
    skeleton: [[[111, 62, 40], [150, 150, 48], [190, 260, 62], [240, 370, 50]]],
    marks: [[111, 62], [160, 80], [172, 150], [20, 208], [152, 152], [270, 345], [225, 400], [195, 330]],
  },
  {
    key: 'middle', w: 306, h: 368,
    face: [101, 62], waist: [155, 160], feet: [185, 335], hand: [28, 228] as [number, number] | null,
    skeleton: [[[101, 62, 40], [155, 160, 50], [175, 260, 62], [185, 330, 48]]],
    marks: [[101, 62], [170, 75], [172, 148], [28, 228], [155, 160], [225, 325], [168, 350], [200, 290],
      // head (top, chin, hijab left and right) and sleeve hems: only used between middle and end, so her head stays whole while she stands
      [92, 12], [108, 98], [58, 58], [150, 48], [265, 170], [55, 210]],
  },
  {
    key: 'end', w: 218, h: 463,
    face: [65, 72], waist: [105, 170], feet: [148, 432], hand: null as [number, number] | null,
    skeleton: [[[65, 72, 34], [105, 170, 36], [110, 300, 44], [148, 430, 32]]],
    marks: [[65, 72], [118, 75], [136, 212], [38, 260], [105, 170], [182, 427], [130, 437], [110, 400],
      [50, 8], [70, 108], [25, 62], [108, 50], [150, 195], [35, 220]],
  },
]

/** picture k's scale (landing px per picture px) in this frame */
export const layerScale = (rf: { place: Placement }, k: number) => RISE_CONFIG.keys[k].scale * rf.place.scale

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
// a gentler ease than smoothstep: a quintic, with no jerk at either end
const ease = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }

/** a damped spring's response to a step, in closed form: 0 before, overshooting 1, settling at 1 */
const stepSpring = (tau: number, period: number, zeta: number) => {
  if (tau <= 0) return 0
  const w = (2 * Math.PI) / period, wd = w * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * w * tau) * (Math.cos(wd * tau) + ((zeta * w) / wd) * Math.sin(wd * tau))
}

/** Catmull-Rom through four values: t in 0-1 between b and c */
const cr = (a: number, b: number, c: number, d: number, t: number) =>
  0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)

export interface Placement {
  /** where her face point is (landing px), a multiplier on every picture's own scale (1 = as keyed; the lean and breath) and tilt (rad) */
  head: [number, number]
  scale: number
  rot: number
}

export interface RiseFrame {
  /** virtual seconds into the rise */
  t: number
  /** 0 (lying) .. 3 (standing): the one number the poses, the cloud and the cloth are read from */
  pose: number
  /** the two pictures being blended (from < to) and how far (0..1); from = to - 1 */
  from: number
  to: number
  mix: number
  place: Placement
  /** loose fabric's displacement (landing px): [skirt near, skirt far, hijab] */
  drag: [[number, number], [number, number], [number, number]]
  /** cloud dents (0..1 of the landing's own dent): under her body, her hand and her feet; the hand's dent and its fade */
  body: number
  hand: number
  feet: number
  /** her contact shadow's strength (0..1) */
  shadow: number
  /** how far the camera has eased to frame her standing (0..1) */
  frame: number
}

/** the 0-3 pose number at virtual time t: three overlapping eased movements */
export function poseAt(t: number): number {
  let s = 0
  for (const [a, b] of RISE_CONFIG.segments) s += ease(a, b, t)
  return s
}

/** her placement at virtual time t (pure) */
function placeAt(t: number, m: number): Placement {
  const C = RISE_CONFIG
  const s = poseAt(t)
  const i = clamp(Math.floor(s), 0, 2), f = s - i
  const K = C.keys
  const k0 = K[Math.max(0, i - 1)], k1 = K[i], k2 = K[i + 1], k3 = K[Math.min(3, i + 2)]
  let hx = cr(k0.head[0], k1.head[0], k2.head[0], k3.head[0], f)
  let hy = cr(k0.head[1], k1.head[1], k2.head[1], k3.head[1], f)
  let sc = 1
  let rot = cr(k0.rot, k1.rot, k2.rot, k3.rot, f)

  // the lean over her feet, between sitting (2) and standing (3): in, then out
  const L = C.lean
  const lean = Math.sin(Math.PI * clamp(s - 2, 0, 1)) ** 1.5 * m
  hx += L.shift[0] * lean
  hy += L.drop * lean
  sc *= 1 + L.swell * lean
  rot += L.tilt * lean

  // awake: a slow turn of the head and a breath, fading out as she starts to move
  const rest = 1 - smooth(0.5, 1.6, s)
  const w = (2 * Math.PI) / C.look.period
  rot += C.look.turn * m * rest * Math.sin(w * t * 0.5)
  sc *= 1 + C.look.breath * m * rest * Math.sin(w * t)

  // balance: once she is up, a small damped sway of her shoulders and a shuffle of her feet
  const standT = C.segments[2][1]
  const B = C.balance
  const bt = Math.max(0, t - standT + 0.5)
  const kick = Math.exp(-bt / (B.period * 0.8)) * Math.sin(((2 * Math.PI) / B.period) * bt)
  const dip = (1 - stepSpring(bt, B.period, B.damping)) * smooth(0, 0.3, bt) // she takes her weight: down a hair, then back
  rot += B.sway * m * kick
  hx += B.step * m * kick
  hy += B.step * 0.4 * m * dip
  return { head: [hx, hy], scale: sc, rot }
}

/** The state of the whole rise for progress r (0-1). Pure and stateless: the same r always gives the same frame. */
export function riseAt(r: number, reduced = false): RiseFrame {
  const C = RISE_CONFIG
  const m = reduced ? C.reducedMotion : 1
  const t = clamp(r, 0, 1) * C.duration
  const pose = poseAt(t)
  const from = clamp(Math.floor(pose), 0, 2)
  // the pose number is already eased, so the morph follows it directly: no holds, no jump at the ends of a movement
  const mix = clamp(pose - from, 0, 1)
  const place = placeAt(t, m)

  // fabric trails the body: how far her head was from here a moment ago (the same function of time, evaluated earlier)
  const drag = C.cloth.lag.map((lag) => {
    const was = placeAt(Math.max(0, t - lag), m)
    return [(was.head[0] - place.head[0]) * C.cloth.gain, (was.head[1] - place.head[1]) * C.cloth.gain]
  }) as RiseFrame['drag']

  // the cloud: her hand presses in as she props herself up and lets go as she comes upright; her feet press as she stands on them
  const standT = C.segments[2][1]
  const hand = ease(0.8, 1.7, pose) * (1 - ease(2.2, 2.85, pose))
  const foot = ease(2.35, 3, pose)
  const bt = Math.max(0, t - standT + 0.5)
  const feet = foot * (1 + 0.35 * m * Math.exp(-bt / 1.2) * Math.sin(Math.PI * Math.min(bt / 0.9, 1))) // the cloud gives a little as she takes her weight, then recovers
  const body = (1 - ease(2.2, 3, pose)) * smooth(0, 1, pose) * C.cloud.body

  return {
    t, pose, from, to: from + 1, mix, place, drag,
    body, hand: hand * C.cloud.hand, feet: feet * C.cloud.feet,
    shadow: smooth(0, 0.12, pose),
    frame: ease(2, 3, pose),
  }
}
