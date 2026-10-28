// Camera shots of the fall. Each shot owns its sprite, its rig (how fabric and limbs move) and its camera, and is a pure function of the
// fall's scroll progress, so scrolling back rewinds it exactly. meadow.ts only loops over SHOTS: to add the next angle, write another
// Shot below and append it to SHOTS (give it the next range of `fall`); nothing in an existing shot needs to change.
//
// Until later shots exist, the original falling picture (fall.ts) carries the fall on after the last shot, crossfading in over `fade`.

import sideUrl from '@/assets/meadow/sideview.webp'
import { FALLER, FALL_ASSETS, FALL_CONFIG, type FallFrame } from './fall'

export interface ShotPlace {
  /** centre of her on screen, in fractions of the viewport (0-1) */
  x: number
  y: number
  /** her height, as a fraction of the viewport height */
  h: number
  /** rotation (rad) and the 3D foreshortening turns (rad) */
  rot: number
  pitch: number
  yaw: number
  /** the camera's drift (fractions of the viewport): the sky slides by this, she follows it only a little */
  drift: [number, number]
  /** how much the distant backdrop has swelled as the camera closed in (multiplier, held after the shot) */
  bgZoom: number
  /** extra roll of the camera (rad): the sky turns by this, she does not */
  roll?: number
}

/** Where the picture before a shot is when the shot begins, and the viewport's aspect (width / height): what a shot has to start from. */
export interface ShotStart extends Pick<ShotPlace, 'x' | 'y' | 'h' | 'rot' | 'pitch' | 'yaw'> {
  aspect: number
}

export interface Shot {
  id: string
  sprite: string
  /** sprite size in px */
  w: number
  h: number
  /** fall progress (0-1) the shot covers, and the length over which the next picture crossfades in after it */
  range: [number, number]
  fade: number
  /** the length of fall progress over which the shot itself fades in over the picture before it (0 = it simply starts) */
  fadeIn?: number
  /** the last part of the range (0-1) over which the shot eases onto the picture that follows it, so the crossfade has nothing to ghost */
  handoff: number
  /** her body as a stick figure [x, y, radius] in sprite px: fabric within the radius stays rigid, beyond it is free to blow */
  skeleton: number[][][]
  looseSpan: number
  /** limbs that swing about a joint, in sprite px: pivot, tip, rigid core radius */
  limbs: { from: number[]; to: number[]; r: number }[]
  /** feather (fractions of the picture: left, top, right, bottom) where the picture is cropped by its frame rather than by her outline */
  edge?: number[]
  /** fabric flutter, in sprite px (see FALL_CONFIG.cloth) */
  cloth: { amp: number; k: number; w: number; calm: number; ripple: number }
  /** limb swing angles (rad), one per `limbs` */
  swing(s: number, air: number): number[]
  /** where she is and what the camera does, for progress `p` (0-1 through the shot) at virtual time `s` */
  place(p: number, s: number, from: ShotStart): ShotPlace
}

const TAU = Math.PI * 2
const DEG = Math.PI / 180
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const smooth = (t: number) => t * t * (3 - 2 * t)

/**
 * Shot 1, the wide establishing shot: the camera hangs well back, all of her in a lot of open sky, small and diagonal (head up and to
 * the right, shoes trailing down-left, dress and hijab streaming up and back). She accelerates down through the frame, turns slowly and
 * the camera creeps in on her as it drifts.
 */
export const WIDE_SHOT: Shot = {
  id: 'wide',
  sprite: FALL_ASSETS.girl,
  w: FALLER.w,
  h: FALLER.h,
  range: [0, 0.3],
  fade: 0.012,
  handoff: 0.35,
  // her body and limbs are the falling picture's own (fall.ts), so the same rig moves the same art
  skeleton: FALLER.skeleton,
  looseSpan: FALLER.looseSpan,
  limbs: FALLER.limbs,
  cloth: FALL_CONFIG.cloth,
  swing(s, air) {
    return FALLER.limbs.map((l) => {
      const t = s - l.lag
      const sway = Math.sin((t / l.period) * TAU + l.phase) * 0.65 + Math.sin((t / (l.period * 0.37)) * TAU + l.phase * 1.7) * 0.35
      return l.amp * sway * (0.6 + 0.6 * air)
    })
  },
  place(p, s) {
    // she accelerates down the frame (slow at first, quicker as the camera catches up) while the camera creeps in
    const fall = Math.pow(p, 1.4)
    const grow = smooth(p)
    const sway = Math.sin((s / 4.3) * TAU) * 0.012
    const rot =
      lerp(-9, 4, smooth(p)) * DEG + // a slow turn over the shot
      Math.sin((s / 3.6) * TAU + 0.5) * 4 * DEG +
      Math.sin((s / 1.7) * TAU + 1.9) * 1.3 * DEG
    return {
      x: lerp(0.6, 0.5, smooth(p)) + sway,
      y: lerp(0.3, 0.5, fall),
      h: lerp(0.3, 0.56, grow),
      rot,
      pitch: Math.sin((s / 5.1) * TAU + 0.6) * 0.1,
      yaw: Math.sin((s / 6.3) * TAU + 2.1) * 0.14,
      // the camera drifts, the sky slides by this much while she follows only a little
      drift: [Math.sin((s / 5.7) * TAU) * 0.014 + Math.sin((s / 2.3) * TAU) * 0.004, Math.cos((s / 4.9) * TAU + 1) * 0.01],
      bgZoom: lerp(1, 1.16, grow),
    }
  },
}

const DEFAULT_HEAD = { x: 128, y: 88 }

/**
 * Shot 2, the camera swings round to her side: the same fall, now seen in profile and much closer. The picture (sideview.webp) is a
 * different drawing, so the two are matched on her head: where the head is, how big it is and how it is turned are the wide shot's at
 * the first frame, so the crossfade sits on top of itself, and from there the camera closes in (the head grows ~4x, on a log curve so
 * the push feels steady), arcs sideways, rolls a little and settles with her profile filling the frame and sky around it.
 */
const SIDE = { w: 259, h: 388, head: [175, 165], ratio: 1.85 }
export const SIDE_SHOT: Shot = {
  id: 'side',
  sprite: sideUrl,
  w: SIDE.w,
  h: SIDE.h,
  range: [0.3, 0.7],
  fade: 0.1,
  fadeIn: 0.05,
  handoff: 0,
  // the head and shoulder: fabric near it holds its shape, the hijab's tail and the sleeves at the far side are free to blow
  skeleton: [[[178, 175, 78], [130, 250, 70], [70, 330, 70]]],
  looseSpan: 70,
  edge: [0.14, 0.1, 0, 0.1],
  limbs: [0, 1, 2, 3].map((i) => ({ from: [100 + i, 200], to: [100 + i, 260], r: 1 })),
  cloth: { amp: 6, k: 0.05, w: 3, calm: 0.3, ripple: 0.7 },
  swing: () => [0, 0, 0, 0],
  place(p, s, from) {
    // the move is done by two thirds of the way through the shot, and she then drifts in the close-up
    const e = smooth(clamp(p * 1.5, 0, 1)), a = from.aspect
    // the head of the wide picture on screen (in viewport heights), turned with her
    const k0 = from.h / FALLER.h
    const dx = DEFAULT_HEAD.x - FALLER.w / 2, dy = DEFAULT_HEAD.y - FALLER.h / 2
    const c = Math.cos(from.rot), sn = Math.sin(from.rot)
    const hx0 = from.x * a + k0 * (c * dx - sn * dy), hy0 = from.y + k0 * (sn * dx + c * dy)
    // the close-up: her profile fills the frame, with the face left of centre so the picture's cropped left edge is past the screen's edge and the sky opens up to the right
    const fx = 0.4
    const k1 = Math.max(0.0033, ((fx * a) / SIDE.head[0]) * 1.15), ks0 = k0 / SIDE.ratio
    const ks = ks0 * Math.pow(k1 / ks0, e)
    const bell = Math.sin(Math.PI * e)
    const hx = lerp(hx0, fx * a, e) - bell * 0.05 * a, hy = lerp(hy0, 0.5, e) + bell * 0.03
    const rot = from.rot + (lerp(0, -6 * DEG - from.rot, e) + Math.sin((s / 3.9) * TAU + 0.8) * 2.2 * DEG * e + Math.sin((s / 1.6) * TAU) * 0.7 * DEG * e)
    // where the sprite's centre is, so that the head lands on (hx, hy)
    const ox = SIDE.head[0] - SIDE.w / 2, oy = SIDE.head[1] - SIDE.h / 2
    const cr = Math.cos(rot), sr = Math.sin(rot)
    const cx = hx - ks * (cr * ox - sr * oy), cy = hy - ks * (sr * ox + cr * oy)
    return {
      x: cx / a,
      y: cy,
      h: ks * SIDE.h,
      rot,
      pitch: lerp(from.pitch, 0, e) + Math.sin((s / 5.1) * TAU + 0.6) * 0.05 * e,
      yaw: lerp(from.yaw, 0, e) + bell * 0.2 + Math.sin((s / 6.3) * TAU + 2.1) * 0.06 * e,
      // the sky slides the other way as the camera arcs round her, and turns with the roll
      drift: [-bell * 0.09 + Math.sin((s / 5.7) * TAU) * 0.012 * e, bell * 0.025 + Math.cos((s / 4.9) * TAU + 1) * 0.008 * e],
      bgZoom: lerp(1, 1.3, e),
      roll: -4 * DEG * e + Math.sin((s / 4.4) * TAU + 1.1) * 1.4 * DEG * e,
    }
  },
}

/** The shots, in the order of the fall. The original falling picture (fall.ts) carries on after the last one. */
export const SHOTS: Shot[] = [WIDE_SHOT, SIDE_SHOT]

export interface ShotState {
  shot: Shot
  /** how visible it is, 0-1 (fading in over the shot before it, 1 through its range, then fading out as the next picture comes in) */
  weight: number
  place: ShotPlace
  swing: number[]
}

/**
 * The shots showing at fall progress `fall` (0-1), and the camera's backdrop zoom (held once a shot is over).
 * `next(f)` is where the original falling picture is at fall progress f: a shot eases onto it over its `handoff`, then holds there
 * (that is where the shot after it starts from).
 */
export function shotsAt(fall: number, fr: FallFrame, next: (f: number) => ShotStart): { shots: ShotState[]; bgZoom: number; drift: [number, number]; roll: number; rest: number } {
  const shots: ShotState[] = []
  let bgZoom = 1, rest = 1, roll = 0
  const drift: [number, number] = [0, 0]
  SHOTS.forEach((shot, i) => {
    const [from, to] = shot.range
    const p = clamp((fall - from) / (to - from), 0, 1)
    const start = next(from)
    const place = shot.place(p, fr.s, start)
    // a shot settles onto the picture that follows it
    if (shot.handoff > 0) {
      const t = smooth(clamp((p - (1 - shot.handoff)) / shot.handoff, 0, 1))
      const n = next(Math.min(fall, to))
      for (const k of ['x', 'y', 'h', 'rot', 'pitch', 'yaw'] as const) place[k] = lerp(place[k], n[k], t)
      place.drift = [place.drift[0] * (1 - t), place.drift[1] * (1 - t)]
    }
    if (fall >= from) bgZoom *= place.bgZoom
    const into = shot.fadeIn ? smooth(clamp((fall - from) / shot.fadeIn, 0, 1)) : 1
    // a shot with another after it stays whole underneath until that one has covered it, so the dissolve never shows the sky through her;
    // the last one hands over to the original falling picture instead
    const after = SHOTS[i + 1]
    const out = after ? (fall < after.range[0] + (after.fadeIn ?? 0) ? 1 : 0) : clamp(1 - (fall - to) / shot.fade, 0, 1)
    const weight = into * out
    if (weight > 0 && fall >= from) {
      shots.push({ shot, weight, place, swing: shot.swing(fr.s, fr.air) })
      drift[0] += place.drift[0] * weight
      drift[1] += place.drift[1] * weight
      roll += (place.roll ?? 0) * weight
      rest *= 1 - weight
    }
  })
  return { shots, bgZoom, drift, roll, rest }
}
