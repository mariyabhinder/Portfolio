// The landing: everything tunable about it, and the pure function of scroll progress that drives it.
// landing.ts owns the drawing (p5); cloud.ts paints the cloud. This file owns the numbers.
//
// Like the fall (fall.ts), the landing has no clock of its own. Its scroll progress (0-1) is mapped onto `duration` seconds
// of "virtual time", and every value below is a closed-form function of that time: stop scrolling and it freezes, scroll up
// and it runs backwards, and nothing is integrated frame to frame. The impact is a damped spring written out analytically
// (not simulated), so it is exactly reversible too.
//
// Timeline, in virtual seconds (progress = t / duration), with the default config:
//   0.0 - 4.4   APPROACH  the sky slows, the cloud swells up beneath her and she eases down toward it; ; she stays her falling
//               picture until contact, where it hands over to her landing picture (the same girl, aligned on her face)
//   4.4         CONTACT   she meets the cloud: compression peaks ~0.35 s later (cloud dents, wisps blow out, shadow darkens)
//   4.4 - 7.0   REBOUND   the cloud pushes her back up a short way and she sinks in again; the spring dies away
//   7.0 - 9.0   SETTLE    fabric and hijab (which lag the body) come to rest, the cloud recovers its shape
//   5.9 - 7.3   EYES CLOSE  1.5 s after contact her picture cross-fades to the one with her eyes closed; her body relaxes with it
//   7.4 - 7.75  EYES OPEN   a brief hold, then a quick cross-fade to the eyes-open picture (reads as one long blink)
//   7.75 - 13   REST     a calm, stable final pose

export const LAND_CONFIG = {
  /** extra scroll length for the landing, in viewport heights (the fall before it is 1048 vh): longer = slower, more cinematic */
  scrollVh: 650,
  /** the landing's virtual duration (s) for its whole scroll progress */
  duration: 13,

  // ---- approach ----
  approach: {
    /** virtual second she touches the cloud */
    contact: 4.4,
    /** she stays the falling picture until she touches the cloud; it hands over to the landing picture between these seconds, at contact (they are drawn aligned on her face) */
    cross: [4.38, 4.6] as [number, number],
    /** how far away the cloud starts (it swells as 1 / distance, ending at 1) and the seconds over which it fades in */
    cloudFar: 3.6,
    cloudFadeIn: [0.0, 1.8] as [number, number],
    /** how far below its final place the cloud starts, in viewport heights (0: it swells where she is falling, from the middle of the view) */
    cloudRise: 0,
    /** how far she eases down on the way to the cloud, in her heights */
    descent: 0.09,
    /** the fall's own scroll length in viewport heights, (1400 - 100) * (1 - DREAM_END) in DreamLanding: lets the sky run on at exactly the speed the fall left it, then slow to a stop at contact */
    fallVh: 1048,
  },

  // ---- impact and rebound (a damped spring, written out in closed form) ----
  impact: {
    /** how far she sinks at the deepest point, in her heights (the first peak) */
    depth: 0.085,
    /** the spring's natural period (s) and damping ratio: 0.27 gives a first rebound ~45% of the first compression */
    period: 1.7,
    damping: 0.27,
    /** where she ends up relative to the first touch (her heights down), and how fast (s) she gets there */
    restSink: 0.022,
    restTime: 1.4,
    /** her body turns a little as the cloud pushes back (deg at the first rebound) */
    tilt: 1.7,
    /** her body compresses along her height by this fraction at the deepest point, and her dress spreads out sideways */
    squash: 0.03,
    spread: 0.035,
  },

  // ---- clothing and limbs: secondary motion lags the body ----
  cloth: {
    /** hem travel at full loose fabric, in sprite px; the hijab's, and how much later (s) outer fabric answers than the body */
    dress: 11,
    hijab: 7,
    lag: [0.1, 0.34] as [number, number],
    hijabLag: [0.16, 0.42] as [number, number],
    /** the fabric answers a little under-damped (a swing past rest) */
    damping: 0.22,
  },
  limbs: {
    /** swing (rad) at the first compression, per limb (raised hand, other arm, big shoe, near shoe), delay (s) behind the body */
    amp: [-0.09, 0.07, 0.05, -0.04],
    lag: [0.12, 0.2, 0.28, 0.36],
    /** where the limbs relax to once she is relieved (rad), on top of the swing */
    relax: [0.1, -0.06, -0.025, 0.03],
  },

  // ---- the expression: startled -> eyes closed -> eyes open, each a cross-fade between her supplied pictures ----
  expression: {
    /** seconds after contact before she closes her eyes (startled, then still, through this pause), and the seconds the cross-fade takes */
    delay: 1.5,
    duration: 1.4,
    /** seconds after contact before she opens them again, and the seconds that cross-fade takes */
    openDelay: 3.0,
    openDuration: 0.35,
    /** her body relaxing (limbs, shoulders) follows the closing of her eyes (0-1 of its cross-fade) */
    relax: [0.15, 1.0] as [number, number],
  },

  // ---- camera, cloud and effects ----
  camera: {
    /** the little knock at impact: viewport heights down, and zoom */
    dip: 0.014,
    punch: 0.012,
    /** the camera eases back from the cloud as she settles, so the cloud fills the frame around her (fraction zoomed out) */
    pullback: 0.1,
    /** seconds (after contact) over which it pulls back */
    pullbackTime: 5.5,
  },
  cloud: {
    /** the cloud's width in her widths, and where on the cloud she lies (the sprite's landing zone is at its centre) */
    width: 3.8,
    /** the cloud sprite's pixel size (the canvas it is painted on) and the dent's width in cloud widths */
    px: [1600, 900] as [number, number],
    zone: 0.2,
    /** how far the heap spreads (see CloudOptions.spread): 1 is one cloud with its own outline */
    spread: 1,
    /** how much the cloud's near lobes lift as she presses in (her heights), and the hollow's widening */
    lipLift: 0.018,
    hollowGrow: 0.28,
  },
  wisps: {
    count: 12,
    /** how far they blow (her heights), how long they live (s), their size (her heights) */
    reach: 0.75,
    life: 2.2,
    size: 0.26,
  },
  shadow: {
    /** the contact shadow: strength resting, at impact, and its offset (her heights, down-right) and softness */
    rest: 0.26,
    impact: 0.5,
    offset: [0.012, 0.026] as [number, number],
  },
  /** with reduced motion the bounce, tilt, squash, camera knock and wisps shrink to this fraction (the poses and expression still change) */
  reducedMotion: 0.3,
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const easeOut = (x: number) => 1 - (1 - x) * (1 - x)
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x))

/** a damped spring's response to being hit, in closed form: 0 before the hit, then up to 1 at the first peak, back past 0 and so on */
function springShape(period: number, zeta: number) {
  const w = (2 * Math.PI) / period, wd = w * Math.sqrt(1 - zeta * zeta)
  const peakT = Math.atan2(wd, zeta * w) / wd
  const norm = Math.exp(-zeta * w * peakT) * Math.sin(wd * peakT)
  return (tau: number) => (tau <= 0 ? 0 : Math.exp(-zeta * w * tau) * Math.sin(wd * tau) / norm)
}

export interface LandFrame {
  /** virtual seconds into the landing, and seconds since contact (negative before it) */
  t: number
  tau: number
  /** 0..1 progress of the approach (to contact), eased */
  approach: number
  /** how far the fall's time runs on past its end (fall progress units, for the sky): speed is continuous with the fall and goes to 0 at contact */
  skyExtra: number
  /** 0..1 how much of the fall's motion (streaks, blur) is still there */
  skySpeed: number
  /** the cloud: size multiplier (relative to its resting size), rise (vh, below its place), opacity */
  cloudScale: number
  cloudRise: number
  cloudAlpha: number
  /** 0 = her falling picture, 1 = her landing picture */
  cross: number
  /** her centre's offset from where the fall left her: 0..1 of the descent to the cloud (eased), and the sink since contact (her heights, down) */
  descend: number
  sink: number
  /** the body: roll (rad) of the cloud's push-back, compression (1 at the deepest first press; slightly negative on the rebound) and squash */
  roll: number
  compress: number
  squash: number
  /** how far the landing picture has settled from the pose the falling one hands over (0..1), for the body's rotation/3D */
  settle: number
  /** fabric: [dress fast, dress slow, hijab fast, hijab slow], as signed fractions of peak compression; limbs: angles (rad) */
  fabric: [number, number, number, number]
  limbs: [number, number, number, number]
  /** expression: how far the closed-eyes picture has faded in over the startled one (0..1), how far the open-eyes picture has faded in over that, and how relaxed her body is (0..1) */
  closed: number
  open: number
  relax: number
  /** camera knock: vertical (viewport heights) and zoom (1 = none), and pull-back zoom */
  camDy: number
  camZoom: number
  /** contact shadow strength (0..1) and closeness to the cloud (0 far .. 1 touching) */
  shadow: number
  closeness: number
}

/**
 * The state of the whole landing for progress l (0-1). Pure and stateless: the same l always gives the same frame.
 * `reduced` shrinks the physical reactions for people who prefer reduced motion.
 */
export function landAt(l: number, reduced = false): LandFrame {
  const C = LAND_CONFIG
  const m = reduced ? C.reducedMotion : 1
  const t = clamp(l, 0, 1) * C.duration
  const tc = C.approach.contact
  const tau = t - tc
  const a = clamp(t / tc, 0, 1)

  // approach: everything eases out toward contact (speed falls toward 0 as she nears the cloud, but she still arrives)
  const approach = easeOut(a)
  // the sky keeps its speed at the start (continuous with the fall) and slows linearly to a stop at contact: the extra
  // fall progress is the integral of that speed
  const skyExtra = (C.scrollVh / C.duration / C.approach.fallVh) * (a - (a * a) / 2) * tc
  const skySpeed = 1 - a
  const cloudDist = lerp(C.approach.cloudFar, 1, easeOut(a))
  const [f0, f1] = C.approach.cloudFadeIn
  const cloudAlpha = smooth(f0, f1, t)
  const [c0, c1] = C.approach.cross
  const cross = smooth(c0, c1, t)

  // impact: the spring, its slow settle, and what hangs off it
  const I = C.impact
  const spring = springShape(I.period, I.damping)
  const settleIn = 1 - Math.exp(-Math.max(0, tau) / I.restTime)
  const press = spring(tau) // 1 at the first peak
  const sink = tau > 0 ? I.depth * press * m + I.restSink * settleIn * (reduced ? 0.6 : 1) : 0
  const compress = tau > 0 ? press * m : 0
  const roll = ((I.tilt * Math.PI) / 180) * m * spring(tau - 0.35) * -0.8
  const cl = C.cloth
  const clothSpring = springShape(I.period * 0.85, cl.damping)
  const fabric: LandFrame['fabric'] = [
    clothSpring(tau - cl.lag[0]) * m, clothSpring(tau - cl.lag[1]) * m,
    clothSpring(tau - cl.hijabLag[0]) * m, clothSpring(tau - cl.hijabLag[1]) * m,
  ]

  // expression and relaxation, from the end of the pause after contact
  const E = C.expression
  const e = (tau - E.delay) / E.duration
  const win = (w: [number, number]) => smooth(w[0], w[1], e)
  const relax = win(E.relax)

  const L = C.limbs
  const limbs = L.amp.map((amp, i) => {
    const swing = amp * m * springShape(I.period * 0.9, 0.3)(tau - L.lag[i])
    return swing + L.relax[i] * relax
  }) as LandFrame['limbs']

  // the falling body keeps its 3D turn until contact; after the hand-over the landing picture eases from the fall's attitude into her resting pose
  const settle = smooth(tc, tc + 0.7, t)

  // camera: a knock at impact; then a slow pull back
  const cam = C.camera
  const knock = tau > 0 ? press : 0
  const pull = smooth(0, cam.pullbackTime, tau)
  return {
    t, tau, approach, skyExtra, skySpeed,
    cloudScale: 1 / cloudDist,
    cloudRise: C.approach.cloudRise * (1 - easeOut(a)),
    cloudAlpha,
    cross,
    descend: approach,
    sink,
    roll,
    compress,
    squash: I.squash * Math.max(0, compress) * m,
    settle,
    fabric,
    limbs,
    // frames 16-18 (eyes close, eyes open, rest) are removed: she keeps the startled picture
    closed: 0,
    open: 0,
    relax: 0,
    camDy: cam.dip * knock * m,
    camZoom: (1 + cam.punch * Math.max(0, knock) * m) * (1 - cam.pullback * easeInOut(pull)),
    shadow: lerp(C.shadow.rest, C.shadow.impact, clamp(compress, 0, 1)) * smooth(0.35, 1, a) ,
    closeness: smooth(0.2, 1, a),
  }
}
