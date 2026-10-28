import { useCallback, useEffect, useRef, useState } from 'react'
import PhoneGallery, { type PhoneSpot } from './PhoneGallery'
import type { GirlAnchor, MeadowHandle, MeadowState } from './meadow/meadow'
import GirlFx from './GirlFx'
import AboutMe from './AboutMe'
import { LAND_CONFIG } from './meadow/land'
import { LEAVE_CONFIG } from './meadow/leave'
import { TOUCH_CONFIG } from './meadow/touch'
import { BAG_PLACE, PHONE_PLACE } from './meadow/props'
import { createBagReveal, playBagReveal } from './meadow/bagItems'
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

// Debug: a corner label naming the storyboard frame (1-15) the scroll is on. Shown in dev, or with ?frames in the URL.
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
]
function frameIndex(s: { zoom: number; dream: number; fall: number; land: number }) {
  const land = s.land, d = s.dream, f = s.fall, contact = LAND_CONFIG.approach.contact / LAND_CONFIG.duration
  if (land > 0) {
    if (land < 0.15) return 11
    if (land < contact) return 12
    if (land < contact + 0.008) return 13
    if (land < 0.37) return 14
    return 15
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
  // the function GirlFx gives us to move its effects, called by the scene each frame with where her head is
  const fxRef = useRef<((a: GirlAnchor | null) => void) | null>(null)
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
    const stop = playBagReveal(bag, matchMedia('(prefers-reduced-motion: reduce)').matches, () => finish())
    const finish = () => {
      window.removeEventListener('wheel', stopScroll)
      window.removeEventListener('touchmove', stopScroll)
      window.removeEventListener('keydown', stopKeys)
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
    let leaveDistance = 1
    let touchDistance = 1
    // the camera's size (it is pinned to the viewport), and the --about last written, so a scroll only touches the DOM when something changes
    let camW = 0, camH = 0
    let about = ''

    const state: MeadowState = { zoom: 0, dream: 0, fall: 0, land: 0, leave: 0, touch: 0, bag, glasses, hat, cap, phone }
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
      const vh = section.offsetHeight / (FALL_VH + LAND_CONFIG.scrollVh + LEAVE_CONFIG.scrollVh + TOUCH_CONFIG.scrollVh)
      scrollDistance = Math.max(1, FALL_VH * vh - window.innerHeight)
      landDistance = Math.max(1, LAND_CONFIG.scrollVh * vh)
      leaveDistance = Math.max(1, LEAVE_CONFIG.scrollVh * vh)
      touchDistance = Math.max(1, TOUCH_CONFIG.scrollVh * vh)
    }

    // a hotspot is clickable only while its thing is on screen (startBag also switches the bag's off directly)
    const showHotspot = (btn: HTMLButtonElement, on: boolean) => {
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
      state.leave = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance) / leaveDistance))
      state.touch = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - leaveDistance) / touchDistance))
      // the About Me page comes in while she settles (touch 0.5 - 0.8): its own 0-1, read by AboutMe's CSS
      const a = Math.max(0, Math.min(1, (state.touch - 0.5) / 0.3))
      const next = (a * a * (3 - 2 * a)).toFixed(3)
      if (next !== about) camera.style.setProperty('--about', (about = next))
      const label = framesRef.current
      if (label) {
        const n = frameIndex(state)
        const pct = (v: number) => `${Math.round(v * 100)}%`
        const detail = state.leave > 0 ? `after landing · leave ${pct(state.leave)}`
          : state.land > 0 ? `Part 3 · landing ${pct(state.land)} · ${(state.land * LAND_CONFIG.duration).toFixed(1)}s`
          : state.fall > 0 ? `Part 2 · fall ${pct(state.fall)} · ${(state.fall * 14).toFixed(1)}s`
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
    measure()
    update(true)
    return () => {
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
  <section ref={sectionRef} className="dream-section" style={{ height: `${FALL_VH + LAND_CONFIG.scrollVh + LEAVE_CONFIG.scrollVh + TOUCH_CONFIG.scrollVh}vh` }}>
    <div ref={cameraRef} className="dream-camera">
      <div
        ref={stageRef}
        className="meadow-stage"
        role="img"
        aria-label="A girl lying asleep in a hand-drawn meadow, who dreams she is falling through the dawn sky and lands safely on a soft cloud, then drifts out of the dream onto her About Me page"
      />
      <AboutMe />
      <GirlFx register={registerFx} />
      {SHOW_FRAMES ? (
        <div
          ref={framesRef}
          className="pointer-events-none absolute left-3 top-3 whitespace-pre rounded-md bg-black/70 px-3 py-2 font-mono text-sm leading-snug text-white"
          style={{ zIndex: 10 }}
        />
      ) : null}
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
        ref={capRef}
        type="button"
        aria-label="Pull her cap over her face"
        onClick={(e) => { e.stopPropagation(); toggleWear(cap, CAP_WEAR, capRef.current) }}
        onMouseEnter={() => { if (!cap.moving && cap.u <= 0) cap.hover = 1 }}
        onMouseLeave={() => { cap.hover = 0 }}
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
