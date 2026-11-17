// The site's nav, top right over the whole scene. The page is one long scroll-driven dream, so its "sections" are depths of that
// scroll rather than places in the page: each item asks DreamLanding to glide there (Home: the top, her asleep on the meadow;
// Work: the window open on the case studies;
// About me: the word game; Contact me: the very end, where the postcard opens). As the page scrolls, DreamLanding marks the item
// for the part on screen with aria-current.

import { forwardRef } from 'react'

export type NavPart = 'home' | 'work' | 'about' | 'contact'

const ITEMS: { part: NavPart; label: string }[] = [
  { part: 'home', label: 'Home' },
  { part: 'work', label: 'Work' },
  { part: 'about', label: 'About me' },
  { part: 'contact', label: 'Contact me' },
]

const SiteNav = forwardRef<HTMLElement, { ready: boolean; onGo: (part: NavPart) => void }>(function SiteNav({ ready, onGo }, ref) {
  return (
    <nav ref={ref} className={`site-nav${ready ? ' site-nav--ready' : ''}`} aria-label="Main">
      <ul className="site-nav__list">
        {ITEMS.map(({ part, label }) => (
          <li key={part}>
            <button type="button" className="site-nav__link" data-part={part} onClick={() => onGo(part)}>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
})

export default SiteNav
