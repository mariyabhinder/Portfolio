import { useEffect, useState } from 'react'
import DreamLanding from '@/components/DreamLanding'
import PicstoryPage from '@/components/PicstoryPage'
import NudgePage from '@/components/NudgePage'

const route = () => window.location.hash

export default function App() {
  const [hash, setHash] = useState(route)

  useEffect(() => {
    const sync = () => setHash(route())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

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
