// Her ID card on its lanyard, dropped on the grass by her head (hero only), like the postcard. Clicking it picks it up: the grass copy
// fades and the 3D lanyard (Lanyard.tsx, ported from the id-component project) swings in, hanging from the top of the screen.
// Drag the card to throw it about; click it to flip it over. A click off the card, the close button or Escape puts it down.
// DreamLanding places the grass wrapper (translate + size, like the postcard's).

import { forwardRef, lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import front from '../assets/meadow/id-front.webp'
import back from '../assets/meadow/id-back.webp'
import portrait from '../assets/meadow/idcard.webp'

// three.js is only fetched the first time the card is picked up
const Lanyard = lazy(() => import('./Lanyard'))

const STRAP = '#f2762e'
const STRAP_LIGHT = '#ffb27a'

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
  const i = new Image()
  i.onload = () => res(i)
  i.onerror = rej
  i.src = src
})

/** The card face with the sleeping portrait swapped for idcard.webp (drawn into the photo window on a canvas). Falls back to the plain face. */
function useFront() {
  const [url, setUrl] = useState(front)
  useEffect(() => {
    let dead = false
    Promise.all([load(front), load(portrait), load(back), document.fonts.load('500 100px Lora').catch(() => []), document.fonts.load('600 100px Lora').catch(() => [])]).then(([f, p, b]) => {
      const W = f.naturalWidth, H = f.naturalHeight
      const cv = document.createElement('canvas')
      cv.width = W; cv.height = H
      const g = cv.getContext('2d')
      if (!g) return
      // fresh face: cream card with the dotted pattern, no flowers, no barcode
      g.fillStyle = '#fdf9ec'
      g.fillRect(0, 0, W, H)
      g.fillStyle = 'rgba(205,195,170,0.55)'
      for (let yy = 22; yy < H; yy += 66) for (let xx = 22; xx < W; xx += 66) { g.beginPath(); g.arc(xx, yy, 3, 0, Math.PI * 2); g.fill() }
      // orange band, same as the back of the card
      const by = H * 0.105, bh = H * 0.115
      const grad = g.createLinearGradient(0, by, W, by + bh)
      grad.addColorStop(0, '#e8804a'); grad.addColorStop(1, '#e06a35')
      g.fillStyle = grad
      g.fillRect(0, by, W, bh)
      // crescentic logo + wordmark lifted from the back image (cream pixels only, so the orange drops out)
      const cut = (sx: number, sy: number, sw: number, sh: number) => {
        const c = document.createElement('canvas')
        c.width = sw; c.height = sh
        const x = c.getContext('2d')!
        x.drawImage(b, sx, sy, sw, sh, 0, 0, sw, sh)
        const d = x.getImageData(0, 0, sw, sh)
        for (let i = 0; i < d.data.length; i += 4) {
          const a = Math.min(1, Math.max(0, (d.data[i + 2] - 130) / 90))
          d.data[i] = 253; d.data[i + 1] = 249; d.data[i + 2] = 236; d.data[i + 3] = Math.round(a * 255)
        }
        x.putImageData(d, 0, 0)
        return c
      }
      const sx0 = b.naturalWidth / 1024, sy0 = b.naturalHeight / 1440
      const icon = cut(385 * sx0, 360 * sy0, 255 * sx0, 245 * sy0)
      const word = cut(255 * sx0, 630 * sy0, 515 * sx0, 115 * sy0)
      const ih = bh * 0.78, iw = ih * icon.width / icon.height
      const wh = bh * 0.5, ww = wh * word.width / word.height
      const gap = W * 0.025, x0 = (W - (iw + gap + ww)) / 2
      g.drawImage(icon, x0, by + (bh - ih) / 2, iw, ih)
      g.drawImage(word, x0 + iw + gap, by + (bh - wh) / 2, ww, wh)
      // name, both lines in Lora at the same size
      g.textAlign = 'center'
      g.textBaseline = 'alphabetic'
      g.fillStyle = '#2b2523'
      g.font = `500 ${W * 0.09}px Lora, Georgia, serif`
      g.fillText('Mariyah', W / 2, H * 0.775)
      g.fillText('Bhinderwala', W / 2, H * 0.775 + W * 0.115)
      g.fillStyle = '#e06a35'
      g.font = `600 ${W * 0.048}px Lora, Georgia, serif`
      g.letterSpacing = `${W * 0.012}px`
      g.fillText('UI/UX DESIGNER', W / 2 + W * 0.006, H * 0.775 + W * 0.115 + H * 0.085)
      g.letterSpacing = '0px'
      // photo window, as fractions of the card
      const x = W * 0.246, y = H * 0.243, w = W * 0.508, h = H * 0.417
      const pad = W * 0.018
      g.beginPath(); g.roundRect(x - pad * 1.6, y - pad * 1.6, w + pad * 3.2, h + pad * 3.2, W * 0.055); g.fillStyle = '#e8dcc3'; g.fill()
      g.beginPath(); g.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, W * 0.05); g.fillStyle = '#fff'; g.fill()
      g.save()
      g.beginPath()
      g.roundRect(x, y, w, h, W * 0.04)
      g.clip()
      g.fillStyle = '#cde3b8'
      g.fillRect(x, y, w, h)
      // crop the cutout to its figure, fit to the window width, top-aligned so the cap shows and the bottom is cropped
      const sy = p.naturalHeight * 0.31, sx = p.naturalWidth * 0.08, sw = p.naturalWidth * 0.84, sh = p.naturalHeight - sy
      const k = w / sw
      g.drawImage(p, sx, sy, sw, sh, x, y + h * 0.06, sw * k, sh * k)
      g.restore()
      if (!dead) setUrl(cv.toDataURL('image/png'))
    }).catch(() => {})
    return () => { dead = true }
  }, [])
  return url
}

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
function GrassArt({ front }: { front: string }) {
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
  const front = useFront()
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
        <span className="id-grass__art"><GrassArt front={front} /></span>
      </button>
      {open ? createPortal(<Hanging front={front} onClose={() => setOpen(false)} />, document.body) : null}
    </>
  )
})

function Hanging({ front, onClose }: { front: string; onClose: () => void }) {
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
    window.addEventListener('touchmove', stop, { passive: false })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('touchmove', stop)
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
      <button type="button" className="id-hang__close" aria-label="Put the ID card down" onClick={close}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

export default IdLanyard
