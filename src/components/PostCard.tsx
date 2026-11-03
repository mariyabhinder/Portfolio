// The postcard lying on the meadow (hero only). It shows its picture side; clicking it flips it over (like a phone's flip) and keeps it open until a click outside or Escape: the
// back carries her LinkedIn and email on its ruled lines, and lifts it toward the middle of the screen so it can be read.
// DreamLanding places the wrapper (translate + size, like the bag's hotspot); the card inside turns and lifts.

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import front from '../assets/meadow/postfront.webp'
import back from '../assets/meadow/postback1.webp'
import { EMAIL, GmailLogo, LINKEDIN_HREF, LinkedInLogo } from './FlowerCard'

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
    card.style.setProperty('--pc-dx', `${window.innerWidth / 2 - (r.left + r.width / 2)}px`)
    card.style.setProperty('--pc-dy', `${window.innerHeight / 2 - (r.top + r.height / 2)}px`)
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
          <span className="pc-face pc-back"><img src={back} alt="" draggable={false} /></span>
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
