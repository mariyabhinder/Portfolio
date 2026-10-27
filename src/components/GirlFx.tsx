import { useEffect, useRef, type CSSProperties } from 'react'
import type { GirlAnchor } from './meadow/meadow'

// The DOM effects around the girl once she has landed on the About Me surface: the cartoon dizzy loops and stars above her head, the
// thought bubble. The p5 scene (meadow/touch.ts) reports where her head is every frame
// (a GirlAnchor, viewport px); this component only moves CSS variables, so React does not re-render per frame and there is no second
// scroll or animation loop here.
//
// Everything is a function of the anchor (scroll-driven: where she is, whether she has landed / settled): scrolling back hides the effects.

export const BUBBLE_CONFUSED = 'Wait… who am I again?'

const STARS = [
  { r: 0.95, size: 15, dur: 7.5, at: 0.0, twinkle: 2.1 },
  { r: 0.78, size: 11, dur: 6.2, at: 0.26, twinkle: 1.7 },
  { r: 1.0, size: 12, dur: 8.6, at: 0.52, twinkle: 2.6 },
  { r: 0.7, size: 9, dur: 5.6, at: 0.74, twinkle: 1.9 },
  { r: 0.88, size: 13, dur: 9.4, at: 0.9, twinkle: 2.3 },
]
// the loops: tilt (deg), sway seconds x3 (sign = direction), rx/ry as a share of the box, and a hand-drawn wobble seed
const LOOPS = [
  { tilt: -9, spin: 16, rx: 0.46, ry: 0.2, seed: 1 },
  { tilt: 14, spin: -22, rx: 0.4, ry: 0.15, seed: 2 },
  { tilt: 38, spin: 30, rx: 0.33, ry: 0.11, seed: 3 },
]

/** an ellipse as a slightly imperfect hand-drawn loop: wobbly radius and its ends missing each other a little */
function loopPath(rx: number, ry: number, seed: number) {
  const pts: string[] = []
  const n = 36
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2 * 1.04
    const w = 1 + 0.035 * Math.sin(t * 3 + seed) + 0.02 * Math.sin(t * 5 + seed * 2.1)
    pts.push(`${i ? 'L' : 'M'}${(100 + Math.cos(t) * rx * 200 * w).toFixed(2)} ${(50 + Math.sin(t) * ry * 200 * w + (i / n) * 1.2).toFixed(2)}`)
  }
  return pts.join(' ')
}

const starPoints = '0,-10 2.9,-3.4 10,-3.1 4.4,1.4 6.2,8.4 0,4.4 -6.2,8.4 -4.4,1.4 -10,-3.1 -2.9,-3.4'

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

interface Props {
  /** GirlFx hands DreamLanding the function that moves it; null when it unmounts */
  register: (update: ((a: GirlAnchor | null) => void) | null) => void
}

export default function GirlFx({ register }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current!
    const bubble = bubbleRef.current!
    // the bubble's size is read when it changes, not every frame
    let bw = 280, bh = 70
    const measure = () => {
      bw = bubble.offsetWidth
      bh = bubble.offsetHeight
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(bubble)

    const set = (k: string, v: string | number) => root.style.setProperty(k, String(v))
    const update = (a: GirlAnchor | null) => {
      if (!a) {
        set('--landed', 0)
        set('--seated', 0)
        return
      }
      const vw = root.clientWidth, hx = a.face[0], hw = a.headW
      set('--hx', hx.toFixed(1))
      // the loops' centre sits just above her hijab
      set('--dy', (a.headTop - hw * 0.22).toFixed(1))
      set('--hw', hw.toFixed(1))
      set('--landed', a.landed.toFixed(3))
      set('--seated', a.seated.toFixed(3))
      // the bubble sits above and to the left of her head (her face stays clear), inside the viewport; its tail leans toward her
      const tail = 40
      const bx = clamp(hx + hw * 0.2 - bw * 0.82, 12, Math.max(12, vw - bw - 12))
      const by = Math.max(12, a.headTop - hw * 0.62 - tail - bh)
      set('--bx', bx.toFixed(1))
      set('--by', by.toFixed(1))
      const tx = clamp(hx - bx, 28, Math.max(28, bw - 28))
      set('--tx', tx.toFixed(1))
      set('--td', clamp(hx - bx - tx, -30, 30).toFixed(1))
    }
    register(update)
    return () => {
      register(null)
      ro.disconnect()
    }
  }, [register])

  return (
    <div ref={rootRef} className="girl-fx">
      {/* the cartoon dizzy effect: loops and stars */}
      <div className="girl-dizzy" aria-hidden="true">
        <svg className="girl-loops" viewBox="0 0 200 100">
          {LOOPS.map((l, i) => (
            <path key={i} d={loopPath(l.rx, l.ry, l.seed)} style={{ '--tilt': `${l.tilt}deg`, '--spin': `${Math.abs(l.spin) / 3}s`, '--dir': l.spin < 0 ? 'reverse' : 'normal' } as CSSProperties} />
          ))}
        </svg>
        <div className="girl-orbits">
          {STARS.map((s, i) => (
            <span key={i} className="girl-orbit" style={{ '--dur': `${s.dur}s`, '--at': `${-s.at * s.dur}s` } as CSSProperties}>
              <span className="girl-star-pos" style={{ '--r': s.r } as CSSProperties}>
                <svg className="girl-star" viewBox="-12 -12 24 24" style={{ width: s.size, height: s.size, '--tw': `${s.twinkle}s` } as CSSProperties}>
                  <polygon points={starPoints} />
                </svg>
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* the thought bubble */}
      <div ref={bubbleRef} className="girl-bubble" role="status">
        <p className="girl-bubble-text">{BUBBLE_CONFUSED}</p>
        <i className="girl-bubble-dot girl-bubble-dot-1" />
        <i className="girl-bubble-dot girl-bubble-dot-2" />
        <i className="girl-bubble-dot girl-bubble-dot-3" />
      </div>
    </div>
  )
}
