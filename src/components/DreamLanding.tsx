import { useEffect, useRef } from 'react'
import type { MeadowHandle, MeadowState } from './meadow/meadow'
// Scroll progress (0-1): the camera closes in on her face until ZOOM_END, she falls asleep, the dream wave
// crosses from DREAM_START to DREAM_END, and from there to the end she falls through the sky
const ZOOM_END = 0.1154
const DREAM_START = 0.1385
const DREAM_END = 0.1938

export default function DreamLanding() {
  const sectionRef = useRef<HTMLElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current!
    const camera = cameraRef.current!
    const stage = stageRef.current!

    // Layout is read only on resize; scroll just does math (the meadow reads the state each frame)
    let sectionStart = 0
    let scrollDistance = 1

    const state: MeadowState = { zoom: 0, dream: 0, fall: 0 }
    // The meadow (and p5) load after first paint; the poster stands in until its first frame is up
    let meadow: MeadowHandle | null = null
    let visible = true
    let cancelled = false
    import('./meadow/meadow').then(({ createMeadow }) => {
      if (cancelled) return
      meadow = createMeadow(stage, state, () => camera.classList.add('meadow-ready'))
      meadow.setVisible(visible)
    })

    const measure = () => {
      sectionStart = section.getBoundingClientRect().top + window.scrollY
      scrollDistance = Math.max(1, section.offsetHeight - window.innerHeight)
    }

    const update = () => {
      const progress = Math.max(0, Math.min(1, (window.scrollY - sectionStart) / scrollDistance))
      state.zoom = Math.min(progress / ZOOM_END, 1)
      state.dream = Math.max(0, Math.min(1, (progress - DREAM_START) / (DREAM_END - DREAM_START)))
      state.fall = Math.max(0, Math.min(1, (progress - DREAM_END) / (1 - DREAM_END)))
    }

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
      meadow?.dispose()
      window.removeEventListener('scroll', update)
    }
  }, [])

  return (
  <section ref={sectionRef} className="dream-section">
    <div ref={cameraRef} className="dream-camera">
      <div
        ref={stageRef}
        className="meadow-stage"
        role="img"
        aria-label="A girl lying asleep in a hand-drawn meadow, who dreams she is falling through the dawn sky"
      />
    </div>
  </section>
  )
}
