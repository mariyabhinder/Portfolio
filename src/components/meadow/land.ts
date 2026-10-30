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
//   (the eyes-closed / eyes-open stages that used to follow are removed)
//   5.8 - 9.4   REACT    as the rebound dies away she recoils onto her elbow (landing picture -> position2.webp)
//   8.0 - 19.6  SIT UP   she lifts her head and shoulders, props herself on her hands and turns her hips and bent knees toward the cloud's edge (position2 -> position5.webp)
//   19.0 - 24.8 LOWER    she shifts her weight back onto her supporting hand, slides along the cloud to its edge and lowers her legs over it (position5 -> position6.webp)
//   24.8 - 27   HOLD     position6, sitting at the edge
//   (she then sits until the window (window.ts) has opened completely; only then does the LAUNCH below play, driven by the end of the window's scroll)
// (scrollVh and duration keep the same 50 vh per second, so the earlier stages run exactly as before)

export const LAND_CONFIG = {
  /** extra scroll length for the landing, in viewport heights (the fall before it is 1048 vh): longer = slower, more cinematic */
  scrollVh: 1350,
  /** the landing's virtual duration (s) for its whole scroll progress */
  duration: 27,

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

  // ---- sitting up: her landing picture -> position2.webp (reacting, propped on her elbow) -> position5.webp (turning toward the cloud's edge) -> position6.webp (sitting at the edge, legs hanging over it) ----
  sit: {
    /** the four movements, [start, end] in virtual seconds (they overlap a little, so she never stops between pictures).
     *  The first starts as the rebound dies away; the last ends a little before the landing's end */
    segments: [
      [5.8, 9.4],
      [8.0, 19.6],
      [19.0, 24.8],
    ] as [number, number][],
    /** where her hips (the belt) are on each picture, in px of the landing sprite's frame (landing-girl.webp is drawn 364 x 427), keyed by picture:
     *  [landing, position2, position5, position6]. Her hips stay planted on the cloud while her body rises about them, so keep the first
     *  keys close together. Moving a key slides the whole picture */
    hip: [[149.4, 165.3], [150, 162], [120.6, 161.6], [101, 157]] as [number, number][],
    /** how the parts of her body time themselves within each movement, each [start, end] as a fraction of it (0-1). Her head and shoulders lead, her hands plant early
     *  to push against the cloud, her legs and the hem of her dress follow. Overlapping windows keep her in one piece; a later start makes that part trail more */
    timing: {
      head: [0.0, 0.8] as [number, number],
      torso: [0.04, 0.88] as [number, number],
      hands: [0.0, 0.65] as [number, number],
      legs: [0.18, 1.0] as [number, number],
      hem: [0.25, 1.0] as [number, number],
    },
    /** tilt of each picture (rad, clockwise) about her hips */
    rot: [0, -0.01, -0.01, 0],
    /** a soft bob of her head at the middle of each movement, in landing px (positive = down, negative = up): the recoil, the push-up, the rise, the turn */
    bob: [3.5, -3, 1] as number[],
    /** the turn toward the cloud's edge adds a whole-picture move on top of the pictures (it follows the last movement): how far she turns (rad, clockwise; negative = the other way)
     *  and how far her body travels toward the edge (landing px, [right, down]). Zero both and only the pictures themselves turn her */
    turn: { angle: 0.03, shift: [6, 4] as [number, number] },
    /** the last movement, lowering her legs over the cloud's edge (all scaled with her, so it holds on any screen):
     *  `shift` how far her hips slide toward the edge (landing px, [right, down]); `pan` how far the camera moves down the cloud with her, in her heights (so the edge and her hanging legs stay in frame);
     *  `slide` how far the cloud slides left over the same time, in her heights (the camera's vertical pan is cancelled on the cloud), so she ends on its right end;
     *  `back` how far she first shifts her weight back onto her supporting hand (landing px, easing out and back); `arc` how far her feet and hem swing out sideways and up (landing px) on the way down,
     *  so they follow an arc and do not drop straight; `shadow` how much her contact shadow fades as her legs leave the cloud (0-1) */
    edge: { shift: [30, 315] as [number, number], pan: 0.58, slide: 0.55, back: 5, arc: [16, -10] as [number, number], shadow: 0.85 },
    /** a breath of swell (fraction of scale) at the middle of the first movement, as her chest takes it in */
    breath: 0.008,
    /** she is never frozen between movements: a slow breath (fraction of scale) and a slow sway of her shoulders about her hips (rad), with the period of the breath (s) */
    idle: { breath: 0.005, sway: 0.008, period: 4.2 },
    /** between two pictures the next fades in (underneath) and the old one fades out (on top of it) over this much of the movement (0-1); the two windows overlap a little, so the dissolve is brief and the dress never goes see-through in the middle */
    fadeIn: [0.08, 0.22] as [number, number],
    fadeOut: [0.3, 0.72] as [number, number],
  },

  // ---- the launch: position6.webp pushes herself off the cloud and becomes jump11.webp ----
  launch: {
    /** each part of the movement as [start, end] of the launch (0-1): the stages of the brief are 0-0.2 right hand, 0.2-0.45 second hand + lift, 0.45-0.7 push-off, 0.7-1 jump11 */
    plant: [0.0, 0.14] as [number, number], // her back (right) hand presses into the cloud
    second: [0.14, 0.34] as [number, number], // her other hand comes down onto the cloud beside it
    lean: [0.06, 0.5] as [number, number], // her shoulders and head go forward over her hands
    lift: [0.3, 0.55] as [number, number], // her hips come up off the cloud on both hands (elbows bend a little)
    tuck: [0.36, 0.68] as [number, number], // her knees bend and her feet lift away from the cloud
    push: [0.46, 1.0] as [number, number], // she pushes down and her body travels away (energetic: it eases in, not out)
    release: [0.56, 0.66] as [number, number], // her hands let go of the cloud
    dissolve: [0.6, 0.8] as [number, number], // position6 turns into jump11.webp
    drift: [0.74, 1] as [number, number], // once airborne she floats on a little further, slowing
    /** how far each hand presses down (landing px) as she bears weight, and where the second hand lands (landing px from her hips) */
    press: 5,
    handTo: [34, 66] as [number, number],
    /** the poses, in landing px (her height is 427) and rad (clockwise): lean forward, hips lift, knees tuck (how far her feet swing up, and how much closer to her hips they come) */
    leanAngle: 0.12,
    liftBy: 10,
    tuckAngle: 0.2,
    tuckIn: 0.1,
    /** how far she drops away from her seat, [right, down] (landing px): she jumps off the cloud's edge and falls out of the bottom of the frame (never up over the cloud), then the last drift */
    away: [60, 640] as [number, number],
    float: [0, 0] as [number, number],
    /** how far the cloud sinks down the frame over the push and the dissolve (her heights): a tilt of the camera up after her, so she rises clear of the cloud and stays in frame */
    drop: 0,
    dropSpan: [0.45, 0.95] as [number, number],
    /** how much her dress and hijab trail behind the push (landing px, opposite to her travel) */
    trail: 8,
    /** jump11.webp: its face point is lined up on her face, at this many landing px per picture px (its head matches hers), turned this much (rad) */
    jumpScale: 0.78,
    jumpTilt: -0.08,
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
    width: 2.6,
    /** the cloud sprite's pixel size (the canvas it is painted on) and the dent's width in cloud widths */
    px: [1600, 900] as [number, number],
    zone: 0.29,
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
  /** sitting up: 0 (her landing picture) .. 1 (position2) .. 2 (position5) .. 3 (position6), the two pictures being blended (from < to), how far (0..1), their opacities, and her face point's place (landing px), tilt (rad) and scale multiplier */
  sit: { edge: number; pan: number; pose: number; from: number; to: number; mix: number; alpha: number[]; hip: [number, number]; rot: number; scale: number }
  /** the launch (all 0 until she starts): how hard each hand is planted on the cloud (0-1), how far each is placed, the lean (rad), the hips' lift and the legs' tuck (0-1),
   *  where her body has travelled (landing px, [right, down]), how far she has let go of the cloud (0-1), how far jump11 has taken over (0-1), and how far the cloud has sunk (her heights) */
  launch: { drop: number; u: number; plant: number; second: number; lean: number; lift: number; tuck: number; away: [number, number]; push: number; release: number; jump: number }
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

  // sitting up: two eased movements whose sum is the 0-2 pose number
  const S = C.sit
  const pose = S.segments.reduce((s, [a, b]) => s + smooth(a, b, t), 0)
  const last = S.hip.length - 1
  const sFrom = clamp(Math.floor(pose), 0, last - 1), sMix = clamp(pose - sFrom, 0, 1)
  const sAlpha: number[] = S.hip.map(() => 0)
  sAlpha[sFrom] = 1 - smooth(S.fadeOut[0], S.fadeOut[1], sMix)
  sAlpha[sFrom + 1] = smooth(S.fadeIn[0], S.fadeIn[1], sMix)
  if (pose <= 0) { sAlpha[0] = 1; sAlpha[1] = 0 }
  const sHip: [number, number] = [lerp(S.hip[sFrom][0], S.hip[sFrom + 1][0], sMix), lerp(S.hip[sFrom][1], S.hip[sFrom + 1][1], sMix)]
  // a soft bob in the middle of each movement
  S.bob.forEach((b, i) => { sHip[1] += b * m * Math.sin(Math.PI * clamp(pose - i, 0, 1)) })
  // the turn toward the edge: the whole picture travels and tilts a little with the last movement
  const turn = clamp(pose - 1, 0, 1)
  const EG = S.edge, edge = clamp(pose - 2, 0, 1)
  sHip[0] += EG.shift[0] * m * edge - EG.back * m * Math.sin(Math.PI * edge)
  sHip[1] += EG.shift[1] * m * edge
  sHip[0] += S.turn.shift[0] * m * turn
  sHip[1] += S.turn.shift[1] * m * turn
  const sit = {
    edge, pan: EG.pan * m * edge, pose, from: sFrom, to: sFrom + 1, mix: sMix, alpha: sAlpha, hip: sHip,
    rot: lerp(S.rot[sFrom], S.rot[sFrom + 1], sMix) + S.turn.angle * m * turn + S.idle.sway * m * Math.sin((2 * Math.PI * t) / (S.idle.period * 1.7)) * smooth(0.2, 1, pose),
    scale: (1 + S.breath * m * Math.sin(Math.PI * clamp(pose, 0, 1))) * (1 + S.idle.breath * m * Math.sin((2 * Math.PI * t) / S.idle.period) * smooth(0.2, 1, pose)),
  }

  const launch = launchAt(0, reduced)

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
    sit,
    launch,
    camDy: cam.dip * knock * m,
    camZoom: (1 + cam.punch * Math.max(0, knock) * m) * (1 - cam.pullback * easeInOut(pull)),
    shadow: lerp(C.shadow.rest, C.shadow.impact, clamp(compress, 0, 1)) * smooth(0.35, 1, a) ,
    closeness: smooth(0.2, 1, a),
  }
}

/** The launch for its own progress u (0-1), which the window's scroll supplies once the window is fully open. Pure and stateless. */
export function launchAt(u: number, reduced = false): LandFrame['launch'] {
  const C = LAND_CONFIG
  const LN = C.launch, lu = clamp(u, 0, 1), m = reduced ? C.reducedMotion : 1
  const lwin = (w: [number, number]) => smooth(w[0], w[1], lu)
  // the push is an ease-in (she gathers speed and is gone), the drift an ease-out (she slows as she floats)
  const pu = clamp((lu - LN.push[0]) / (LN.push[1] - LN.push[0]), 0, 1), du = clamp((lu - LN.drift[0]) / (LN.drift[1] - LN.drift[0]), 0, 1)
  const away = pu * pu // gravity: she gathers speed as she drops away
  return {
    drop: LN.drop * m * lwin(LN.dropSpan),
    u: lu,
    plant: lwin(LN.plant) * (1 - lwin(LN.release)),
    second: lwin(LN.second) * (1 - lwin(LN.release)),
    lean: LN.leanAngle * m * lwin(LN.lean),
    lift: lwin(LN.lift),
    tuck: lwin(LN.tuck),
    away: [LN.away[0] * m * away + LN.float[0] * m * easeOut(du), LN.away[1] * m * away + LN.float[1] * m * easeOut(du)],
    push: lwin(LN.push),
    release: lwin(LN.release),
    jump: lwin(LN.dissolve),
  }
}
