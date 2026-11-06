// Starry eyes (shiitake-me) in the fall's face close-up (storyboard frame 10): once the camera has pushed in on her face, a six-rayed
// star glint pops into each iris, then holds steady, with a soft twinkle every few seconds, for as long as the close-up lasts.
//
// The pop plays in real time (not on the scroll), once each time the close-up settles; the glints fade with the close-up. They are drawn
// over her falling picture in its own px (falling-girl.webp at 354 x 427, FALLER in fall.ts), in the same transform, so they stay on
// her eyes. The face is rigid in the fabric mesh (inside the head's radius in FALLER.skeleton), so nothing under them moves.
// meadow.ts calls `sparkleAt` for the pop and `drawSparkle` to paint it.

/** Everything tunable, in px of the falling picture and in seconds. */
export const SPARKLE = {
  /** each eye: the centre of its iris, the ray length, a phase for its twinkle, and its pop delay (s) */
  eyes: [
    { x: 115.7, y: 75.1, len: 4.8, phase: 1.9, delay: 0.08 },
    { x: 138, y: 68.5, len: 5.3, phase: 0, delay: 0 },
  ],
  /** the close-up has to be this settled (0-1) to start the pop, and back below `rearm` before it can pop again */
  trigger: 0.9,
  rearm: 0.05,
  /** seconds the pop takes */
  pop: 0.22,
  /** now and then a soft twinkle: every `every` s, lasting `dur` s, swelling the star by `amount` */
  twinkle: { every: 3.2, dur: 0.35, amount: 0.18 },
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** overshoots a little past 1 before settling: the pop */
const backOut = (x: number) => {
  const c = 1.9
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2
}

/** the occasional twinkle (0 most of the time, a brief bump up to 1) for an eye with phase `ph` */
function twinkle(t: number, ph: number) {
  const T = SPARKLE.twinkle, k = ((t + ph) % T.every) / T.dur
  return k < 1 ? Math.sin(k * Math.PI) ** 2 : 0
}

/** each eye's glint scale at `t` seconds since the pop started (0 before it) */
export const sparkleAt = (t: number) => SPARKLE.eyes.map((e) => {
  const k = clamp01((t - e.delay) / SPARKLE.pop)
  return k > 0 ? backOut(k) : 0
})

// a slim four-pointed sparkle (the little "+" glints beside the star)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function plus(p: any, x: number, y: number, r: number, a: number) {
  if (r <= 0.05 || a <= 0.01) return
  p.fill(255, 255, 255, 255 * a)
  for (const [dx, dy] of [[0, 1], [1, 0]]) {
    p.beginShape()
    p.vertex(x - dx * r, y - dy * r)
    p.vertex(x + dy * r * 0.18, y + dx * r * 0.18)
    p.vertex(x + dx * r, y + dy * r)
    p.vertex(x - dy * r * 0.18, y - dx * r * 0.18)
    p.endShape(p.CLOSE)
  }
}

/**
 * Paints the glints over her falling picture: call it inside the transform the picture was drawn in (its own px), after it.
 * `scales` is from sparkleAt, `alpha` fades them (with the close-up), `t` the real time (s) for the twinkle.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function drawSparkle(p: any, scales: number[], alpha: number, t: number) {
  if (alpha <= 0.003) return
  // flat layers painted over each other at the same depth: no depth test, or each layer would hide behind the one before
  const gl = p.drawingContext as WebGLRenderingContext
  gl.disable(gl.DEPTH_TEST)
  p.push()
  p.noStroke()
  SPARKLE.eyes.forEach((G, n) => {
    const s = scales[n]
    if (s <= 0.01) return
    const a = alpha, b = twinkle(t, G.phase), tw = 1 + SPARKLE.twinkle.amount * b
    p.push()
    p.translate(G.x, G.y)
    p.rotate(0.35 + G.phase + 0.25 * b)
    // six thin rays (three long diamonds through the centre, one longest), a soft wide pass under a sharp one
    for (const [len, wid, op] of [[G.len * 1.15, 0.9, 0.25], [G.len, 0.4, 1]]) {
      p.fill(255, 255, 255, 255 * a * op)
      for (let i = 0; i < 3; i++) {
        p.push()
        p.rotate((i * Math.PI) / 3 + (i === 1 ? 0.12 : 0))
        const L = len * s * tw * (i === 0 ? 1 : 0.78)
        p.beginShape()
        p.vertex(0, -L)
        p.vertex(wid * s, 0)
        p.vertex(0, L)
        p.vertex(-wid * s, 0)
        p.endShape(p.CLOSE)
        p.pop()
      }
    }
    // the bright core
    p.fill(255, 255, 255, 120 * a)
    p.ellipse(0, 0, 2.8 * s, 2.8 * s, 24)
    p.fill(255, 255, 255, 255 * a)
    p.ellipse(0, 0, 1.5 * s, 1.5 * s, 20)
    p.pop()
    // little "+" glints beside it, twinkling out of step
    plus(p, G.x + 4, G.y - 3.6, 1.2 * s * (0.75 + 0.35 * b), a)
    plus(p, G.x - 3, G.y + 2.6, 0.75 * s * (0.75 + 0.35 * b), a * 0.8)
  })
  p.pop()
  gl.enable(gl.DEPTH_TEST)
}
