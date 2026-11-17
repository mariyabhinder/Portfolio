import type { MouseEvent } from 'react'

// Going from the landing to a case study (#/picstory, #/nudge) and back again.
//
// The landing is one long scroll-driven scene, and the case studies are opened from the window she sits beside, deep inside
// it. Coming back has to put the visitor on the very frame they left from (the open window, showing the project they clicked),
// not at the top of the meadow. The landing is unmounted while a case study is up, so the browser cannot restore that scroll
// by itself: App records where the landing was on the way out (rememberLanding) and puts it back as soon as the landing is
// rendered again (restoreLanding), before the scene reads the scroll.

export const isCaseStudy = (hash: string) => hash === '#/picstory' || hash === '#/nudge'

const KEY = 'landing-return'
// Kept as a share of the page's height, not in px: every length in the scene is in vh, so after a resize (or a phone turned
// round) the same share is still the same frame. sessionStorage keeps it through a reload of the case study; the copy in
// memory serves when storage is blocked.
let memory: number | null = null

/** The route is leaving the landing for a case study: remember where the landing was, and mark the new history entry. */
export function rememberLanding() {
  const at = window.scrollY / Math.max(1, document.documentElement.scrollHeight)
  memory = at
  try {
    sessionStorage.setItem(KEY, String(at))
  } catch {
    // storage blocked (private mode, settings): the in-memory copy still covers this visit
  }
  // the case study's entry now knows it was opened from the landing, so its Back button can simply step back (backToLanding)
  history.replaceState({ ...(history.state ?? {}), fromLanding: true }, '')
}

/** The landing is rendered again after a case study: scroll it back to where it was left, or to its top if it never was. */
export function restoreLanding() {
  let at = memory
  if (at === null) {
    try {
      const saved = sessionStorage.getItem(KEY)
      if (saved !== null) at = Number(saved)
    } catch {
      // storage blocked: nothing saved, so the top
    }
  }
  const top = at !== null && Number.isFinite(at) ? at * document.documentElement.scrollHeight : 0
  window.scrollTo({ top, behavior: 'instant' })
}

/**
 * The case studies' Back button. Opened from the landing, it is a real step back through history, the same as the browser's
 * own Back (so the two agree and history doesn't grow); opened directly (a shared link), it stays a plain link to the landing.
 */
export function backToLanding(e: MouseEvent<HTMLAnchorElement>) {
  // a new tab or window asked for: leave it to the link
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  if (!history.state?.fromLanding) return
  e.preventDefault()
  history.back()
}
