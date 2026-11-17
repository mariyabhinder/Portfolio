import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import DreamLanding from '@/components/DreamLanding'
import PicstoryPage from '@/components/PicstoryPage'
import NudgePage from '@/components/NudgePage'
import { isCaseStudy, rememberLanding, restoreLanding } from '@/lib/caseStudyNav'

const route = () => window.location.hash

export default function App() {
  const [hash, setHash] = useState(route)
  // set when the route comes back from a case study to the landing: its scroll is put back once it has rendered
  const returning = useRef(false)

  useEffect(() => {
    const sync = (e: HashChangeEvent) => {
      const from = new URL(e.oldURL).hash
      const to = route()
      // leaving the landing: the page is still the landing here (React hasn't re-rendered yet), so its scroll is the one to keep
      if (!isCaseStudy(from) && isCaseStudy(to)) rememberLanding()
      if (isCaseStudy(from) && !isCaseStudy(to)) returning.current = true
      setHash(to)
    }
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // a layout effect, so the scroll is back before the landing's own effects run: they read it to set the scene, and start the
  // smooth scroll from it
  useLayoutEffect(() => {
    if (!returning.current || isCaseStudy(hash)) return
    returning.current = false
    restoreLanding()
  }, [hash])

  if (hash === '#/picstory') return <PicstoryPage />
  if (hash === '#/nudge') return <NudgePage />

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Dream scroll landing */}
      {/* the whole page is this one pinned scene: its last scroll (waking up in the meadow) is the last screen */}
      <DreamLanding />
    </div>
  )
}
