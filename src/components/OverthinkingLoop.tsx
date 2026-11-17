// A boy lying on his back, seen from above. One hand-drawn line leaves his head, spirals out until it
// fills the space around him, then retraces the exact same path back into his head. Loops forever.
//
// Tweak the look via the constants below; the animation timing lives in the <style> block.

const INK = '#1c2370' // deep navy
const STROKE = 3.4
const VIEW = { w: 600, h: 720 }
const HEAD = { x: 300, y: 360 } // spiral origin = centre of the head
const TURNS = 24 // how many loops the line makes
const SPACING = 11.6 // distance between loops
const Y_STRETCH = 1.21 // makes the spiral fit the portrait frame
const TILT = (-28 * Math.PI) / 180 // body rotation around the head
const DURATION = '17s'

type P = { x: number; y: number }

// Body is drawn in "local" coordinates (head at 300,330) then rotated/moved by this transform.
const BODY_TRANSFORM = `translate(0 ${HEAD.y - 330}) rotate(${(TILT * 180) / Math.PI} 300 330)`
const toGlobal = (x: number, y: number): P => {
  const dx = x - 300
  const dy = y - 330
  return {
    x: 300 + dx * Math.cos(TILT) - dy * Math.sin(TILT),
    y: 330 + dx * Math.sin(TILT) + dy * Math.cos(TILT) + (HEAD.y - 330),
  }
}

// Rough skeleton of the body: the spiral bends around these capsules instead of crossing the boy.
const CAPSULES = (
  [
    [300, 368, 300, 440, 40], // torso
    [276, 448, 270, 535, 24], // left leg
    [324, 448, 330, 535, 24], // right leg
    [236, 362, 175, 376, 14], // left arm
    [364, 362, 425, 376, 14], // right arm
  ] as const
).map(([x1, y1, x2, y2, r]) => ({ a: toGlobal(x1, y1), b: toGlobal(x2, y2), r }))

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

const GAP = 15 // empty space kept around the body
const FALLOFF = 72 // how far the body's influence reaches

function bendAroundBody(p: P): P {
  let best = { sd: Infinity, qx: 0, qy: 0, d: 0 }
  for (const { a, b, r } of CAPSULES) {
    const vx = b.x - a.x
    const vy = b.y - a.y
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy)))
    const qx = a.x + vx * t
    const qy = a.y + vy * t
    const d = Math.hypot(p.x - qx, p.y - qy)
    if (d - r < best.sd) best = { sd: d - r, qx, qy, d }
  }
  if (best.sd >= FALLOFF) return p
  // Squeeze the loops into the free space (order is preserved, so lines never merge).
  const s = Math.max(best.sd, 0)
  const shift = GAP + (s * (FALLOFF - GAP)) / FALLOFF - best.sd
  const w = smooth(33, 50, Math.hypot(p.x - HEAD.x, p.y - HEAD.y)) // leave the curl inside the head alone
  const nx = best.d > 0.001 ? (p.x - best.qx) / best.d : 0
  const ny = best.d > 0.001 ? (p.y - best.qy) / best.d : 1
  return { x: p.x + nx * shift * w, y: p.y + ny * shift * w }
}

// One continuous, slightly wobbly spiral: head -> outwards.
const SPIRAL = (() => {
  const pts: P[] = []
  const end = Math.PI * 2 * TURNS
  for (let th = 0; th <= end; th += 0.1) {
    const k = smooth(0, 4, th) // imperfections fade in so the start stays tidy
    const r =
      (SPACING * th) / (Math.PI * 2) +
      k * (2.6 * Math.sin(0.83 * th + 0.6) + 1.8 * Math.sin(1.9 * th + 2.1) + 0.8 * Math.sin(4.7 * th))
    const cx = HEAD.x + k * 5.5 * Math.sin(0.21 * th + 1)
    const cy = HEAD.y + k * 5.5 * Math.sin(0.17 * th + 3)
    pts.push(bendAroundBody({ x: cx + r * Math.cos(th), y: cy + r * Y_STRETCH * Math.sin(th) }))
  }
  const f = (n: number) => n.toFixed(1)
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }
    d += `Q${f(pts[i].x)} ${f(pts[i].y)} ${f(m.x)} ${f(m.y)}`
  }
  return d
})()

const CSS = `
.ot{width:100%;max-width:380px;margin:0 auto}
.ot svg{display:block;width:100%;height:auto;overflow:hidden}
.ot-line{stroke-dasharray:.0001 2;animation:ot-loop ${DURATION} infinite}
@keyframes ot-loop{
  0%{stroke-dasharray:.0001 2;animation-timing-function:cubic-bezier(.45,.05,.55,.95)}
  46%{stroke-dasharray:1 2}
  54%{stroke-dasharray:1 2;animation-timing-function:cubic-bezier(.45,.05,.55,.95)}
  100%{stroke-dasharray:.0001 2}
}
@media(prefers-reduced-motion:reduce){.ot-line{animation:none;stroke-dasharray:none}}
`

export default function OverthinkingLoop({ className = '' }: { className?: string }) {
  return (
    <div className={`ot ${className}`.trim()}>
      <style>{CSS}</style>
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        role="img"
        aria-label="A boy lying on the floor while a single line of thought spirals out of his head, around him, and back in again"
      >
        <g fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round">
          {/* the boy (rotated around his head) */}
          <g transform={BODY_TRANSFORM}>
            <path d="M270 352 Q300 366 330 352 L368 366 Q372 372 368 380 L344 384 L340 440 Q300 450 260 440 L256 384 L232 380 Q228 372 232 366 Z" />
            <path d="M234 368 L178 372 Q168 374 170 384 Q176 392 186 388 L236 380" />
            <path d="M366 368 L422 372 Q432 374 430 384 Q424 392 414 388 L364 380" />
            <path d="M262 440 L254 536 Q270 546 286 538 L300 478 L314 538 Q330 546 346 536 L338 440" />
          </g>
          {/* head */}
          <path d="M268 358 C267 340 284 328 301 328 C320 327 333 343 332 361 C331 379 316 392 299 391 C281 391 269 377 268 358Z" />
          {/* the single thought line */}
          <path className="ot-line" d={SPIRAL} pathLength={1} />
        </g>
      </svg>
    </div>
  )
}
