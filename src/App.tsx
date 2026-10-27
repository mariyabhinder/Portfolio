import { useState, useCallback, useRef } from 'react'
import DreamLanding from '@/components/DreamLanding'
import { ABOUT_BG_CSS } from '@/components/meadow/drop'

// Light mode hero assets (Desktop3)
import imgFlowers from '@/imports/Desktop3/2182658c973ab1a52c76c51bb6d97abfd86a119b.png'
import imgGirl from '@/imports/Desktop3/4d9b625cda7db4795acbc669b3e24b6ce67fd700.png'
import imgClouds from '@/imports/Desktop3/796a426395e97298329ac5c49fff09c0a5b9447e.png'
import svgPathsLight from '@/imports/Desktop3/svg-sl2qaxuwy8'

// Dark mode hero assets (Desktop6)
import imgNightFlowers from '@/imports/Desktop6/241774bfbf1980588ad71c0aeec74d9820eda7a2.png'
import imgNightSky from '@/imports/Desktop6/0353e4bc27890122cb60ed7cc7bd494df7c8c443.png'
import svgPathsDark from '@/imports/Desktop6/svg-t3rm6mk35m'


type QualityId = 'uiux' | 'stitching' | 'coffee' | 'stars' | 'mandala'

interface Quality {
  labelLight: string
  labelDark: string
  description: string
  bg: string
  textColor: string
  rotation: string
}

const QUALITIES: Record<QualityId, Quality> = {
  uiux: {
    labelLight: 'UI UX DESIGNING',
    labelDark: 'UI UX DESIGNING',
    description: 'Crafting beautiful, intuitive interfaces that bring joy to every user.',
    bg: 'rgba(252,106,146,0.92)',
    textColor: 'white',
    rotation: '-2deg',
  },
  stitching: {
    labelLight: 'CROSS STITCHING',
    labelDark: 'CROSS STITCHING',
    description: 'Stitching patterns with patience and love — each thread tells a story.',
    bg: 'rgba(107,166,86,0.92)',
    textColor: 'white',
    rotation: '2deg',
  },
  coffee: {
    labelLight: 'COFFEE LOVER',
    labelDark: 'COFFEE LOVER',
    description: 'A warm cup of coffee is the perfect companion for every creative session!',
    bg: 'rgba(243,255,150,0.96)',
    textColor: '#333',
    rotation: '-1.5deg',
  },
  stars: {
    labelLight: 'LOVE CAPTURING CLOUDS',
    labelDark: 'LOVE CAPTURING STARS',
    description: 'Finding beauty in the sky — clouds by day, stars by night.',
    bg: 'rgba(104,201,236,0.92)',
    textColor: 'white',
    rotation: '2.5deg',
  },
  mandala: {
    labelLight: 'MANDALA ART',
    labelDark: 'MANDALA ART',
    description: 'Creating intricate mandala patterns — a meditative and personal art form.',
    bg: 'rgba(255,255,255,0.96)',
    textColor: '#333',
    rotation: '-2deg',
  },
}

// Visual content of a quality popup (no positioning — positioning is handled by InteractiveZone)
function QualityPopupContent({
  quality,
  dark,
}: {
  quality: QualityId
  dark: boolean
}) {
  const q = QUALITIES[quality]
  const label = dark ? q.labelDark : q.labelLight
  return (
    <div
      className="px-4 py-3 shadow-lg min-w-[160px] max-w-[220px]"
      style={{ background: q.bg, color: q.textColor, transform: `rotate(${q.rotation})` }}
    >
      <p className="font-['Indie_Flower:Regular',sans-serif] text-lg font-bold text-center leading-tight whitespace-nowrap">
        {label}
      </p>
      {dark ? (
        <p className="font-['Indie_Flower:Regular',sans-serif] text-[13px] text-center mt-1 leading-snug">
          {q.description}
        </p>
      ) : null}
    </div>
  )
}

// Alpha channel of the cloud sprite, used to hit-test against the actual cloud shape
// (read the first time a cloud is hovered, so the sprite is not fetched and decoded while the page loads)
let cloudAlpha: { data: Uint8ClampedArray; w: number; h: number } | null = null
let cloudAlphaLoading = false
function loadCloudAlpha() {
  if (cloudAlphaLoading || typeof window === 'undefined') return
  cloudAlphaLoading = true
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    cloudAlpha = { data: ctx.getImageData(0, 0, canvas.width, canvas.height).data, w: canvas.width, h: canvas.height }
  }
  img.src = imgClouds
}

// True when the point lies on an opaque pixel of the rendered cloud <img>
function isOverCloud(imgEl: HTMLImageElement | null, clientX: number, clientY: number) {
  if (!imgEl) return false
  loadCloudAlpha()
  if (!cloudAlpha) return true // sprite not decoded yet — fall back to the box
  const r = imgEl.getBoundingClientRect()
  const x = Math.floor(((clientX - r.left) / r.width) * cloudAlpha.w)
  const y = Math.floor(((clientY - r.top) / r.height) * cloudAlpha.h)
  if (x < 0 || y < 0 || x >= cloudAlpha.w || y >= cloudAlpha.h) return false
  return cloudAlpha.data[(y * cloudAlpha.w + x) * 4 + 3] > 40
}

// Interactive zone: hover/tap shows popup
function InteractiveZone({
  qualityId,
  dark,
  activeQuality,
  onHoverIn,
  onHoverOut,
  onTap,
  className,
  style,
  popupSide,
  cloudImgClassName,
  children,
}: {
  qualityId: QualityId
  dark: boolean
  activeQuality: QualityId | null
  onHoverIn: (id: QualityId) => void
  onHoverOut: () => void
  onTap: (id: QualityId) => void
  className?: string
  style?: React.CSSProperties
  popupSide: 'left' | 'right' | 'below'
  // When set, the zone renders this crop of the cloud sprite and only reacts over its opaque pixels
  cloudImgClassName?: string
  children?: React.ReactNode
}) {
  const isActive = activeQuality === qualityId
  const cloudRef = useRef<HTMLImageElement>(null)
  const [overShape, setOverShape] = useState(false)

  const handleMove = (e: React.MouseEvent) => {
    if (!cloudImgClassName) return
    const over = isOverCloud(cloudRef.current, e.clientX, e.clientY)
    if (over === overShape) return
    setOverShape(over)
    if (over) onHoverIn(qualityId)
    else onHoverOut()
  }

  return (
    <div
      className={`absolute select-none ${cloudImgClassName && !overShape ? '' : 'cursor-pointer'} ${className ?? ''}`}
      style={{ ...(style ?? {}), zIndex: 40 }}
      onMouseEnter={cloudImgClassName ? handleMove : () => onHoverIn(qualityId)}
      onMouseMove={handleMove}
      onMouseLeave={() => { setOverShape(false); onHoverOut() }}
      onClick={(e) => {
        if (cloudImgClassName && !isOverCloud(cloudRef.current, e.clientX, e.clientY)) return
        e.stopPropagation()
        onTap(qualityId)
      }}
    >
      {cloudImgClassName ? (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img ref={cloudRef} alt="" className={`absolute max-w-none ${cloudImgClassName}`} src={imgClouds} />
        </div>
      ) : popupSide === 'below' && (
        // Invisible enlarged hit area to make hovering anywhere over a cloud trigger the zone
        <div style={{ position: 'absolute', left: '-30%', top: '-30%', width: '160%', height: '160%', pointerEvents: 'auto' }} />
      )}
      {children}
      <div
        style={{
          opacity: isActive ? 1 : 0,
          transform: isActive
            ? (popupSide === 'right' ? 'translateY(-50%)' : popupSide === 'left' ? 'translateY(-50%)' : 'translateX(-50%) translateY(0)')
            : (popupSide === 'right' ? 'translateY(-50%) scale(0.88)' : popupSide === 'left' ? 'translateY(-50%) scale(0.88)' : 'translateX(-50%) translateY(-4px) scale(0.96)'),
          transition: 'opacity 0.22s ease, transform 0.22s ease',
          position: 'absolute',
          zIndex: 50,
          pointerEvents: 'none',
          ...(popupSide === 'right' ? { left: '105%', top: '50%' } :
              popupSide === 'left'  ? { right: '105%', top: '50%' } :
              { top: 'calc(100% - 2px)', left: '50%' }),
        }}
      >
        <div style={{ display: 'inline-block' }}>
          <div
            className={dark ? "px-4 py-3 shadow-lg min-w-[160px] max-w-[220px]" : "px-1 py-0 shadow-lg min-w-[120px] max-w-[220px]"}
            style={{ background: QUALITIES[qualityId].bg, color: QUALITIES[qualityId].textColor, transform: `rotate(${QUALITIES[qualityId].rotation})` }}
          >
            <p className="font-['Indie_Flower:Regular',sans-serif] text-lg font-bold text-center leading-tight whitespace-nowrap">
              {dark ? QUALITIES[qualityId].labelDark : QUALITIES[qualityId].labelLight}
            </p>
            {dark ? (
              <p className="font-['Indie_Flower:Regular',sans-serif] text-[13px] text-center mt-1 leading-snug">
                {QUALITIES[qualityId].description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// Glowing blue star SVG for dark mode interactive stars
function GlowingStar({ size = 96, id }: { size?: number; id: string }) {
  const half = size / 2
  const armW = size * 0.022
  const armH = size * 0.46
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a8e6ff" stopOpacity="0.9" />
          <stop offset="35%" stopColor="#5bc8f5" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3aa8e8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`core-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="#90deff" stopOpacity="0.7" />
        </radialGradient>
      </defs>
      {/* Outer glow */}
      <circle cx={half} cy={half} r={half} fill={`url(#glow-${id})`} />
      {/* Vertical arm */}
      <ellipse cx={half} cy={half} rx={armW} ry={armH} fill="white" opacity="0.92" />
      {/* Horizontal arm */}
      <ellipse cx={half} cy={half} rx={armH} ry={armW} fill="white" opacity="0.92" />
      {/* Diagonal arms */}
      <ellipse cx={half} cy={half} rx={armW * 0.7} ry={armH * 0.55} fill="white" opacity="0.6" transform={`rotate(45 ${half} ${half})`} />
      <ellipse cx={half} cy={half} rx={armW * 0.7} ry={armH * 0.55} fill="white" opacity="0.6" transform={`rotate(-45 ${half} ${half})`} />
      {/* Bright core */}
      <circle cx={half} cy={half} r={size * 0.06} fill={`url(#core-${id})`} />
    </svg>
  )
}

// Small decorative white star for dark mode background
function TinyStar({ x, y, size }: { x: string; y: string; size: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
    >
      <div
        className="rounded-full bg-white"
        style={{ width: size, height: size, opacity: 0.6 + Math.random() * 0.4 }}
      />
    </div>
  )
}

// Light mode toggle
function LightToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Switch to dark mode"
      className="absolute cursor-pointer focus:outline-none"
      style={{ left: '84.4%', top: '62.8%' }}
    >
      <div className="relative h-[73px] w-[187px]">
        <div className="absolute bg-[#bbedff] border-[3px] border-solid border-white inset-0 rounded-[40px]" />
        {/* Yellow sun circle on left */}
        <div className="absolute" style={{ left: '8%', top: '17.8%', width: '25%', height: '66%' }}>
          <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" fill="#F3FF96" fillOpacity="0.9" r="22.5" stroke="white" strokeWidth="3" />
          </svg>
        </div>
        {/* Cloud on right */}
        <div className="absolute overflow-hidden" style={{ left: '45%', right: '22%', top: '19px', aspectRatio: '248/146' }}>
          <img alt="" className="absolute h-[342.47%] left-[-101.61%] max-w-none top-[-242.47%] w-[201.61%]" src={imgClouds} />
        </div>
      </div>
    </button>
  )
}

// Dark mode toggle
function DarkToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Switch to light mode"
      className="absolute cursor-pointer focus:outline-none"
      style={{ left: '84.4%', top: '62.8%' }}
    >
      <div className="relative h-[73px] w-[187px]">
        <div className="absolute bg-[#000a40] border-[3px] border-solid border-white inset-0 rounded-[40px]" />
        {/* Moon on right */}
        <div className="absolute" style={{ right: '8%', top: '17.8%', width: '25%', height: '66%' }}>
          <svg className="w-full h-full" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" fill="white" r="22.5" stroke="white" strokeWidth="3" />
          </svg>
          {/* Moon crater overlay */}
          <div className="absolute" style={{ left: '28%', top: '20%', width: '56%', height: '58%' }}>
            <svg className="w-full h-full" viewBox="0 0 42 42" fill="none">
              <circle cx="21" cy="21" fill="#000A40" r="21" />
            </svg>
          </div>
        </div>
        {/* Glare effect on left */}
        <div
          className="absolute bg-black mix-blend-color-dodge"
          style={{ left: '21%', top: '18%', width: '26%', height: '64%' }}
        >
          <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 28 42">
            <ellipse cx="14" cy="21" fill="url(#moon-glare)" rx="5.5" ry="21" />
            <defs>
              <radialGradient id="moon-glare" gradientTransform="translate(14 21) rotate(90) scale(21 5.5)" gradientUnits="userSpaceOnUse">
                <stop offset="0.15" stopColor="white" />
                <stop offset="1" stopColor="white" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </button>
  )
}

// Mobile light mode toggle (small)
function MobileLightToggle({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Switch to dark mode" className="absolute cursor-pointer focus:outline-none" style={{ right: '5%', top: '56%' }}>
      <div className="relative h-[20px] w-[53px]">
        <div className="absolute bg-[#bceeff] inset-0 rounded-[40px] border-2 border-white" />
        <div className="absolute" style={{ left: '7.5%', top: '20%', width: '22%', height: '60%' }}>
          <svg className="w-full h-full" viewBox="0 0 12 11" fill="none">
            <path d="M6 0.5C3.0147 0.5 0.5 3.0147 0.5 6C0.5 8.9853 3.0147 11.5 6 11.5C8.9853 11.5 11.5 8.9853 11.5 6C11.5 3.0147 8.9853 0.5 6 0.5Z" fill="#F3FF96" fillOpacity="0.8" stroke="white" />
          </svg>
        </div>
        <div className="absolute overflow-hidden" style={{ left: '45%', right: '15%', top: '3px', aspectRatio: '248/146' }}>
          <img alt="" className="absolute h-[342.47%] left-[-101.61%] max-w-none top-[-242.47%] w-[201.61%]" src={imgClouds} />
        </div>
      </div>
    </button>
  )
}

function MobileDarkToggle({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Switch to light mode" className="absolute cursor-pointer focus:outline-none" style={{ right: '5%', top: '56%' }}>
      <div className="relative h-[20px] w-[53px]">
        <div className="absolute bg-[#000a40] inset-0 rounded-[40px] border-2 border-white" />
        <div className="absolute" style={{ right: '7.5%', top: '20%', width: '22%', height: '60%' }}>
          <svg className="w-full h-full" viewBox="0 0 12 11" fill="none">
            <circle cx="6" cy="5.5" r="5.5" fill="white" />
          </svg>
        </div>
        <div className="absolute" style={{ right: '20%', top: '15%', width: '22%', height: '70%' }}>
          <svg className="w-full h-full" viewBox="0 0 13 12" fill="none">
            <ellipse cx="6.5" cy="6" fill="#000A40" rx="6.5" ry="6" />
          </svg>
        </div>
      </div>
    </button>
  )
}

// Scattered tiny stars for dark mode background
const TINY_STARS = [
  { x: '8%', y: '3%', s: 2 }, { x: '15%', y: '8%', s: 1.5 }, { x: '22%', y: '5%', s: 2.5 },
  { x: '30%', y: '2%', s: 1.5 }, { x: '42%', y: '6%', s: 2 }, { x: '55%', y: '3%', s: 1 },
  { x: '63%', y: '8%', s: 2 }, { x: '72%', y: '4%', s: 1.5 }, { x: '78%', y: '11%', s: 2.5 },
  { x: '88%', y: '6%', s: 1.5 }, { x: '93%', y: '2%', s: 2 }, { x: '97%', y: '9%', s: 1 },
  { x: '3%', y: '18%', s: 1.5 }, { x: '10%', y: '25%', s: 2 }, { x: '18%', y: '19%', s: 1 },
  { x: '28%', y: '22%', s: 2 }, { x: '39%', y: '14%', s: 1.5 }, { x: '52%', y: '18%', s: 1 },
  { x: '59%', y: '13%', s: 2 }, { x: '66%', y: '18%', s: 1.5 }, { x: '74%', y: '14%', s: 1 },
  { x: '82%', y: '22%', s: 2 }, { x: '90%', y: '17%', s: 1.5 }, { x: '95%', y: '25%', s: 1 },
  { x: '6%', y: '33%', s: 1.5 }, { x: '14%', y: '38%', s: 1 }, { x: '25%', y: '35%', s: 2 },
  { x: '45%', y: '27%', s: 1.5 }, { x: '58%', y: '33%', s: 1 }, { x: '76%', y: '28%', s: 2 },
  { x: '85%', y: '35%', s: 1.5 }, { x: '92%', y: '30%', s: 1 },
]

// HERO SECTION
function HeroSection({
  dark,
  onToggle,
}: {
  dark: boolean
  onToggle: () => void
}) {
  // null = nothing active; QualityId = that quality's popup is showing
  const [activeQuality, setActiveQuality] = useState<QualityId | null>(null)
  const [showGirlCard, setShowGirlCard] = useState(false)

  const handleHoverIn = useCallback((id: QualityId) => {
    setActiveQuality(id)
  }, [])
  const handleHoverOut = useCallback(() => {
    setActiveQuality(null)
  }, [])
  const handleTap = useCallback((id: QualityId) => {
    setActiveQuality(prev => prev === id ? null : id)
  }, [])
  const handleOutsideClick = useCallback(() => {
    setActiveQuality(null)
  }, [])

  const handleOutsideClickAll = useCallback(() => {
    setActiveQuality(null)
    setShowGirlCard(false)
  }, [])

  const handleGirlHoverIn = useCallback(() => setShowGirlCard(true), [])
  const handleGirlHoverOut = useCallback(() => setShowGirlCard(false), [])

  return (
    <section
      className="relative w-full overflow-hidden max-h-screen"
      style={{ aspectRatio: '1440 / 1022', maxHeight: '100vh' }}
      onClick={handleOutsideClickAll}
    >
      {dark ? (
        <DarkHero
          activeQuality={activeQuality}
          onHoverIn={handleHoverIn}
          onHoverOut={handleHoverOut}
          onTap={handleTap}
          onToggle={onToggle}
          showGirlCard={showGirlCard}
          onGirlHoverIn={handleGirlHoverIn}
          onGirlHoverOut={handleGirlHoverOut}
        />
      ) : (
        <LightHero
          activeQuality={activeQuality}
          onHoverIn={handleHoverIn}
          onHoverOut={handleHoverOut}
          onTap={handleTap}
          onToggle={onToggle}
          showGirlCard={showGirlCard}
          onGirlHoverIn={handleGirlHoverIn}
          onGirlHoverOut={handleGirlHoverOut}
        />
      )}
    </section>
  )
}

// Mobile hero section — smaller canvas, tap-based interactions
function MobileHeroSection({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const [activeQuality, setActiveQuality] = useState<QualityId | null>(null)
  const handleHoverIn = useCallback((id: QualityId) => setActiveQuality(id), [])
  const handleHoverOut = useCallback(() => setActiveQuality(null), [])
  const handleTap = useCallback((id: QualityId) => {
    setActiveQuality(prev => prev === id ? null : id)
  }, [])

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '428 / 310' }}
      onClick={() => setActiveQuality(null)}
    >
      {dark ? (
        <MobileDarkHero
          activeQuality={activeQuality}
          onHoverIn={handleHoverIn}
          onHoverOut={handleHoverOut}
          onTap={handleTap}
          onToggle={onToggle}
        />
      ) : (
        <MobileLightHero
          activeQuality={activeQuality}
          onHoverIn={handleHoverIn}
          onHoverOut={handleHoverOut}
          onTap={handleTap}
          onToggle={onToggle}
        />
      )}
    </section>
  )
}

type HeroProps = {
  activeQuality: QualityId | null
  onHoverIn: (id: QualityId) => void
  onHoverOut: () => void
  onTap: (id: QualityId) => void
  onToggle: () => void
}

// Desktop Light Hero (1440×1022 canvas, % positions)
type HeroExtraProps = {
  showGirlCard: boolean
  onGirlHoverIn: () => void
  onGirlHoverOut: () => void
}

function LightHero({ activeQuality, onHoverIn, onHoverOut, onTap, onToggle, showGirlCard, onGirlHoverIn, onGirlHoverOut }: HeroProps & HeroExtraProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#bbedff] from-[49%] to-white">

      {/* === Decorative clouds (background, non-interactive) === */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '-7.4%', top: '34.5%', width: '25.8%', height: '12.5%' }}>
        <img alt="" className="absolute h-[289.69%] left-0 max-w-none top-[-104.93%] w-full" src={imgClouds} />
      </div>
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '88.8%', top: '34.8%', width: '17.2%', height: '14.3%' }}>
        <img alt="" className="absolute h-[342.47%] left-[-101.61%] max-w-none top-[-242.47%] w-[201.61%]" src={imgClouds} />
      </div>

      {/* === Flowers (bottom) === */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '32.1%', top: '68%', width: '40.3%', height: '32.2%' }}>
        <img alt="" className="absolute h-[249.58%] left-0 max-w-none top-[-149.58%] w-full" src={imgFlowers} />
      </div>
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '72.4%', top: '67.8%', width: '40.3%', height: '32.2%' }}>
        <img alt="" className="absolute h-[249.58%] left-0 max-w-none top-[-149.58%] w-full" src={imgFlowers} />
      </div>
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '0', top: '70.4%', width: '37.3%', height: '29.7%' }}>
        <img alt="" className="absolute h-[249.58%] left-0 max-w-none top-[-149.58%] w-full" src={imgFlowers} />
      </div>

      {/* === Girl (hoverable) === */}
      <div className="absolute overflow-hidden" style={{ left: '7.8%', top: '50.1%', width: '46.4%', height: '51.8%', cursor: 'pointer', zIndex: 9999 }} onMouseEnter={onGirlHoverIn} onMouseLeave={onGirlHoverOut}>
        <img alt="" className="absolute h-[168.27%] left-0 max-w-none top-[-68.26%] w-full" src={imgGirl} />
      </div>

      {/* === "Hi I'm Mariyah" === */}
      <div className="absolute" style={{ left: '2%', top: '48.6%' }}>
        <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-[#e85069] leading-normal"
          style={{ fontSize: 'clamp(20px, 3.33vw, 48px)', lineHeight: 1.2 }}>
          Hi I'm<br />Mariyah
        </p>
        {/* Arrow */}
        <div className="absolute" style={{ left: '12%', top: '56%', width: '60%', height: '40%' }}>
          <div style={{ transformOrigin: 'center', transform: 'rotate(18deg)', width: '100%', height: '100%' }}>
            <svg className="w-full h-full" fill="none" viewBox="0 0 133.001 58.002" preserveAspectRatio="none">
              <path d={svgPathsLight.p2bdc9e00} stroke="#C75C7A" strokeLinecap="round" strokeMiterlimit="16" strokeWidth="5" />
            </svg>
          </div>
        </div>
      </div>

      {/* === "hover on clouds" hint === */}
      <div className="absolute pointer-events-none" style={{ left: '27%', top: '27%' }}>
        <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-black text-center"
          style={{ fontSize: 'clamp(8px, 1.1vw, 16px)', width: '9.4vw', maxWidth: 136, lineHeight: 1.3 }}>
          *hover on clouds to know about me*
        </p>
      </div>

      {/* === "I design beautiful things" card (shows on girl hover) === */}
      <div className="absolute" style={{ left: '28.5%', top: '58.8%', width: '25.7%', pointerEvents: 'none' }}>
        <div className={`bg-[rgba(243,255,150,0.44)] px-[10px] py-[10px] transition-opacity duration-200 ${showGirlCard ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-black text-center leading-normal"
            style={{ fontSize: 'clamp(13px, 2.22vw, 32px)' }}>
            I design beautiful things and stitch ideas together.
          </p>
        </div>
      </div>

      {/* === Interactive cloud zones (each triggers a quality popup, hit-tested on the cloud shape) === */}

      {/* UI/UX Designing — left cloud */}
      <InteractiveZone
        qualityId="uiux"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '-8.7%', top: '1.8%', width: '40.3%', height: '19.7%' }}
        cloudImgClassName="h-[289.69%] left-0 top-[-104.93%] w-full"
      />

      {/* Cross Stitching — center cloud */}
      <InteractiveZone
        qualityId="stitching"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '38.4%', top: '1.8%', width: '26.6%', height: '20%' }}
        cloudImgClassName="h-[353.43%] left-0 top-[-253.43%] w-[188.25%]"
      />

      {/* Coffee Lover — right cloud */}
      <InteractiveZone
        qualityId="coffee"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '80.2%', top: '2.8%', width: '26.6%', height: '20%' }}
        cloudImgClassName="h-[353.43%] left-0 top-[-253.43%] w-[188.25%]"
      />

      {/* Love Capturing Clouds — center-right cloud */}
      <InteractiveZone
        qualityId="stars"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '58.8%', top: '19.7%', width: '31.2%', height: '15.2%' }}
        cloudImgClassName="h-[289.69%] left-0 top-[-104.93%] w-full"
      />

      {/* Mandala Art — center small cloud (popup to the right so it never covers the girl's face) */}
      <InteractiveZone
        qualityId="mandala"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '33.7%', top: '30.6%', width: '20.5%', height: '17%' }}
        cloudImgClassName="h-[342.47%] left-[-101.61%] top-[-242.47%] w-[201.61%]"
      />

      {/* === Toggle === */}
      <LightToggle onClick={onToggle} />
      <div className="absolute font-['Indie_Flower:Regular',sans-serif] not-italic text-black text-center pointer-events-none"
        style={{ left: '85.5%', top: '60.5%', fontSize: 'clamp(8px, 1.1vw, 16px)' }}>
        Light mode
      </div>
    </div>
  )
}

// Desktop Dark Hero (1440×1022 canvas)
function DarkHero({ activeQuality, onHoverIn, onHoverOut, onTap, onToggle, showGirlCard, onGirlHoverIn, onGirlHoverOut }: HeroProps & HeroExtraProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#000d25] from-[49%] to-[#0e1839]">

      {/* Night sky overlay */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '-4.9%', top: '0', width: '111.9%', height: '35.7%' }}>
        <img alt="" className="absolute h-[263.21%] left-0 max-w-none top-0 w-full" src={imgNightSky} />
      </div>

      {/* Night flowers/ground */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '-4.1%', top: '55.1%', width: '111.9%', height: '52.3%' }}>
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src={imgNightFlowers} />
      </div>

      {/* Decorative tiny stars (non-interactive) */}
      {TINY_STARS.map((s, i) => (
        <TinyStar key={i} x={s.x} y={s.y} size={s.s} />
      ))}

      {/* === Girl (hoverable) === */}
      <div className="absolute overflow-hidden" style={{ left: '7.8%', top: '50.1%', width: '46.4%', height: '51.8%', cursor: 'pointer', zIndex: 9999 }} onMouseEnter={onGirlHoverIn} onMouseLeave={onGirlHoverOut}>
        <img alt="" className="absolute h-[168.27%] left-0 max-w-none top-[-68.26%] w-full" src={imgGirl} />
      </div>

      {/* === "Hi I'm Mariyah" — white text in dark mode === */}
      <div className="absolute" style={{ left: '2%', top: '48.6%' }}>
        <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-white leading-normal"
          style={{ fontSize: 'clamp(20px, 3.33vw, 48px)', lineHeight: 1.2 }}>
          Hi I'm<br />Mariyah
        </p>
        <div className="absolute" style={{ left: '12%', top: '56%', width: '60%', height: '40%' }}>
          <div style={{ transformOrigin: 'center', transform: 'rotate(18deg)', width: '100%', height: '100%' }}>
            <svg className="w-full h-full" fill="none" viewBox="0 0 133.001 58.002" preserveAspectRatio="none">
              <path d={svgPathsDark.p2bdc9e00} stroke="white" strokeLinecap="round" strokeMiterlimit="16" strokeWidth="5" />
            </svg>
          </div>
        </div>
      </div>

      {/* === "hover on stars" hint === */}
      <div className="absolute pointer-events-none" style={{ left: '18.5%', top: '29.5%' }}>
        <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-white text-center"
          style={{ fontSize: 'clamp(8px, 1.1vw, 16px)', width: '9.4vw', maxWidth: 136, lineHeight: 1.3 }}>
          *hover on stars to know about me*
        </p>
      </div>

      {/* === "I design beautiful things" card (shows on girl hover) === */}
      <div className="absolute" style={{ left: '29.5%', top: '55.9%', width: '25.7%', pointerEvents: 'none' }}>
        <div className={`bg-[rgba(243,255,150,0.8)] px-[10px] py-[10px] transition-opacity duration-200 ${showGirlCard ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-black text-center leading-normal"
            style={{ fontSize: 'clamp(13px, 2.22vw, 32px)' }}>
            I design beautiful things and stitch ideas together.
          </p>
        </div>
      </div>

      {/* ===================================================================
          INTERACTIVE BLUE GLOWING STARS
          5 stars, one per quality. Only these are interactive.
          Small white stars above are purely decorative (no pointer events).
          =================================================================== */}

      {/* STAR 1 — UI/UX DESIGNING: upper-left area */}
      <InteractiveZone
        qualityId="uiux"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '3.5%', top: '10%', width: '6.25%', height: '9%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={90} id="uiux-desk" />
        </div>
      </InteractiveZone>

      {/* STAR 2 — CROSS STITCHING: upper-center (Glare at ~510,75 in 1440px canvas) */}
      <InteractiveZone
        qualityId="stitching"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '33%', top: '5%', width: '9%', height: '13%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={119} id="stitching-desk" />
        </div>
      </InteractiveZone>

      {/* STAR 3 — COFFEE LOVER: upper-right area */}
      <InteractiveZone
        qualityId="coffee"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="left"
        style={{ left: '87%', top: '9%', width: '6%', height: '9%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={86} id="coffee-desk" />
        </div>
      </InteractiveZone>

      {/* STAR 4 — LOVE CAPTURING STARS: right-center (Glare/6 at ~1009,222 in 1440px canvas) */}
      <InteractiveZone
        qualityId="stars"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="left"
        style={{ left: '68%', top: '19%', width: '9%', height: '13%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={129} id="stars-desk" />
        </div>
      </InteractiveZone>

      {/* STAR 5 — MANDALA ART: center (Glare1 at ~699,319 in 1440px canvas) */}
      <InteractiveZone
        qualityId="mandala"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '46.5%', top: '28%', width: '7%', height: '10%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={96} id="mandala-desk" />
        </div>
      </InteractiveZone>

      {/* === Toggle === */}
      <DarkToggle onClick={onToggle} />
      <div className="absolute font-['Indie_Flower:Regular',sans-serif] not-italic text-white text-center pointer-events-none"
        style={{ left: '86.5%', top: '60%', fontSize: 'clamp(8px, 1.1vw, 16px)' }}>
        Dark mode
      </div>
    </div>
  )
}

// Mobile Light Hero (428×310 canvas, % positions)
function MobileLightHero({ activeQuality, onHoverIn, onHoverOut, onTap, onToggle }: HeroProps) {
  return (
    <div className="absolute inset-0 bg-[#bceeff]">
      {/* Clouds */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '-15.7%', top: '29.4%', width: '35.1%', height: '16.7%' }}>
        <img alt="" className="absolute h-[289.69%] left-0 max-w-none top-[-104.93%] w-full" src={imgClouds} />
      </div>
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '90.2%', top: '35.5%', width: '19.6%', height: '16%' }}>
        <img alt="" className="absolute h-[342.47%] left-[-101.61%] max-w-none top-[-242.47%] w-[201.61%]" src={imgClouds} />
      </div>

      {/* Flowers */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '0', top: '67.5%', width: '40.9%', height: '32%' }}>
        <img alt="" className="absolute h-[249.58%] left-0 max-w-none top-[-149.58%] w-full" src={imgFlowers} />
      </div>
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '40.9%', top: '64.8%', width: '44.2%', height: '34.5%' }}>
        <img alt="" className="absolute h-[249.58%] left-0 max-w-none top-[-149.58%] w-full" src={imgFlowers} />
      </div>
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '85.1%', top: '64.8%', width: '44.2%', height: '34.5%' }}>
        <img alt="" className="absolute h-[249.58%] left-0 max-w-none top-[-149.58%] w-full" src={imgFlowers} />
      </div>

      {/* Girl */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '12.6%', top: '57.7%', width: '39.9%', height: '43.5%' }}>
        <img alt="" className="absolute h-[168.27%] left-0 max-w-none top-[-68.26%] w-full" src={imgGirl} />
      </div>

      {/* Hi I'm Mariyah */}
      <div className="absolute" style={{ left: '3.7%', top: '46.1%' }}>
        <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-[#e85069] leading-normal"
          style={{ fontSize: 'clamp(10px, 3.85vw, 16.5px)', lineHeight: 1.2 }}>
          Hi I'm<br />Mariyah
        </p>
      </div>

      {/* Interactive cloud zones — mobile */}
      <InteractiveZone
        qualityId="uiux"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '-9.6%', top: '4.2%', width: '41.1%', height: '19.6%' }}
        cloudImgClassName="h-[289.69%] left-0 top-[-104.93%] w-full"
      />
      <InteractiveZone
        qualityId="stitching"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '40.9%', top: '4.8%', width: '22.4%', height: '16.5%' }}
        cloudImgClassName="h-[353.43%] left-0 top-[-253.43%] w-[188.25%]"
      />
      <InteractiveZone
        qualityId="coffee"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '84.6%', top: '8.1%', width: '19.6%', height: '16%' }}
        cloudImgClassName="h-[342.47%] left-[-101.61%] top-[-242.47%] w-[201.61%]"
      />
      <InteractiveZone
        qualityId="stars"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="below"
        style={{ left: '62.1%', top: '21.3%', width: '22.4%', height: '16.5%' }}
        cloudImgClassName="h-[353.43%] left-0 top-[-253.43%] w-[188.25%]"
      />
      <InteractiveZone
        qualityId="mandala"
        dark={false}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '25.9%', top: '31.6%', width: '19.6%', height: '16%' }}
        cloudImgClassName="h-[342.47%] left-[-101.61%] top-[-242.47%] w-[201.61%]"
      />

      {/* Mobile toggle */}
      <MobileLightToggle onClick={onToggle} />
    </div>
  )
}

// Mobile Dark Hero (428×310 canvas)
function MobileDarkHero({ activeQuality, onHoverIn, onHoverOut, onTap, onToggle }: HeroProps) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#000d25] to-[#0e1839]">
      {/* Night sky */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '-60%', top: '-9%', width: '172.2%', height: '60.3%' }}>
        <img alt="" className="absolute h-[263.21%] left-0 max-w-none top-0 w-full" src={imgNightSky} />
      </div>
      {/* Night flowers */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '0', top: '46%', width: '100%', height: '54%' }}>
        <img alt="" className="absolute inset-0 w-full h-full object-cover" src={imgNightFlowers} />
      </div>

      {/* Tiny decorative stars (non-interactive) */}
      {TINY_STARS.slice(0, 20).map((s, i) => (
        <TinyStar key={i} x={s.x} y={s.y} size={s.s * 0.8} />
      ))}

      {/* Girl */}
      <div className="absolute pointer-events-none overflow-hidden" style={{ left: '10.7%', top: '51.3%', width: '37.1%', height: '40.6%' }}>
        <img alt="" className="absolute h-[168.27%] left-0 max-w-none top-[-68.26%] w-full" src={imgGirl} />
      </div>

      {/* Hi I'm Mariyah — white */}
      <div className="absolute" style={{ left: '4.7%', top: '40.6%' }}>
        <p className="font-['Indie_Flower:Regular',sans-serif] not-italic text-white leading-normal"
          style={{ fontSize: 'clamp(8px, 3.05vw, 13px)', lineHeight: 1.2 }}>
          Hi I'm<br />Mariyah
        </p>
      </div>

      {/* Interactive stars — mobile dark mode */}

      {/* STAR 1: UI/UX — upper left */}
      <InteractiveZone
        qualityId="uiux"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '2%', top: '6%', width: '12%', height: '17%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={42} id="uiux-mob" />
        </div>
      </InteractiveZone>

      {/* STAR 2: CROSS STITCHING — upper center-left */}
      <InteractiveZone
        qualityId="stitching"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '28.3%', top: '8.7%', width: '11%', height: '15%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={46} id="stitching-mob" />
        </div>
      </InteractiveZone>

      {/* STAR 3: COFFEE LOVER — upper right */}
      <InteractiveZone
        qualityId="coffee"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="left"
        style={{ left: '80%', top: '5%', width: '12%', height: '16%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={40} id="coffee-mob" />
        </div>
      </InteractiveZone>

      {/* STAR 4: LOVE CAPTURING STARS — right-center */}
      <InteractiveZone
        qualityId="stars"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="left"
        style={{ left: '63%', top: '22%', width: '11%', height: '15%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={46} id="stars-mob" />
        </div>
      </InteractiveZone>

      {/* STAR 5: MANDALA ART — center */}
      <InteractiveZone
        qualityId="mandala"
        dark={true}
        activeQuality={activeQuality}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
        onTap={onTap}
        popupSide="right"
        style={{ left: '46%', top: '30%', width: '10%', height: '15%' }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <GlowingStar size={40} id="mandala-mob" />
        </div>
      </InteractiveZone>

      {/* Mobile dark toggle */}
      <MobileDarkToggle onClick={onToggle} />
    </div>
  )
}


// ======= MAIN APP =======

export default function App() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* Dream scroll landing */}
      <DreamLanding />
      {/* About Me: the dream's last scroll ends on this plain background; the section's content goes here */}
      <section id="about" className="min-h-screen w-full" style={{ background: ABOUT_BG_CSS }} />
    </div>
  )
}
