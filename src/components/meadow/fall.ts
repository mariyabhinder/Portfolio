// The falling sequence: everything tunable about it, the physics that drives it, and the sky-layer shader.
// meadow.ts owns the drawing (p5); this file owns the numbers. To swap art or retune the feel, edit only here.
//
// The sprite (falling-girl.webp) is one flattened illustration, so motion is built from what a single image allows:
//  - her limbs swing about their joints (a vertex-shader rotation weighted along each limb, with a lag between them),
//  - her dress and hijab are a mesh blown by the airflow, loose fabric far from her body, none at her face,
//  - her whole body turns in 3D (roll, tilt, yaw) for foreshortening.
// Ideal art would be layered (hijab, dress front/back, each arm, each leg, head with glasses): then each limb
// could be its own mesh. The limb swing below is the closest single-image equivalent.

import fallingGirlUrl from '@/assets/meadow/falling-girl.webp'
import skyUrl from '@/assets/meadow/sky-bg.jpg'

/** Asset paths: replace the files (or these imports) without touching any animation logic. */
export const FALL_ASSETS = { girl: fallingGirlUrl, sky: skyUrl }

export const FALL_CONFIG = {
  // ---- scroll mapping ----
  /**
   * The fall has no clock of its own: its progress (0-1, from the scroll) is mapped onto this many seconds of "virtual time",
   * and everything below (acceleration, flutter, sway, camera shake) is a pure function of that time. Scroll stops, it freezes;
   * scroll back, it rewinds. Longer = slower, more relaxed fall per scroll distance.
   */
  duration: 14,

  // ---- timing & acceleration (in virtual seconds) ----
  /** seconds she hangs unstable before gravity takes over (phase A) */
  hover: 0.9,
  /** time constant (s) of the acceleration: speed follows tanh((t - hover) / accel), i.e. drag-limited free fall */
  accel: 3.4,
  /** terminal speed of the nearest-cloud-layer reference, in viewport heights per second */
  terminalSpeed: 1.5,
  /** drift speed while hovering (fraction of terminal) */
  hoverDrift: 0.05,
  /** progress (0-1 of `u`) at which phases B, C, D begin, for anything that wants to key off them */
  phases: { B: 0.05, C: 0.4, D: 0.85 },

  // ---- camera ----
  /** shake as the fall begins: amplitude (fraction of viewport height), decay (s), frequency (rad/s) */
  shake: { amp: 0.007, decay: 0.8, freq: 31 },
  /** the steady tremor once she is at speed (fraction of viewport height) */
  tremor: 0.0012,
  /** camera roll (deg) that follows her body roll, and the sky's own slow roll */
  roll: { follow: 0.35, sky: 2.2, period: 11 },
  /** push-in on the sky as the fall speeds up (fraction) */
  zoom: 0.07,

  // ---- her body ----
  body: {
    /** roll (deg), pitch and yaw (radians) amplitudes and their periods (s) */
    roll: { amp: 5, period: 5.3 },
    pitch: { amp: 0.1, period: 6.7 },
    yaw: { amp: 0.17, period: 8.1 },
    /** extra wobble at the start, decaying over `hover * 2.2` s */
    instability: 2.4,
  },

  // ---- fabric ----
  /** hem/hijab travel in sprite px at full airflow, wave number, wave speed, and base-to-full airflow range */
  cloth: { amp: 15, k: 0.055, w: 3.4, calm: 0.3, ripple: 0.85 },
  /** drift of the layered flutter against the body (s), the lag fabric has behind it */
  clothPace: 1.0,

  // ---- sky layers (see SKY_LAYERS) ----
  /** radial (zoom) motion-blur length on the cloud layers, scaled by speed */
  blur: 0.09,
}

/**
 * The 3D depth system. Each cloud layer is a stack of "slices" flying toward the camera: a slice starts far (small, faint),
 * grows as 1/z, and fades out as it passes the lens while the next one takes its place, so there is no loop point or pop.
 * Depth position is a pure function of the distance fallen (`travel`).
 */
export const DEPTH = {
  /** depth cycles per unit of `travel` for a layer of speed 1: higher = clouds rush faster per scroll distance */
  rate: 0.2,
  /** where the sky radiates from (fraction of the viewport height, 0 = top) and how far the camera sways (fraction of vw) */
  vanishY: 0.4,
  sway: 0.035,
  /** how much the distant backdrop swells over the whole fall (fraction) */
  backdropGrow: 0.45,
  /** wind streaks: how many (behind her, in front), outward cycles per unit of `travel`, and overall strength */
  streaks: { back: 60, front: 40, rate: 0.16, alpha: 1 },
}

/** Sprite geometry, in the px of falling-girl.webp (354 x 427). */
export const FALLER = {
  w: 354,
  h: 427,
  /** her body as a stick figure [x, y, radius]: fabric within the radius stays rigid, beyond it is free to blow */
  skeleton: [
    [[128, 82, 52], [160, 170, 62], [190, 255, 66]], // head, torso
    [[105, 120, 22], [58, 130, 16], [20, 125, 28]], // left arm, out to the hand
    [[190, 80, 18], [214, 48, 14], [228, 22, 22]], // right arm, out to the hand
    [[195, 255, 40], [250, 205, 32], [286, 195, 54]], // upper leg, out to the big shoe
    [[188, 292, 30], [212, 350, 26], [228, 385, 40]], // lower leg, to the near shoe
  ],
  /** distance (px) over which the fabric goes from rigid to fully loose */
  looseSpan: 55,
  /**
   * limbs that swing about a joint: `from` the pivot, `to` the tip, rigid core `r`, angle `amp` (rad), swing `period` (s),
   * phase, `rest` (rad) the pose at the start of the fall that relaxes to 0, and `lag` (s) behind the body
   */
  limbs: [
    { from: [105, 122], to: [14, 124], r: 24, amp: 0.1, period: 3.1, phase: 0.0, rest: 0.22, lag: 0.12 },
    { from: [190, 80], to: [230, 18], r: 20, amp: 0.13, period: 2.6, phase: 1.7, rest: -0.2, lag: 0.2 },
    { from: [195, 255], to: [292, 190], r: 44, amp: 0.07, period: 3.7, phase: 3.1, rest: 0.18, lag: 0.3 },
    { from: [186, 290], to: [230, 388], r: 34, amp: 0.1, period: 2.9, phase: 4.6, rest: -0.16, lag: 0.4 },
  ],
}

/**
 * Her path on screen, keyed by fall progress (0-1): y (fractions of her height from screen centre, positive = lower),
 * x (px), tilt (deg), scale (she grows a little as she drops toward the camera). `start` is how far along the path she
 * already is when the fall begins (the dream wave covers it); the rest is driven by the fall's scroll.
 */
export const PATH = {
  start: 0.1,
  keys: [
    { at: 0, y: -0.22, x: 0, r: -6, s: 0.8 },
    { at: 0.2, y: -0.12, x: -20, r: 3, s: 0.86 },
    { at: 0.45, y: 0.0, x: 16, r: -4, s: 0.96 },
    { at: 0.7, y: 0.12, x: -10, r: 5, s: 1.04 },
    { at: 1, y: 0.22, x: 8, r: 0, s: 1.1 },
  ],
}

/**
 * The cloud layers, far to near (the photo itself is the backdrop behind them). Per layer: `scale` size of one tile of the
 * photo (relative to covering the viewport), `speed` how fast its slices approach (x DEPTH.rate), `zFar`/`zNear` the slice's
 * distance at the start and end of its life (apparent size = 1/z, so near layers swell much more), `slices` how many are in
 * flight, `phase` its depth offset, `alpha`, `mask` = clouds only (blue is transparent), `hole` = fades out over her body.
 */
export const SKY_LAYERS = [
  { scale: 1.45, speed: 0.4, zFar: 3.2, zNear: 0.85, slices: 2, phase: 0.0, alpha: 0.5, front: false, hole: 0 },
  { scale: 2.0, speed: 0.85, zFar: 3.2, zNear: 0.5, slices: 2, phase: 0.31, alpha: 0.72, front: false, hole: 0 },
  { scale: 2.6, speed: 1.7, zFar: 3.0, zNear: 0.28, slices: 2, phase: 0.62, alpha: 0.85, front: true, hole: 1 },
]

const TWO_PI = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export interface FallFrame {
  /** virtual seconds into the fall (from the scroll; 0 before it starts) */
  s: number
  /** current phase */
  phase: 'A' | 'B' | 'C' | 'D'
  /** normalised speed, 0..~1.3 */
  u: number
  /** accumulated distance, in viewport heights at terminal speed */
  travel: number
  /** the time the fabric flutter has run (s), faster when the air is faster */
  clothT: number
  /** airflow on her clothes, 0..1 */
  air: number
  /** instability, 1 at the start, relaxing to 0 */
  instab: number
  /** camera shake offset, fractions of the viewport height */
  shake: [number, number]
  /** camera roll (rad) and zoom factor for the sky */
  camRoll: number
  zoom: number
  /** her body: roll (rad), pitch and yaw (rad) */
  roll: number
  pitch: number
  yaw: number
  /** limb swing angles (rad), one per FALLER.limbs */
  limbs: number[]
}

/**
 * The motion model: `at(f)` gives the whole state of the fall for progress f (0-1). Pure and stateless: the same f always
 * gives the same frame, so scrolling is exactly reversible and nothing advances when the page is still. A drag-limited
 * fall, with the body and camera reacting to it.
 */
export function createFallDynamics() {
  const C = FALL_CONFIG

  return {
    /** @param f fall progress 0..1 (from the scroll); above 1 the fall carries on, for the landing's approach */
    at(f: number): FallFrame {
      // past 1 the clock runs on (the landing's approach keeps the sky moving, slowing to a stop)
      const s = Math.max(0, f) * C.duration
      const clock = s

      // drag-limited acceleration: tanh rises from rest and flattens at terminal speed
      const t = Math.max(0, s - C.hover)
      const base = Math.tanh(t / C.accel)
      const u = C.hoverDrift * (1 - base) + base
      // distance fallen = the integral of u, in closed form so no state accumulates
      const dist = C.hoverDrift * s + (1 - C.hoverDrift) * C.accel * Math.log(Math.cosh(t / C.accel))
      const travel = C.terminalSpeed * dist

      const instab = Math.exp(-s / (C.hover * 2.2))
      const air = clamp(C.cloth.calm + (1 - C.cloth.calm) * Math.min(1, u), 0, 1)
      // the fabric flutter's clock: it runs at 0.5 + 1.6u, integrated
      const clothT = 0.5 * s + 1.6 * dist

      // body: slow incommensurate waves, bigger while unstable
      const b = C.body, k = 1 + b.instability * instab
      const roll = (Math.sin((clock / b.roll.period) * TWO_PI) * 0.7 + Math.sin((clock / (b.roll.period * 0.43)) * TWO_PI + 1) * 0.3) * b.roll.amp * k * (Math.PI / 180)
      const pitch = Math.sin((clock / b.pitch.period) * TWO_PI + 0.6) * b.pitch.amp * (0.7 + 0.5 * k)
      const yaw = Math.sin((clock / b.yaw.period) * TWO_PI + 2.1) * b.yaw.amp * (0.7 + 0.5 * k)

      // limbs react before the body settles (they lead the instability), then keep a lagged, believable sway
      const limbs = FALLER.limbs.map((l) => {
        const tt = clock - l.lag
        const sway = Math.sin((tt / l.period) * TWO_PI + l.phase) * 0.65 + Math.sin((tt / (l.period * 0.37)) * TWO_PI + l.phase * 1.7) * 0.35
        return l.amp * sway * (0.5 + 0.5 * air + instab * 0.8) + l.rest * instab
      })

      const sh = C.shake, shakeAmp = sh.amp * Math.exp(-s / sh.decay) * Math.min(1, s / 0.05)
      const trem = C.tremor * u
      const shake: [number, number] = [
        (Math.sin(clock * sh.freq) * shakeAmp + Math.sin(clock * 53) * trem) * 0.6,
        Math.sin(clock * sh.freq * 1.31 + 1.7) * shakeAmp + Math.sin(clock * 61 + 2) * trem,
      ]

      const phase = u >= C.phases.D ? 'D' : u >= C.phases.C ? 'C' : s > C.hover ? 'B' : 'A'
      return {
        s, phase, u, travel, clothT, air, instab, shake,
        camRoll: roll * C.roll.follow + Math.sin((clock / C.roll.period) * TWO_PI) * C.roll.sky * (Math.PI / 180) * (0.4 + 0.6 * u),
        zoom: 1 + C.zoom * u,
        roll, pitch, yaw, limbs,
      }
    },
  }
}

// ---- sky layer shader ----
// One full-viewport quad per cloud slice. The photo is tiled with mirrored repeats (never a seam), magnified by `uZoom`
// about the vanishing point (clouds swell and stream outward toward the edges as they approach), smeared radially for
// zoom blur, and (for the layers in front of her) faded out over her body so bright cloud never hides her face.
export const SKY_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uModelViewMatrix, uProjectionMatrix;
varying vec2 vTexCoord;
void main() {
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
  vTexCoord = aTexCoord;
}`

export const SKY_FRAG = `
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes, uCentre, uTile, uOff;
uniform float uRot, uBlur, uAlpha, uMask, uHole, uZoom;
uniform vec4 uGirl;
varying vec2 vTexCoord;
const int TAPS = 6;
void main() {
  vec2 pix = vTexCoord * uRes;
  float cr = cos(uRot), sr = sin(uRot);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < TAPS; i++) {
    float k = float(i) / float(TAPS - 1) - 0.5;
    vec2 d = (pix - uCentre) / (uZoom * (1.0 + uBlur * k));
    vec2 r = vec2(cr * d.x + sr * d.y, -sr * d.x + cr * d.y);
    vec2 uv = (r + uOff) / uTile + 0.5;
    uv = 1.0 - abs(1.0 - mod(uv, 2.0));
    vec4 c = texture2D(uTex, uv);
    float a = uMask > 0.5 ? smoothstep(0.4, 0.86, c.r) : 1.0;
    acc += vec4(c.rgb * a, a);
  }
  acc *= uAlpha / float(TAPS);
  vec2 g = (pix - uGirl.xy) / uGirl.zw;
  acc *= mix(1.0, smoothstep(0.55, 1.2, length(g)), uHole);
  gl_FragColor = acc;
}`
