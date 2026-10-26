import { useCallback, useEffect, useRef } from 'react'
import type { GirlAnchor, MeadowHandle, MeadowState } from './meadow/meadow'
import GirlFx from './GirlFx'
import AboutMe from './AboutMe'
import { getWordGameComplete, subscribeWordGame } from './aboutMemory'
import { LAND_CONFIG } from './meadow/land'
import { RISE_CONFIG } from './meadow/rise'
import { RECEDE_CONFIG } from './meadow/recede'
import { JUMP_CONFIG } from './meadow/jump'
import { DROP_CONFIG } from './meadow/drop'
import { TOUCH_CONFIG } from './meadow/touch'
// Scroll progress (0-1): the camera closes in on her face until ZOOM_END, she falls asleep, the dream wave
// crosses from DREAM_START to DREAM_END, and from there to FALL_VH she falls through the sky. The scroll after that is the
// landing on the cloud (meadow/land.ts): LAND_CONFIG.scrollVh more viewport heights, with its own progress (state.land), and after
// that her rise to her feet (meadow/rise.ts): RISE_CONFIG.scrollVh more, with its own progress (state.rise)
const ZOOM_END = 0.1154
const DREAM_START = 0.1385
const DREAM_END = 0.1938
// the original length of the section (viewport heights) that zoom, dream and fall are measured in: unchanged by the landing
const FALL_VH = 1400
// seconds she takes to remember (or, if the game is reset, to forget again): the real word-game completion is eased over this
const MEMORY_SECONDS = 1.4

export default function DreamLanding() {
  const sectionRef = useRef<HTMLElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // the function GirlFx gives us to move its effects, called by the scene each frame with where her head is
  const fxRef = useRef<((a: GirlAnchor | null) => void) | null>(null)
  const registerFx = useCallback((fn: ((a: GirlAnchor | null) => void) | null) => { fxRef.current = fn }, [])

  useEffect(() => {
    const section = sectionRef.current!
    const camera = cameraRef.current!
    const stage = stageRef.current!

    // Layout is read only on resize; scroll just does math (the meadow reads the state each frame)
    let sectionStart = 0
    // the length of the zoom + dream + fall part of the scroll, and of the landing part (px)
    let scrollDistance = 1
    let landDistance = 1
    let riseDistance = 1
    let recedeDistance = 1
    let jumpDistance = 1
    let dropDistance = 1
    let touchDistance = 1

    const state: MeadowState = { zoom: 0, dream: 0, fall: 0, land: 0, rise: 0, recede: 0, jump: 0, drop: 0, touch: 0, memory: getWordGameComplete() ? 1 : 0 }
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
      sectionStart = section.getBoundingClientRect().top + window.scrollY
      // the section is (FALL_VH + landing + rise) vh tall: the fall keeps the scroll length it always had, then the landing, then the rise
      const vh = section.offsetHeight / (FALL_VH + LAND_CONFIG.scrollVh + RISE_CONFIG.scrollVh + RECEDE_CONFIG.scrollVh + JUMP_CONFIG.scrollVh + DROP_CONFIG.scrollVh + TOUCH_CONFIG.scrollVh)
      scrollDistance = Math.max(1, FALL_VH * vh - window.innerHeight)
      landDistance = Math.max(1, LAND_CONFIG.scrollVh * vh)
      riseDistance = Math.max(1, RISE_CONFIG.scrollVh * vh)
      recedeDistance = Math.max(1, RECEDE_CONFIG.scrollVh * vh)
      jumpDistance = Math.max(1, JUMP_CONFIG.scrollVh * vh)
      dropDistance = Math.max(1, DROP_CONFIG.scrollVh * vh)
      touchDistance = Math.max(1, TOUCH_CONFIG.scrollVh * vh)
    }

    const update = () => {
      const scrolled = window.scrollY - sectionStart
      const progress = Math.max(0, Math.min(1, scrolled / scrollDistance))
      state.zoom = Math.min(progress / ZOOM_END, 1)
      state.dream = Math.max(0, Math.min(1, (progress - DREAM_START) / (DREAM_END - DREAM_START)))
      state.fall = Math.max(0, Math.min(1, (progress - DREAM_END) / (1 - DREAM_END)))
      state.land = Math.max(0, Math.min(1, (scrolled - scrollDistance) / landDistance))
      state.rise = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance) / riseDistance))
      state.recede = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - riseDistance) / recedeDistance))
      state.jump = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - riseDistance - recedeDistance) / jumpDistance))
      state.drop = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - riseDistance - recedeDistance - jumpDistance) / dropDistance))
      state.touch = Math.max(0, Math.min(1, (scrolled - scrollDistance - landDistance - riseDistance - recedeDistance - jumpDistance - dropDistance) / touchDistance))
      // the About Me page comes in while she settles (touch 0.5 - 0.8): its own 0-1, read by AboutMe's CSS
      const a = Math.max(0, Math.min(1, (state.touch - 0.5) / 0.3))
      camera.style.setProperty('--about', (a * a * (3 - 2 * a)).toFixed(3))
    }

    // Whether she remembers is the word game's real completion (aboutMemory.ts), never scroll: state.memory eases toward it over time, on its own clock,
    // so it completes even when nobody is scrolling, and scrolling back leaves it (and the game) untouched
    let memoryFrame = 0
    let memoryLast = 0
    const memoryStep = (now: number) => {
      const goal = getWordGameComplete() ? 1 : 0
      const inc = Math.min(0.05, (now - memoryLast) / 1000) / MEMORY_SECONDS
      memoryLast = now
      state.memory = Math.abs(goal - state.memory) <= inc ? goal : state.memory + Math.sign(goal - state.memory) * inc
      memoryFrame = state.memory === goal ? 0 : requestAnimationFrame(memoryStep)
    }
    const unsubscribeGame = subscribeWordGame(() => {
      if (memoryFrame) return
      memoryLast = performance.now()
      memoryFrame = requestAnimationFrame(memoryStep)
    })

    const onResize = () => {
      measure()
      update()
    }

    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(section)
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      meadow?.setVisible(visible)
    })
    visibility.observe(section)
    window.addEventListener('scroll', update, { passive: true })
    measure()
    update()
    return () => {
      resizeObserver.disconnect()
      visibility.disconnect()
      cancelled = true
      unsubscribeGame()
      cancelAnimationFrame(memoryFrame)
      meadow?.dispose()
      window.removeEventListener('scroll', update)
    }
  }, [])

  return (
  <section ref={sectionRef} className="dream-section" style={{ height: `${FALL_VH + LAND_CONFIG.scrollVh + RISE_CONFIG.scrollVh + RECEDE_CONFIG.scrollVh + JUMP_CONFIG.scrollVh + DROP_CONFIG.scrollVh + TOUCH_CONFIG.scrollVh}vh` }}>
    <div ref={cameraRef} className="dream-camera">
      <div
        ref={stageRef}
        className="meadow-stage"
        role="img"
        aria-label="A girl lying asleep in a hand-drawn meadow, who dreams she is falling through the dawn sky and lands safely on a soft cloud"
      />
      <AboutMe />
      <GirlFx register={registerFx} />
    </div>
  </section>
  )
}
