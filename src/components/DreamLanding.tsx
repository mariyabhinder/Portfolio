import { useCallback, useEffect, useRef, useState } from 'react'
import PhoneGallery, { type PhoneSpot } from './PhoneGallery'
import type { GirlAnchor, MeadowHandle, MeadowState } from './meadow/meadow'
import GirlFx from './GirlFx'
import AboutMe from './AboutMe'
import { FALL_CONFIG } from './meadow/fall'
import FlowerCard from './FlowerCard'
import PostCard from './PostCard'
import IdLanyard from './IdCard'
import { createFallDynamics } from './meadow/fall'
import { LAND_CONFIG } from './meadow/land'
import { LEAVE_CONFIG } from './meadow/leave'
import { WINDOW_CONFIG, launchProgress, openingFit, windowAt } from './meadow/window'
import { TOUCH_CONFIG } from './meadow/touch'
import { WAKE_CONFIG, wakeWave, wakeZoom } from './meadow/wake'
import { BAG_PLACE, PHONE_PLACE } from './meadow/props'
import { bagCamera, createBagReveal, playBagReveal } from './meadow/bagItems'
import { createWear, playWear, CAP_WEAR, GLASSES_WEAR, HAT_WEAR, type WearConfig, type WearState } from './meadow/wear'
// Scroll progress (0-1): the camera closes in on her face until ZOOM_END, she falls asleep, the dream wave
// crosses from DREAM_START to DREAM_END, and from there to FALL_VH she falls through the sky. The scroll after that is the
// landing on the cloud (meadow/land.ts): LAND_CONFIG.scrollVh more viewport heights, with its own progress (state.land), then a second
// dream wave that carries the cloud scene away into the About Me background (meadow/leave.ts, state.leave), then the touchdown on it (state.touch)
const ZOOM_END = 0.1154
const DREAM_START = 0.1385
const DREAM_END = 0.1938
// the original length of the section (viewport heights) that zoom, dream and fall are measured in: unchanged by the landing
const FALL_VH = 1400
// the postcard on the meadow, in scene px (736 x 920): centre, width and tilt. It lies on her right side, a little below her hand
const POST_PLACE = { x: 498, y: 488, w: 36, rot: -0.15 }
// her ID card on its lanyard, dropped in the grass to the left of her head: centre, width of its box (scene px) and tilt
const ID_PLACE = { x: 300, y: 318, w: 46, rot: -0.35 }

// Debug: a corner label naming the storyboard frame (1-15) the scroll is on. Shown in dev, or with ?frames in the URL.
// picstory.webp is 691 x 503, cropped to cover the opening
const PICSTORY_ASPECT = 524 / 416 // the picture covers the whole opening
const SHOW_FRAMES = import.meta.env.DEV || new URLSearchParams(window.location.search).has('frames')
const FRAMES: [number, string][] = [
  [1, 'Close on her sleeping face'],
  [2, 'Warm ring of light appears'],
  [3, 'Ring grows, meadow bends + splits colours'],
  [4, 'Meadow breaks into dust, sky behind'],
  [5, 'Falling girl fades in'],
  [6, 'Meadow gone, only sky'],
  [7, 'Hover: shock, camera shake, big wobble'],
  [8, 'Gravity starts, clouds begin to move'],
  [9, 'Speeding up: blur, streaks, zoom'],
  [10, 'Top speed: steady fall'],
  [11, 'Cloud fades in far below'],
  [12, 'Approach: cloud swells, sky slows'],
  [13, 'Contact: picture swap, camera bump'],
  [14, 'Pressing in: dent, wisps, shadow'],
  [15, 'Bounce: rebound and settle'],
  [16, 'Reacts: recoils onto her elbow, then pushes herself up'],
  [17, 'Rises upright, then turns her hips and knees toward the cloud edge'],
  [18, 'Lowers her legs over the cloud edge and sits there'],
  [19, 'Launch: hands on the cloud, hips lift, push-off, jump11'],
]
// The lines that pass by while she falls, one after another, alternating sides. Each lives on the same depth clock as the sky's
// cloud slices (the distance fallen, fall.ts `travel`): it starts small and faint near the vanishing point, rushes outward and
// grows as it nears the lens, then dissolves. `dx`/`dy` are its place relative to the vanishing point (fractions of the camera's
// width/height) at normal size, `from`/`to` the span of `travel` it lives over.
const FALL_TEXTS = [
  { lines: ['Hi, I am', 'Mariyah.'], side: 'right', dx: 0.27, dy: -0.02, from: 1.0, to: 4.6, m: { x: 0.5, y: 0.11 } },
  // the face close-up (meadow.ts FACE_ZOOM) runs over travel ~4.1-8.0: this one waits until the camera has pulled back to her whole body
  { lines: ['I am a', 'UI/UX designer.'], side: 'left', dx: -0.27, dy: 0.08, from: 8.2, to: 11.8, m: { x: 0.31, y: 0.88 } },
  // further out to the side, so it hangs a little way off her body rather than over it
  { lines: ['I find joy in little', 'things around me.'], side: 'right', dx: 0.36, dy: -0.04, from: 12.2, to: 16.0, m: { x: 0.5, y: 0.11 } },
] as const
const FALL_TEXT_Z = { far: 2.2, near: 0.7 } // like SKY_LAYERS zFar / zNear: size = 1 / z
const fallDynamics = createFallDynamics()

function frameIndex(s: { zoom: number; dream: number; fall: number; land: number; window: number }) {
  const land = s.land, d = s.dream, f = FALL_CONFIG.start + (1 - FALL_CONFIG.start) * s.fall, contact = LAND_CONFIG.approach.contact / LAND_CONFIG.duration
  if (land > 0) {
    if (land < 0.15) return 11
    if (land < contact) return 12
    if (land < contact + 0.008) return 13
    if (land < 0.37) return 14
    if (land < LAND_CONFIG.sit.segments[0][0] / LAND_CONFIG.duration) return 15
    if (land < LAND_CONFIG.sit.segments[1][0] / LAND_CONFIG.duration) return 16
    if (land < LAND_CONFIG.sit.segments[2][0] / LAND_CONFIG.duration) return 17
    return s.window > 0 && launchProgress(s.window) > 0 ? 19 : 18
  }
  if (d <= 0) return 1
  if (d < 1) return d < 0.1 ? 2 : d < 0.3 ? 3 : d < 0.45 ? 4 : d < 0.65 ? 5 : 6
  if (f <= 0) return 6
  return f < 0.9 / 14 ? 7 : f < 0.18 ? 8 : f < 0.37 ? 9 : 10
}

export default function DreamLanding() {
  const sectionRef = useRef<HTMLElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const framesRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const fallTextRef = useRef<HTMLDivElement>(null)
  const picstoryRef = useRef<HTMLAnchorElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const scrollCueRef = useRef<HTMLParagraphElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const dispRef = useRef<SVGFEDisplacementMapElement>(null)
  // the function GirlFx gives us to move its effects, called by the scene each frame with where her head is
  const fxRef = useRef<((a: GirlAnchor | null) => void) | null>(null)
  // the word game on the About Me page tells us when every word is found: she changes pose (eased over 0.7 s, read by the scene each frame)
  // and the bubble changes what it says
  const rememberedRef = useRef(0)
  const rememberAnim = useRef(0)
  const [remembered, setRemembered] = useState(false)
  const onRemembered = useCallback((done: boolean) => {
    setRemembered(done)
    cancelAnimationFrame(rememberAnim.current)
    const from = rememberedRef.current, to = done ? 1 : 0, t0 = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 700)
      rememberedRef.current = from + (to - from) * k
      if (k < 1) rememberAnim.current = requestAnimationFrame(step)
    }
    rememberAnim.current = requestAnimationFrame(step)
  }, [])
  const registerFx = useCallback((fn: ((a: GirlAnchor | null) => void) | null) => { fxRef.current = fn }, [])
  // her phone lies face down on the meadow at the top of the page: a hotspot over it lifts it off the grass into the Photos
  // gallery, and the meadow leaves it out until the gallery has laid it back down
  const phoneRef = useRef<HTMLButtonElement>(null)
  const phone = useRef({ up: false }).current
  const [galleryOpen, setGalleryOpen] = useState(false)
  // where the phone lies on screen right now (viewport px): the gallery flies it from here, and back here when it closes
  const phoneSpot = useCallback((): PhoneSpot | null => {
    const btn = phoneRef.current, camera = cameraRef.current
    if (!btn || !camera) return null
    const r = btn.getBoundingClientRect()
    const s = Math.max(camera.clientWidth / 736, camera.clientHeight / 920)
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: PHONE_PLACE.h * s, rot: PHONE_PLACE.rot }
  }, [])
  const openPhone = useCallback(() => {
    phone.up = true
    setGalleryOpen(true)
  }, [phone])
  const closePhone = useCallback(() => {
    phone.up = false
    setGalleryOpen(false)
    // the hotspot comes back with the next scroll update
    window.dispatchEvent(new Event('scroll'))
  }, [phone])
  // her tote lies on the meadow too: clicking it plays the bag reveal (meadow/bagItems.ts). The hotspot is placed like the phone's.
  const postRef = useRef<HTMLDivElement>(null)
  const idRef = useRef<HTMLButtonElement>(null)
  const finaleRef = useRef(false)
  const [finale, setFinale] = useState(false)
  const bagRef = useRef<HTMLButtonElement>(null)
  const bag = useRef(createBagReveal()).current
  const bagPlaying = useRef(false)
  const bagStop = useRef<(() => void) | null>(null)
  const startBag = useCallback(() => {
    if (bagPlaying.current) return
    bagPlaying.current = true
    bag.hover = 0
    const btn = bagRef.current
    if (btn) btn.style.pointerEvents = 'none'
    // the page stays where it is while the camera is on the bag
    const stopScroll = (e: Event) => e.preventDefault()
    const stopKeys = (e: KeyboardEvent) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) e.preventDefault() }
    window.addEventListener('wheel', stopScroll, { passive: false })
    window.addEventListener('touchmove', stopScroll, { passive: false })
    window.addEventListener('keydown', stopKeys)
    // a click anywhere (the bag included) once all the items are out puts them back in
    const dismiss = () => stop.dismiss()
    window.addEventListener('pointerdown', dismiss)
    const stop = playBagReveal(bag, matchMedia('(prefers-reduced-motion: reduce)').matches, () => finish())
    const finish = () => {
      window.removeEventListener('wheel', stopScroll)
      window.removeEventListener('touchmove', stopScroll)
      window.removeEventListener('keydown', stopKeys)
      window.removeEventListener('pointerdown', dismiss)
      bagStop.current = null
      bagPlaying.current = false
      // the hotspot comes back with the next scroll update
      window.dispatchEvent(new Event('scroll'))
    }
    bagStop.current = () => { stop(); finish() }
  }, [bag])

  // her glasses and hat lie by her head: clicking one puts it on her face, clicking her face takes it off again (meadow/wear.ts)
  const glassesRef = useRef<HTMLButtonElement>(null)
  const hatRef = useRef<HTMLButtonElement>(null)
  const capRef = useRef<HTMLButtonElement>(null)
  const glasses = useRef(createWear()).current
  const hat = useRef(createWear()).current
  const cap = useRef(createWear()).current
  const wearStops = useRef(new Set<() => void>()).current
  const toggleWear = useCallback((w: WearState, cfg: WearConfig, btn: HTMLButtonElement | null) => {
    if (w.moving) return
    if (btn) btn.style.pointerEvents = 'none'
    // the hotspot moves to where it now is with the next scroll update
    const stop = playWear(w, cfg, w.u < 0.5, matchMedia('(prefers-reduced-motion: reduce)').matches, () => {
      wearStops.delete(stop)
      window.dispatchEvent(new Event('scroll'))
    })
    wearStops.add(stop)
  }, [wearStops])

  useEffect(() => {
    const section = sectionRef.current!
    const camera = cameraRef.current!
    const stage = stageRef.current!

    // Layout is read only on resize; scroll just does math (the meadow reads the state each frame)
    let sectionStart = 0
    // the length of the zoom + dream + fall part of the scroll, and of the landing part (px)
    let scrollDistance = 1
    let landDistance = 1
    let windowDistance = 1
    let leaveDistance = 1
    let touchDistance = 1
    let wakeDistance = 1
    // the camera's size (it is pinned to the viewport), and the --about last written, so a scroll only touches the DOM when something changes
    let camW = 0, camH = 0
    let about = ''

    const state: MeadowState = { zoom: 0, dream: 0, fall: 0, land: 0, window: 0, leave: 0, touch: 0, about: 0, wake: 0, get remembered() { return rememberedRef.current }, bag, glasses, hat, cap, phone }
    // The meadow (and p5) load after first paint; the poster stands in until its first frame is up
    let meadow: MeadowHandle | null = null
    let visible = true
    let cancelled = false
    import('./meadow/meadow').then(({ createMeadow }) => {
      if (cancelled) return
      meadow = createMeadow(stage, state, () => camera.classList.add('meadow-ready'), (a) => fxRef.current?.(a))
      meadow.setVisible(visible)
    })

    const measure = () => {
      camW = camera.clientWidth
      camH = camera.clientHeight
      sectionStart = section.getBoundingClientRect().top + window.scrollY
      // the section is (FALL_VH + landing + leave + touchdown) vh tall: the fall keeps the scroll length it always had, then the rest in order
      const vh = section.offsetHeight / (FALL_VH + LAND_CONFIG.scrollVh + WINDOW_CONFIG.scrollVh + LEAVE_CONFIG.scrollVh + TOUCH_CONFIG.scrollVh + WAKE_CONFIG.scrollVh)
      scrollDistance = Math.max(1, FALL_VH * vh - window.innerHeight)
      landDistance = Math.max(1, LAND_CONFIG.scrollVh * vh)
      windowDistance = Math.max(1, WINDOW_CONFIG.scrollVh * vh)
      leaveDistance = Math.max(1, LEAVE_CONFIG.scrollVh * vh)
      touchDistance = Math.max(1, TOUCH_CONFIG.scrollVh * vh)
      wakeDistance = Math.max(1, WAKE_CONFIG.scrollVh * vh)
    }

    // a hotspot is clickable only while its thing is on screen (startBag also switches the bag's off directly)
    const showHotspot = (btn: HTMLElement, on: boolean) => {
      const events = on ? 'auto' : 'none', vis = on ? 'visible' : 'hidden'
      if (btn.style.pointerEvents !== events) btn.style.pointerEvents = events
      if (btn.style.visibility !== vis) btn.style.visibility = vis
    }

    // The scene (736 x 920) covers the viewport, centred (meadow.ts applyCamera at zoom 0); the phone lies at PHONE_PLACE,
    // its hotspot a box over it, turned with it
    const PHONE_BOX = { w: 30, h: 48 }
    const placePhone = (resized: boolean) => {
      const btn = phoneRef.current
      if (!btn) return
      if (resized) {
        const vw = camW, vh = camH
        const s = Math.max(vw / 736, vh / 920)
        const px = (vw - 736 * s) / 2 + PHONE_PLACE.x * s, py = (vh - 920 * s) / 2 + PHONE_PLACE.y * s
        btn.style.width = `${PHONE_BOX.w * s}px`
        btn.style.height = `${PHONE_BOX.h * s}px`
        btn.style.transform = `translate(${px - (PHONE_BOX.w * s) / 2}px, ${py - (PHONE_BOX.h * s) / 2}px) rotate(${PHONE_PLACE.rot}rad)`
      }
      // only while the camera is still out and she is awake on the grass, and the phone is there
      const on = !phone.up && window.scrollY - sectionStart < window.innerHeight * 0.15
      showHotspot(btn, on)
    }

    // The bag lies at (BAG_PLACE) on the same scene; its hotspot is a box over it, turned with it
    const BAG_BOX = { w: 76, h: 84 }
    const placeBag = (resized: boolean) => {
      const btn = bagRef.current
      if (!btn) return
      if (resized) {
        const vw = camW, vh = camH
        const s = Math.max(vw / 736, vh / 920)
        const px = (vw - 736 * s) / 2 + BAG_PLACE.x * s, py = (vh - 920 * s) / 2 + BAG_PLACE.y * s
        btn.style.width = `${BAG_BOX.w * s}px`
        btn.style.height = `${BAG_BOX.h * s}px`
        btn.style.transform = `translate(${px - (BAG_BOX.w * s) / 2}px, ${py - (BAG_BOX.h * s) / 2}px) rotate(${BAG_PLACE.rot}rad)`
      }
      const on = !bagPlaying.current && window.scrollY - sectionStart < window.innerHeight * 0.15
      showHotspot(btn, on)
    }

    // The postcard lies on the grass between her hand and the bag; its wrapper is placed like the bag's hotspot (the tilt is the card's own)
    // where a thing lying on the grass at scene (x, y) is on screen now, and how much the camera has scaled it
    const onGrass = (x: number, y: number) => {
      const vw = camW, vh = camH
      const s = Math.max(vw / 736, vh / 920)
      const ox = (vw - 736 * s) / 2, oy = (vh - 920 * s) / 2
      // like the bag, hat and cap drawn on the grass, the card is part of the scene: it stays at its spot and follows the camera (meadow.ts applyCamera)
      const k = Math.max(0, Math.min(1, state.zoom))
      const maxZoom = Math.max(3, Math.min(6, (0.55 * Math.min(vw, vh)) / (40 * s)))
      const z = 1 + (maxZoom - 1) * k
      const fx = ox + 388 * s, fy = oy + 305 * s
      const cx = ox + x * s, cy = oy + y * s
      const sx = fx + (vw / 2 - fx) * k + (cx - fx) * z, sy = fy + (vh / 2 - fy) * k + (cy - fy) * z
      // clicked bag: the camera closes in on the bag; the card stays on the grass where it lies, so it rides that same camera
      let px = sx, py = sy, pz = z
      if (bag.cam > 0) {
        const s0 = Math.max(vw / 736, vh / 920)
        const c = bagCamera(vw, vh, bag.cam, { w: 736, h: 920 }, s0, ox, oy)
        px = c.tx + x * c.s
        py = c.ty + y * c.s
        pz = c.s / s0
      }
      return { s, px, py, pz }
    }
    // only on the meadow: the hero (before the dream begins) and the last section (once she has woken); hidden in between
    const onMeadow = () => (state.dream <= 0 && state.wake <= 0) || state.wake >= WAKE_CONFIG.waveEnd + 0.02
    let postKey = ''
    const placePost = (resized: boolean) => {
      const el = postRef.current
      if (!el) return
      const vw = camW, vh = camH
      const { s, px, py, pz } = onGrass(POST_PLACE.x, POST_PLACE.y)
      const w = POST_PLACE.w * s, h = w * (269 / 376)
      const key = `${vw}|${vh}|${pz.toFixed(3)}|${px.toFixed(1)}|${py.toFixed(1)}`
      if (resized || key !== postKey) {
        postKey = key
        // laid out at the size it is read at (~460px wide) and scaled down, so the card, its text and icons are drawn sharp when it opens
        const R = 460 / w
        el.style.width = `${w * R}px`
        el.style.height = `${h * R}px`
        el.style.setProperty('--pc-u', R.toFixed(3))
        el.style.transform = `translate(${px - (w * R) / 2}px, ${py - (h * R) / 2}px) scale(${(pz / R).toFixed(5)})`
      }
      const flipped = el.querySelector('.pc-card--flipped') !== null
      // only on the meadow: the hero (before the dream begins) and the last section (once she has woken); hidden in between
      const hero = state.dream <= 0 && state.wake <= 0
      const last = state.wake >= WAKE_CONFIG.waveEnd + 0.02
      const on = hero || last
      showHotspot(el, on)
      el.style.pointerEvents = on && (flipped || hero || state.wake >= 0.995) ? 'auto' : 'none'
    }

    // the ID card is placed the same way: laid out at 200px and scaled, so it stays sharp as the camera closes in
    let idKey = ''
    const placeId = (resized: boolean) => {
      const el = idRef.current
      if (!el) return
      const { s, px, py, pz } = onGrass(ID_PLACE.x, ID_PLACE.y)
      const w = ID_PLACE.w * s, R = 200 / w
      const key = `${camW}|${camH}|${pz.toFixed(3)}|${px.toFixed(1)}|${py.toFixed(1)}`
      if (resized || key !== idKey) {
        idKey = key
        el.style.width = `${w * R}px`
        el.style.height = `${w * R}px`
        el.style.transform = `translate(${px - (w * R) / 2}px, ${py - (w * R) / 2}px) scale(${(pz / R).toFixed(5)})`
      }
      // clickable while she is on the grass and the camera is still out
      const on = onMeadow()
      showHotspot(el, on)
      if (on && state.zoom > 0.15) el.style.pointerEvents = 'none'
    }

    // The glasses' and hat's hotspots: over each on the grass, or over her face once she has it on, turned with it. The hat's
    // is over the glasses' (it is later in the page), so with both on, her face takes the hat off first
    const wearHotspot = (w: WearState, cfg: WearConfig, box: { w: number; h: number }, labels: [string, string]) => {
      let wasOn: boolean | null = null
      return (btn: HTMLButtonElement | null, resized: boolean) => {
        if (!btn) return
        const on = w.u >= 0.5
        if (resized || on !== wasOn) {
          wasOn = on
          const vw = camW, vh = camH
          const s = Math.max(vw / 736, vh / 920)
          const g = on ? cfg.to : { ...cfg.from, scale: 1 }
          const bw = box.w * g.scale * s, bh = box.h * g.scale * s
          const px = (vw - 736 * s) / 2 + g.x * s, py = (vh - 920 * s) / 2 + g.y * s
          btn.style.width = `${bw}px`
          btn.style.height = `${bh}px`
          btn.style.transform = `translate(${px - bw / 2}px, ${py - bh / 2}px) rotate(${g.rot}rad)`
          btn.setAttribute('aria-label', labels[on ? 1 : 0])
        }
        showHotspot(btn, !w.moving && !bagPlaying.current && window.scrollY - sectionStart < window.innerHeight * 0.15)
      }
    }
    const placeGlasses = wearHotspot(glasses, GLASSES_WEAR, { w: 38, h: 24 }, ['Put on her glasses', 'Take off her glasses'])
    const placeHat = wearHotspot(hat, HAT_WEAR, { w: 46, h: 46 }, ['Lay her hat over her face', 'Take the hat off her face'])

    const placeCap = wearHotspot(cap, CAP_WEAR, { w: 46, h: 48 }, ['Pull her cap over her face', 'Take the cap off her face'])

    const update = (resized = false) => {
      placePhone(resized)
      placeBag(resized)
      placeGlasses(glassesRef.current, resized)
      placeHat(hatRef.current, resized)
      placeCap(capRef.current, resized)
      const scrolled = window.scrollY - sectionStart
      const progress = Math.max(0, Math.min(1, scrolled / scrollDistance))
      state.zoom = Math.min(progress / ZOOM_END, 1)
      state.dream = Math.max(0, Math.min(1, (progress - DREAM_START) / (DREAM_END - DREAM_START)))
      state.fall = Math.max(0, Math.min(1, (progress - DREAM_END) / (1 - DREAM_END)))
      state.land = Math.max(0, Math.min(1, (scrolled - scrollDistance) / landDistance))
      state.window = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance) / windowDistance))
      state.leave = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - windowDistance) / leaveDistance))
      state.touch = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - windowDistance - leaveDistance) / touchDistance))
      state.wake = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - windowDistance - leaveDistance - touchDistance) / wakeDistance))
      // waking, the camera is on her face again and pulls back out (the hero's zoom, run the other way)
      if (state.wake > 0) state.zoom = wakeZoom(state.wake)
      placePost(resized)
      placeId(resized)
      // the About Me page comes in while she settles (touch 0.5 - 0.8): its own 0-1, read by AboutMe's CSS; the wake wave carries it away again
      const wave = wakeWave(state.wake)
      const a = Math.max(0, Math.min(1, (state.touch - 0.5) / 0.3))
      // the page itself is taken by the same wave as the canvas (meadow.ts drawDream): masked away inside the wave's radius, and bent
      // by the displacement filter around its front. The canvas has fully swapped by wave 0.87
      const layer = layerRef.current, disp = dispRef.current
      const waking = wave > 0 && wave < 0.87
      if (layer && disp) {
        if (waking) {
          const span = Math.hypot(camW, camH)
          layer.style.setProperty('--wr', `${wave * (span / 2) * 1.62}px`)
          layer.style.setProperty('--ws', `${span}px`)
          disp.setAttribute('scale', (Math.pow(Math.sin(Math.PI * wave), 1.15) * span * 0.06).toFixed(1))
        }
        if (waking !== layer.classList.contains('waking')) layer.classList.toggle('waking', waking)
      }
      const gone = wave >= 0.87
      if (gone !== camera.classList.contains('about-gone')) camera.classList.toggle('about-gone', gone)
      // at the very end of the scroll the postcard opens by itself (PostCard's `open`)
      const end = state.wake >= 0.995
      if (end !== finaleRef.current) { finaleRef.current = end; setFinale(end) }
      state.about = a * a * (3 - 2 * a)
      const next = state.about.toFixed(3)
      if (next !== about) camera.style.setProperty('--about', (about = next))
      // the hero text is there on arrival and fades as the camera starts closing in on her
      const heroText = heroTextRef.current
      if (heroText) heroText.style.opacity = state.wake > 0 ? '0' : Math.max(0, 1 - state.zoom / 0.12).toFixed(3)
      // the scroll cue stays until the page is scrolled all the way down
      if (scrollCueRef.current) scrollCueRef.current.style.opacity = state.wake >= 0.995 ? '0' : '1'
      // the lines of text that fall past with her: placed from the same depth clock as the clouds, so they rush with the sky
      const fallText = fallTextRef.current
      if (fallText) {
        const k = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
        const falling = state.fall > 0 && state.land <= 0 && state.wake <= 0
        const fr = falling ? fallDynamics.at(state.fall) : null
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches
        FALL_TEXTS.forEach((t, i) => {
          const el = fallText.children[i] as HTMLElement | undefined
          if (!el) return
          const ph = fr ? (fr.travel - t.from) / (t.to - t.from) : 0
          if (!fr || ph <= 0 || ph >= 1) {
            if (el.style.opacity !== '0') el.style.opacity = '0'
            return
          }
          const env = k(0, 0.2, ph) * (1 - k(0.72, 1, ph))
          const zoom = still ? 1 : 1 / (FALL_TEXT_Z.far + (FALL_TEXT_Z.near - FALL_TEXT_Z.far) * ph)
          // the vanishing point the sky radiates from (meadow.ts vanishPoint): she sways about it
          const vx = camW / 2 + Math.sin(fr.s * 0.45) * 0.035 * camW, vy = camH * 0.4 + Math.cos(fr.s * 0.31) * camH * 0.015
          // on a tall (phone) screen she fills the width, so the lines wait above and below her (`m`) instead of beside her, drifting outward a little
          const tall = camH > camW * 1.15
          const out = still ? 0 : (zoom - 0.8) * 0.04 * camH * (t.m.y < 0.5 ? -1 : 1)
          const x = tall ? t.m.x * camW : vx + t.dx * camW * zoom
          const y = tall ? t.m.y * camH + out : vy + t.dy * camH * zoom
          // blurred by the speed while it is still far or already past, sharp while it reads
          const blur = still ? 0 : (1 - env) * 5 * Math.min(1, fr.u * 1.4)
          el.style.opacity = env.toFixed(3)
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) rotate(${(still ? 0 : fr.camRoll).toFixed(4)}rad) scale(${zoom.toFixed(3)})`
          el.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : ''
        })
      }
      // the tagline stays put in the sky, fading in as the window grows and out as she launches
      const tag = taglineRef.current
      if (tag) {
        const w = state.window
        const k = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
        const op = w > 0 && state.leave <= 0 ? k(0.04, 0.3, w) * (1 - k(0.5, 0.62, w)) : 0
        tag.style.opacity = op.toFixed(3)
      }
      // the project picture in the window is a link, over the picture, live only once the shutters are fully open
      const link = picstoryRef.current
      if (link) {
        const open = state.window >= WINDOW_CONFIG.phases.open[1] * (1 - WINDOW_CONFIG.launchShare) && state.leave <= 0
        if (open) {
          const wf = windowAt(state.window, camW, camH), f = openingFit(PICSTORY_ASPECT), u = wf.h / 800
          link.style.width = `${f.w * u}px`
          link.style.height = `${f.h * u}px`
          link.style.transform = `translate(${wf.x - 300 * u + f.x * u}px, ${wf.y - wf.h / 2 + f.y * u}px)`
        }
        const events = open ? 'auto' : 'none'
        if (link.style.pointerEvents !== events) link.style.pointerEvents = events
        link.style.visibility = open ? 'visible' : 'hidden'
        link.tabIndex = open ? 0 : -1
      }
      const label = framesRef.current
      if (label) {
        const n = frameIndex(state)
        const pct = (v: number) => `${Math.round(v * 100)}%`
        const f = FALL_CONFIG.start + (1 - FALL_CONFIG.start) * state.fall
        const detail = state.leave > 0 ? `after landing · leave ${pct(state.leave)}`
          : state.land > 0 ? `Part 3 · landing ${pct(state.land)} · ${(state.land * LAND_CONFIG.duration).toFixed(1)}s`
          : state.fall > 0 ? `Part 2 · fall ${pct(f)} · ${(f * FALL_CONFIG.duration).toFixed(1)}s`
          : state.dream > 0 ? `Part 1 · dream ${pct(state.dream)}`
          : `zoom ${pct(state.zoom)}`
        label.textContent = `Frame ${n} — ${FRAMES[n - 1][1]}\n${detail}`
      }
    }
    const onScroll = () => update()

    const onResize = () => {
      measure()
      update(true)
    }

    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(section)
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      meadow?.setVisible(visible)
    })
    visibility.observe(section)
    window.addEventListener('scroll', onScroll, { passive: true })
    // the bag's camera moves without any scroll, so the card is re-placed every frame while it plays
    let postFrame = 0
    const postTick = () => {
      if (bagPlaying.current || bag.cam > 0) { placePost(false); placeId(false) }
      postFrame = requestAnimationFrame(postTick)
    }
    postFrame = requestAnimationFrame(postTick)
    measure()
    update(true)
    return () => {
      cancelAnimationFrame(postFrame)
      resizeObserver.disconnect()
      visibility.disconnect()
      cancelled = true
      bagStop.current?.()
      wearStops.forEach((stop) => stop())
      meadow?.dispose()
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
  <section ref={sectionRef} className="dream-section" style={{ height: `${FALL_VH + LAND_CONFIG.scrollVh + WINDOW_CONFIG.scrollVh + LEAVE_CONFIG.scrollVh + TOUCH_CONFIG.scrollVh + WAKE_CONFIG.scrollVh}vh` }}>
    <div ref={cameraRef} className="dream-camera">
      <div
        ref={stageRef}
        className="meadow-stage"
        role="img"
        aria-label="A girl lying asleep in a hand-drawn meadow, who dreams she is falling through the dawn sky and lands safely on a soft cloud, then drifts out of the dream onto her About Me page"
      />
      {/* the About Me page and her effects in one layer, so the wake wave can take them all (see .about-layer in index.css) */}
      <div ref={layerRef} className="about-layer">
        <AboutMe onRemembered={onRemembered} />
        <GirlFx register={registerFx} remembered={remembered} />
      </div>
      <div ref={heroTextRef} className="hero-text">
        <p className="screen-cue screen-cue--left">[Click on different accessories]</p>
      </div>
      <p ref={scrollCueRef} className="screen-cue screen-cue--right">
        scroll
        <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
          <path d="M6 1v11M1.5 7.5 6 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" />
        </svg>
      </p>
      <div ref={fallTextRef} className="fall-text" aria-hidden="true">
        {FALL_TEXTS.map((t) => (
          <p key={t.lines[0]} className={`fall-text__line fall-text__line--${t.side}`}>
            {t.lines[0]}<br />{t.lines[1]}
          </p>
        ))}
      </div>
      <div ref={taglineRef} className="cloud-tagline" aria-hidden="true">
        <p>Imagine it.<br className="tag-br" /> Make it.<br />Put a little<br className="tag-br" /> magic into it.</p>
      </div>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id="about-warp" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {SHOW_FRAMES ? (
        <div
          ref={framesRef}
          className="pointer-events-none absolute left-3 top-3 whitespace-pre rounded-md bg-black/70 px-3 py-2 font-mono text-sm leading-snug text-white"
          style={{ zIndex: 10 }}
        />
      ) : null}
      <a
        ref={picstoryRef}
        href="https://picstory.mariyab.com/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open Picstory"
        className="absolute left-0 top-0 cursor-pointer"
        style={{ zIndex: 3, visibility: 'hidden', pointerEvents: 'none' }}
      />
      <PostCard ref={postRef} rot={POST_PLACE.rot} open={finale} />
      <IdLanyard ref={idRef} rot={ID_PLACE.rot} />
      <button
        ref={bagRef}
        type="button"
        aria-label="Open her tote bag"
        onClick={(e) => { e.stopPropagation(); startBag() }}
        onMouseEnter={() => { if (!bagPlaying.current) bag.hover = 1 }}
        onMouseLeave={() => { bag.hover = 0 }}
        className="absolute left-0 top-0 cursor-pointer"
        style={{ zIndex: 3, background: 'transparent' }}
      />
      <button
        ref={glassesRef}
        type="button"
        aria-label="Put on her glasses"
        onClick={(e) => { e.stopPropagation(); toggleWear(glasses, GLASSES_WEAR, glassesRef.current) }}
        onMouseEnter={() => { if (!glasses.moving && glasses.u <= 0) glasses.hover = 1 }}
        onMouseLeave={() => { glasses.hover = 0 }}
        className="absolute left-0 top-0 cursor-pointer"
        style={{ zIndex: 3, background: 'transparent' }}
      />
      <button
        ref={hatRef}
        type="button"
        aria-label="Lay her hat over her face"
        onClick={(e) => { e.stopPropagation(); toggleWear(hat, HAT_WEAR, hatRef.current) }}
        onMouseEnter={() => { if (!hat.moving && hat.u <= 0) hat.hover = 1 }}
        onMouseLeave={() => { hat.hover = 0 }}
        className="absolute left-0 top-0 cursor-pointer"
        style={{ zIndex: 3, background: 'transparent' }}
      />
      <button
        ref={phoneRef}
        type="button"
        aria-label="Open her phone's photo albums"
        onClick={openPhone}
        className="absolute left-0 top-0 cursor-pointer"
        style={{ zIndex: 3, background: 'transparent' }}
      />
    </div>
    {galleryOpen ? <PhoneGallery spot={phoneSpot} onClose={closePhone} /> : null}
  </section>
  )
}
