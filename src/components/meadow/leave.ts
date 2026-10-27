// Leaving the dream: once she has landed on the cloud and opened her eyes, a second dream wave (the same dust shader as the first,
// in meadow.ts) breaks the cloud scene apart and reveals the plain About Me background behind it, with her already falling into it.
// The touchdown (touch.ts) then carries her the rest of the way down. Like the rest of the dream it has no clock: the wave's position
// is a pure function of the scroll progress (state.leave, 0-1).

import { DROP_CONFIG, DROP_POSES } from './drop'
import type { DropFrame } from './drop'

export const LEAVE_CONFIG = {
  /** extra scroll length for the wave, in viewport heights */
  scrollVh: 300,
  /** where her face is as the About Me background is revealed (fractions of the viewport) */
  face: [0.78, 0.36] as [number, number],
  /** how strong the wind lines past her are as she is revealed, already falling */
  speed: 0.3,
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * The frame the touchdown starts from (in place of the old drop's last frame): her upright falling picture on the right of the
 * About Me background, sized so her fastest falling picture would fill DROP_CONFIG.rest.height of the viewport. Pure and stateless.
 */
export function leaveFrame(vw: number, vh: number): DropFrame {
  const C = LEAVE_CONFIG
  const fast = DROP_POSES[3]
  const base = (DROP_CONFIG.rest.height * vh) / (fast.h * fast.scale)
  const halfW = (fast.w * 0.5 + 10) * fast.scale * base
  const x = clamp(C.face[0] * vw, DROP_CONFIG.minX * vw, vw * (1 - DROP_CONFIG.edge) - halfW)
  return {
    worldDy: 0, veilEdge: -vh, veilBand: 0,
    face: [x, C.face[1] * vh], base, roll: 0,
    from: 2, to: 2, mix: 1,
    speed: C.speed, travel: 0, cover: 1,
  }
}
