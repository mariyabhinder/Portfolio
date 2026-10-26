// The jumps: once she stands and the platforms are in place she hops down the diagonal staircase, cloud 1 -> 2 -> 3 -> 4, one jump
// per third of the jump's scroll (state.jump, 0-1). Like the rest of the dream there is no clock: the frame is a pure function of
// the scroll progress, so stopping freezes her mid-air, scrolling up runs the jump backwards, and she never moves on her own.
// After the third landing the progress is clamped: nothing more happens.
//
// Each jump (local progress u, 0-1) is one timeline:
//   0.00 - 0.20  A  PREPARE   stand -> crouch (jump1.webp): knees bend, she leans forward; both feet stay on the cloud
//   0.20 - 0.32  B  TAKE-OFF  crouch -> push-off (jump2.webp); she leaves the cloud at AIR[0]
//   0.32 - 0.68  C  MIDAIR    jump2 -> jump3 -> jump4 along a curved path from her cloud's standing point to the next one's
//   0.68 - 0.84  D  LANDING   jump4 -> crouch (feet reach the cloud at AIR[1]), the cloud gives a little
//   0.84 - 1.00  D  SETTLE    crouch -> stand (end.webp)
//
// The pictures are flat illustrations, so the poses are cross-dissolved, each at its own scale, all on the same face point (her
// head never slides across her face). The face point is placed from the ground point she stands on and the picture's own
// face-to-feet vector, so her feet sit exactly on the cloud's standing point while she is in a standing or crouching picture.

import jump1Url from '@/assets/meadow/jump1.webp'
import jump2Url from '@/assets/meadow/jump2.webp'
import jump3Url from '@/assets/meadow/jump3.webp'
import jump4Url from '@/assets/meadow/jump4.webp'
import endUrl from '@/assets/meadow/end.webp'

export const JUMP_CONFIG = {
  /** extra scroll length for ALL the jumps, in viewport heights (each of the three gets a third) */
  scrollVh: 450,
  /** number of jumps (clouds - 1) */
  jumps: 3,
  /** the key pictures in order: stand, crouch, push-off, midair, descent, crouch, stand (indexes into POSES) */
  sequence: [0, 1, 2, 3, 4, 1, 0],
  /** the local progress (0-1) at which each key picture is fully shown */
  keyTimes: [0, 0.2, 0.32, 0.5, 0.68, 0.84, 1],
  /** the part of the jump she is off the ground: [take-off, touch-down] (local progress) */
  air: [0.27, 0.8] as [number, number],
  /** the arc's height as a fraction of the jump's length (never less than `minArc` of her height) */
  arc: 0.32,
  minArc: 0.55,
  /** where she stands on a platform, as a fraction of its drawn size from its centre */
  stand: [0, 0.0] as [number, number],
  /** the pose pictures cross-dissolve over these spans of each transition (fade-in, fade-out of the old one) */
  morph: { fadeIn: [0, 0.7] as [number, number], fadeOut: [0.6, 1] as [number, number] },
}

/**
 * The pictures, in their own px. `face` is her face point and `feet` the point that stands on the ground (the lowest point of her
 * shoes); `scale` is the picture's size relative to the standing picture (end.webp) so her head stays the same size throughout.
 */
export const JUMP_POSES = [
  { key: 'stand', url: endUrl, w: 218, h: 463, face: [65, 72], feet: [148, 432], scale: 1 },
  { key: 'crouch', url: jump1Url, w: 169, h: 238, face: [112, 68], feet: [97, 228], scale: 1.15 },
  { key: 'push', url: jump2Url, w: 259, h: 388, face: [148, 78], feet: [168, 298], scale: 1.1 },
  { key: 'air', url: jump3Url, w: 259, h: 388, face: [150, 82], feet: [170, 310], scale: 1.1 },
  { key: 'descend', url: jump4Url, w: 259, h: 388, face: [153, 85], feet: [170, 320], scale: 1.1 },
]

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const ease = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * t * (t * (t * 6 - 15) + 10) }

export interface JumpFrame {
  /** which jump (0-2) and its local progress (0-1) */
  stage: number
  u: number
  /** the point of the ground (viewport px) her feet stand on or fly over, her height above it already included in `lift` */
  ground: [number, number]
  /** how far she is off the ground path (px, up is negative), already part of `feet` */
  lift: number
  /** where her feet are (viewport px) */
  feet: [number, number]
  /** the two key pictures being blended (indexes into JUMP_POSES) and how far (0-1) */
  from: number
  to: number
  mix: number
  /** how far each cloud (1-4) is pressed (0-1) */
  press: number[]
  /** 0 until she has left her first cloud, then 1: cloud 1's dent and shadow fade with it */
  leave: number
}

/**
 * The jump's frame for progress j (0-1). `spots` are the standing points of the four clouds (viewport px), `h` her height (px)
 * for the minimum arc. Pure and stateless.
 */
export function jumpAt(j: number, spots: [number, number][], h: number): JumpFrame {
  const C = JUMP_CONFIG
  const jj = clamp(j, 0, 1) * C.jumps
  const stage = Math.min(C.jumps - 1, Math.floor(jj))
  const u = jj - stage
  const a = spots[stage], b = spots[stage + 1]

  // the airborne fraction s: the path between the two standing points, a little eased at each end so she doesn't snap into motion
  const s = clamp((u - C.air[0]) / (C.air[1] - C.air[0]), 0, 1)
  const along = lerp(s, smooth(0, 1, s), 0.35)
  const gx = lerp(a[0], b[0], along), gy = lerp(a[1], b[1], along)
  const arc = Math.max(C.arc * Math.hypot(b[0] - a[0], b[1] - a[1]), C.minArc * h)
  const lift = -arc * Math.sin(Math.PI * s)

  // which pictures: the sequence's key times, each transition eased
  const T = C.keyTimes
  let q = 0
  for (let i = 0; i < T.length - 1; i++) q += ease(T[i], T[i + 1], u)
  const k = clamp(Math.floor(q), 0, T.length - 2)

  // the clouds give under her feet while she crouches to jump and as she lands
  const press = [0, 0, 0, 0]
  press[stage] = Math.max(press[stage], ease(0, 0.2, u) * (1 - ease(0.2, 0.3, u)) * 0.6)
  const c = clamp((u - C.air[1]) / (1 - C.air[1]), 0, 1)
  press[stage + 1] = Math.max(press[stage + 1], Math.sin(Math.PI * c) * (1 - 0.35 * c))

  return {
    stage, u, ground: [gx, gy], lift, feet: [gx, gy + lift],
    from: C.sequence[k], to: C.sequence[k + 1], mix: clamp(q - k, 0, 1),
    press, leave: stage > 0 ? 1 : smooth(0.2, 0.3, u),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createJump(p: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let imgs: any[] | null = null
  let disposed = false

  async function load() {
    const out = await Promise.all(JUMP_POSES.map((P) => p.loadImage(P.url)))
    if (!disposed) imgs = out
  }

  /**
   * draws her for frame f. `base` is the standing picture's size on screen (viewport px per picture px). Each picture is placed
   * so its feet point is at the frame's feet; between two pictures the face point is the blend of both, so nothing slides.
   */
  function draw(f: JumpFrame, base: number) {
    if (!imgs) return
    const MO = JUMP_CONFIG.morph
    const A = JUMP_POSES[f.from], B = JUMP_POSES[f.to]
    const vec = (P: typeof A): [number, number] => [(P.face[0] - P.feet[0]) * P.scale * base, (P.face[1] - P.feet[1]) * P.scale * base]
    const va = vec(A), vb = vec(B)
    const fx = f.feet[0] + lerp(va[0], vb[0], f.mix), fy = f.feet[1] + lerp(va[1], vb[1], f.mix)
    p.push()
    p.noStroke()
    const layer = (i: number, a: number) => {
      if (a <= 0.003) return
      const P = JUMP_POSES[i], sc = P.scale * base
      p.tint(255, 255 * a)
      p.image(imgs![i], fx - P.face[0] * sc, fy - P.face[1] * sc, P.w * sc, P.h * sc)
    }
    // the old picture stays whole under the next as it fades in, then fades out so none of it is left hanging
    if (f.mix < 0.999) layer(f.from, 1 - smooth(MO.fadeOut[0], MO.fadeOut[1], f.mix))
    if (f.mix > 0.001) layer(f.to, smooth(MO.fadeIn[0], MO.fadeIn[1], f.mix))
    p.noTint()
    p.pop()
  }

  return { load, draw, get ready() { return !!imgs }, dispose() { disposed = true } }
}
