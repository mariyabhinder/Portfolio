// Her ID card on its lanyard, dropped on the grass by her head (hero only), like the postcard. Clicking it picks it up: the grass copy
// fades and the 3D lanyard (Lanyard.tsx, ported from the id-component project) swings in, hanging from the top of the screen.
// Drag the card to throw it about; click it to flip it over. A click off the card, the close button or Escape puts it down.
// DreamLanding places the grass wrapper (translate + size, like the postcard's).

import { forwardRef, lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import front from '../assets/meadow/id-front.webp'
import back from '../assets/meadow/id-back.webp'
import { EMAIL, GmailLogo, LINKEDIN_HREF, LinkedInLogo } from './FlowerCard'

// three.js is only fetched the first time the card is picked up
const Lanyard = lazy(() => import('./Lanyard'))

const STRAP = '#d9667f'
const STRAP_LIGHT = '#f2a3b4'

function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}

/** The lanyard lying on the grass: the ribbon in a loose loop, the clip, and the card face up. 100 x 100 units. */
function GrassArt() {
  const loop = 'M53 27 C 34 0, 2 14, 8 48 C 13 76, 34 76, 38 56 C 41 42, 48 32, 58 27'
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <clipPath id="id-grass-card"><rect x="44" y="32" width="34" height="47.8" rx="3.2" /></clipPath>
      </defs>
      <path d={loop} fill="none" stroke={STRAP} strokeWidth="6.5" strokeLinecap="round" />
      <path d={loop} fill="none" stroke={STRAP_LIGHT} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 4" />
      <g transform="rotate(14 61 56)">
        <image href={front} x="44" y="32" width="34" height="47.8" preserveAspectRatio="none" clipPath="url(#id-grass-card)" />
        <rect x="44" y="32" width="34" height="47.8" rx="3.2" fill="none" stroke="#e2d6bd" strokeWidth="0.5" />
        <rect x="57" y="26" width="6" height="9" rx="1.5" fill="#cfd2d6" stroke="#8d939a" strokeWidth="0.7" />
      </g>
    </svg>
  )
}

const IdLanyard = forwardRef<HTMLButtonElement, { rot: number }>(function IdLanyard({ rot }, ref) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={`id-grass${open ? ' id-grass--up' : ''}`}
        aria-label="Pick up her ID card"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        style={{ ['--id-rot' as string]: `${rot}rad` }}
      >
        <span className="id-grass__art"><GrassArt /></span>
      </button>
      {open ? createPortal(<Hanging onClose={() => setOpen(false)} />, document.body) : null}
    </>
  )
})

function Hanging({ onClose }: { onClose: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const [webgl] = useState(hasWebGL2)

  const close = useCallback(() => {
    setLeaving((was) => {
      if (!was) window.setTimeout(onClose, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380)
      return true
    })
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    // the page stays put while it hangs there
    const stop = (e: Event) => e.preventDefault()
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', stop, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', stop)
    }
  }, [close])

  return (
    <div className={`id-hang${leaving ? ' id-hang--leaving' : ''}`} role="dialog" aria-label="Her ID card">
      <div className="id-hang__stage">
        {webgl ? (
          <Suspense fallback={null}>
            <Lanyard frontImage={front} backImage={back} strapColor={STRAP} onMiss={close} />
          </Suspense>
        ) : (
          <div className="id-hang__flat" onPointerDown={(e) => { if (e.target === e.currentTarget) close() }}>
            <img src={front} alt="" />
          </div>
        )}
      </div>
      <p className="id-hang__hint">drag it around · click to flip</p>
      <div className="id-hang__links">
        <a href={LINKEDIN_HREF} target="_blank" rel="noopener noreferrer"><LinkedInLogo /><span>LinkedIn</span></a>
        <a href={`mailto:${EMAIL}`}><GmailLogo /><span>Email</span></a>
      </div>
      <button type="button" className="id-hang__close" aria-label="Put the ID card down" onClick={close}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

export default IdLanyard
