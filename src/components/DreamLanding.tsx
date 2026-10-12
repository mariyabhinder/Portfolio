import { useEffect, useRef } from 'react'
import imgGarden from '@/assets/garden/garden.webp'
import imgGirl from '@/assets/garden/girl.webp'
import imgCloud1 from '@/assets/garden/cloud-1.webp'
import imgCloud2 from '@/assets/garden/cloud-2.webp'
import imgCloud3 from '@/assets/garden/cloud-3.webp'
// Pre-blurred black silhouettes of the clouds (cheaper than a live blur filter while zooming)
import imgCloudShadow1 from '@/assets/garden/cloud-1-shadow.webp'
import imgCloudShadow2 from '@/assets/garden/cloud-2-shadow.webp'
import imgCloudShadow3 from '@/assets/garden/cloud-3-shadow.webp'

// Scroll progress (0-1) at which the dream distortion begins
const DREAM_START = 0.65
// Maximum displacement of the liquid effect
const MAX_WOBBLE = 32
// Face position inside the girl picture (fraction of image width / height)
const FACE_X = 0.652
const FACE_Y = 0.105
// Face radius as a fraction of the girl's rendered width
const FACE_R = 0.08
// The face should end up about this large (fraction of the smaller viewport side)
const FACE_TARGET = 0.55
const FACE_WIDTH = 0.23

const CLOUDS = [
  { src: imgCloud1, shadowSrc: imgCloudShadow1, name: 'one' },
  { src: imgCloud2, shadowSrc: imgCloudShadow2, name: 'two' },
  { src: imgCloud3, shadowSrc: imgCloudShadow3, name: 'three' },
]

function CloudSet({ className, shadow }: { className: string; shadow?: boolean }) {
  return (
    <div className={className}>
      {CLOUDS.map((c) => (
        <img
          key={c.name}
          src={shadow ? c.shadowSrc : c.src}
          className={`${shadow ? 'dg-cloud-shadow' : 'dg-cloud'} dg-cloud-${c.name}`}
          alt=""
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export default function DreamLanding() {
  const sectionRef = useRef<HTMLElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const girlRef = useRef<HTMLDivElement>(null)
  const displacementRef = useRef<SVGFEDisplacementMapElement>(null)
  const turbulenceRef = useRef<SVGFETurbulenceElement>(null)

  useEffect(() => {
    const section = sectionRef.current!
    const camera = cameraRef.current!
    const image = imageRef.current!
    const girl = girlRef.current!
    const displacement = displacementRef.current!
    const turbulence = turbulenceRef.current!

    girl.style.setProperty('--fx', FACE_X * 100 + '%')
    girl.style.setProperty('--fy', FACE_Y * 100 + '%')

    // Layout is read only on resize; scroll frames just do math and write a transform
    let sectionStart = 0
    let scrollDistance = 1
    let faceX = 0
    let faceY = 0
    let maxZoom = 3
    let vw = 0
    let vh = 0

    const measure = () => {
      vw = window.innerWidth
      vh = window.innerHeight
      sectionStart = section.getBoundingClientRect().top + window.scrollY
      scrollDistance = Math.max(1, section.offsetHeight - vh)

      // Face position in unscaled scene coordinates (offsets ignore transforms)
      const girlW = girl.offsetWidth
      faceX = girl.offsetLeft + FACE_X * girlW
      faceY = girl.offsetTop + FACE_Y * girl.offsetHeight
      const targetSize = FACE_TARGET * Math.min(vw, vh)
      maxZoom = Math.max(3, Math.min(6, targetSize / (FACE_WIDTH * girlW)))

      girl.style.setProperty('--fr', FACE_R * girlW + 'px')
      image.style.transformOrigin = `${faceX}px ${faceY}px`
    }

    let dreaming = false
    let lastTransform = ''
    let lastScale = ''
    let lastFrequency = ''

    const update = () => {
      frame = 0
      const progress = Math.max(0, Math.min(1, (window.scrollY - sectionStart) / scrollDistance))

      const zoomProgress = Math.min(progress / DREAM_START, 1)
      const zoom = 1 + (maxZoom - 1) * zoomProgress
      const moveX = (vw / 2 - faceX) * zoomProgress
      const moveY = (vh / 2 - faceY) * zoomProgress
      const transform = `translate3d(${moveX.toFixed(1)}px, ${moveY.toFixed(1)}px, 0) scale(${zoom.toFixed(4)})`
      if (transform !== lastTransform) {
        image.style.transform = transform
        lastTransform = transform
      }

      const isDreaming = progress >= DREAM_START
      if (isDreaming !== dreaming) {
        camera.classList.toggle('dreaming', isDreaming)
        dreaming = isDreaming
      }

      // Rounded so the filter (and its noise texture) is only rebuilt when the change is visible
      let scale = '0'
      if (isDreaming) {
        const dreamProgress = Math.min(1, (progress - DREAM_START) / (1 - DREAM_START))
        scale = (Math.sin(dreamProgress * Math.PI) * MAX_WOBBLE).toFixed(1)
        const frequency = `${(0.008 + dreamProgress * 0.012).toFixed(4)} ${(0.012 + dreamProgress * 0.018).toFixed(4)}`
        if (frequency !== lastFrequency) {
          turbulence.setAttribute('baseFrequency', frequency)
          lastFrequency = frequency
        }
      }
      if (scale !== lastScale) {
        displacement.setAttribute('scale', scale)
        lastScale = scale
      }
    }

    let frame = 0
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const onResize = () => {
      measure()
      schedule()
    }

    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(section)
    resizeObserver.observe(girl)
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    measure()
    update()
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      <section ref={sectionRef} className="dream-section">
        <div ref={cameraRef} className="dream-camera">
          <div ref={imageRef} className="sleeping-image">
            <div className="dg-garden" style={{ backgroundImage: `url(${imgGarden})` }} />

            <CloudSet className="dg-shadow-layer dg-ground-shadows" shadow />

            <div ref={girlRef} className="dg-girl">
              <img src={imgGirl} alt="Girl lying in the garden" />
              <img className="face-layer" src={imgGirl} alt="" aria-hidden="true" />
            </div>

            <CloudSet className="dg-shadow-layer dg-girl-shadows" shadow />
            <CloudSet className="dg-cloud-layer" />
          </div>
        </div>
      </section>

      <svg className="dream-filters" aria-hidden="true">
        <filter id="dreamDistortion">
          <feTurbulence
            ref={turbulenceRef}
            type="fractalNoise"
            baseFrequency="0.008 0.012"
            numOctaves={2}
            seed={5}
          />
          <feDisplacementMap
            ref={displacementRef}
            in="SourceGraphic"
            scale={0}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
    </>
  )
}
