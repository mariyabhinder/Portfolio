// The postcard lying on the meadow (hero only). It shows its picture side; clicking it flips it over (like a phone's flip) and keeps it open until a click outside or Escape: the
// back carries her LinkedIn and email on its ruled lines, and lifts it toward the middle of the screen so it can be read.
// DreamLanding places the wrapper (translate + size, like the bag's hotspot); the card inside turns and lifts.

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import front from '../assets/meadow/frontpost.webp'
import { EMAIL, GmailLogo, LINKEDIN_HREF, LinkedInLogo } from './FlowerCard'

// The back of the card, drawn as vector art (it was a 379px picture, which blurred when the card opens big). 376 x 269 units, like the card.
const PETALS = Array.from({ length: 12 }, (_, i) => i * 30 + 8 * ((i % 3) - 1))
const BackArt = () => (
  <svg viewBox="0 0 376 269" preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true" style={{ display: 'block' }}>
    <rect width="376" height="269" rx="3" fill="#fcefe7" />
    <text x="35" y="46" fontFamily="Lora, Georgia, serif" fontWeight="800" fontStyle="italic" fontSize="19" textLength="104" lengthAdjust="spacingAndGlyphs" fill="#2b2523">POSTCARD</text>
    {/* stamp, with its perforated edge cut out by a dotted stroke in the paper colour */}
    <rect x="298" y="22" width="54" height="68" fill="#8ca6c9" />
    <rect x="298" y="22" width="54" height="68" fill="none" stroke="#fcefe7" strokeWidth="5" strokeDasharray="0 7" strokeLinecap="round" />
    <g fill="none" stroke="#a9a14a" strokeWidth="1.2" strokeLinecap="round">
      {[48, 58, 68].map((y) => (
        <path key={y} d={`M238 ${y}q6-8 12 0t12 0t12 0t12 0`} />
      ))}
    </g>
    {PETALS.map((a) => (
      <g key={a} transform={`rotate(${a} 94 130)`}>
        <ellipse cx="94" cy="96" rx="8.5" ry="19" fill="#eba72c" />
        <path d="M94 84V106" stroke="#b5541d" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    ))}
    <circle cx="94" cy="130" r="19" fill="#a24a33" />
    <g stroke="#2b2523" strokeWidth="1.1">
      {[131, 169, 207, 245].map((y) => (
        <path key={y} d={`M173 ${y}H362`} />
      ))}
    </g>
  </svg>
)

const PostCard = forwardRef<HTMLDivElement, { rot: number; open?: boolean }>(function PostCard({ rot, open }, ref) {
  const [flipped, setFlipped] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const setRefs = useCallback((el: HTMLDivElement | null) => {
    wrapRef.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }, [ref])

  const openCard = useCallback((card: HTMLElement) => {
    // lift it to the middle of the screen, big enough to read (it is set in pixels at click time so it follows the layout)
    const r = card.getBoundingClientRect()
    const scale = Math.min(460, window.innerWidth * 0.88) / r.width
    // the wrapper is scaled by DreamLanding (small in the hero, near 1 at the end), and the card's translate lives inside that scale,
    // so the screen-pixel offset is divided by it
    const wrap = card.parentElement!
    const ps = wrap.getBoundingClientRect().width / wrap.offsetWidth || 1
    card.style.setProperty('--pc-dx', `${(window.innerWidth / 2 - (r.left + r.width / 2)) / ps}px`)
    card.style.setProperty('--pc-dy', `${(window.innerHeight / 2 - (r.top + r.height / 2)) / ps}px`)
    card.style.setProperty('--pc-scale', scale.toFixed(3))
    setFlipped(true)
  }, [])

  const toggle = useCallback((e: React.SyntheticEvent<HTMLDivElement>) => {
    e.stopPropagation()
    // once open it stays open until a click outside it or Escape
    if (!flipped) openCard(e.currentTarget.parentElement!)
  }, [flipped, openCard])

  // `open` (the end of the page) turns it over by itself; scrolling back up puts it down again
  useEffect(() => {
    if (!open) { setFlipped(false); return }
    const card = wrapRef.current?.querySelector<HTMLElement>('.pc-card')
    if (!card) return
    // wait a frame so the wrapper is visible and measured before it lifts
    const id = requestAnimationFrame(() => openCard(card))
    return () => cancelAnimationFrame(id)
  }, [open, openCard])

  useEffect(() => {
    if (!flipped) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFlipped(false) }
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node) || !wrapRef.current?.contains(e.target)) setFlipped(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [flipped])

  return (
    <div ref={setRefs} className="pc-wrap" style={{ zIndex: flipped ? 30 : 3 }}>
      <div className={`pc-card${flipped ? ' pc-card--flipped' : ''}`} style={{ ['--pc-rot' as string]: `${rot}rad` }}>
        <div
          role="button"
          tabIndex={0}
          className="pc-flip"
          aria-label="Turn the postcard over"
          aria-expanded={flipped}
          onClick={toggle}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e) } }}
        >
          <span className="pc-face pc-front"><img src={front} alt="" draggable={false} /></span>
          <span className="pc-face pc-back"><BackArt /></span>
        </div>
        <div className="pc-links" aria-hidden={!flipped}>
          <a href={LINKEDIN_HREF} target="_blank" rel="noopener noreferrer" className="pc-link pc-link--a" tabIndex={flipped ? 0 : -1} onClick={(e) => e.stopPropagation()}>
            <LinkedInLogo />
            <span>in/mariyah-bhinderwala-4aa1872a0</span>
          </a>
          <a href={`mailto:${EMAIL}`} className="pc-link pc-link--b" tabIndex={flipped ? 0 : -1} onClick={(e) => e.stopPropagation()}>
            <GmailLogo />
            <span>{EMAIL}</span>
          </a>
        </div>
      </div>
    </div>
  )
})

export default PostCard
