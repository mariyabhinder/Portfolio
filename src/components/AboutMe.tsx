import type { CSSProperties } from 'react'
import StrandsGame from './StrandsGame'
import flowersUrl from '@/assets/meadow/deco1.webp'
import coffeeUrl from '@/assets/meadow/deco2.webp'
import timesUrl from '@/assets/meadow/deco3.webp'
import cloudUrl from '@/assets/meadow/deco4.webp'
import figmaUrl from '@/assets/meadow/deco5.webp'
import threadUrl from '@/assets/meadow/deco6.webp'
import paperUrl from '@/assets/meadow/deco7.webp'
import blobUrl from '@/assets/meadow/deco8.webp'
import portraitUrl from '@/assets/meadow/deco9.webp'

// The About Me page, drawn over the pinned scene once she has landed. The layout is a 1440 x 1024 design (the reference image) fitted
// into the viewport: every number below is a position / width in that design's px, turned into a percentage of the stage so the
// whole page scales as one piece (see .about-stage in index.css). DreamLanding sets --about (0-1, scroll-driven) on the camera;
// each piece fades and settles in when --about passes its `at`, so the page is a pure function of scroll like the rest of the dream.
//
// The "memory" collage is on the left. The word puzzle goes in <div className="about-puzzle"> on the right (empty for now).

const W = 1440
const H = 1024

interface Piece {
  key: string
  src: string
  /** left, top and width in design px */
  x: number
  y: number
  w: number
  z: number
  /** --about value at which it starts to appear */
  at: number
}

// bottom to top: the pink wash, the grid paper, her photo, then the small things that hint at who she is
const PIECES: Piece[] = [
  { key: 'blob', src: blobUrl, x: 0, y: 535, w: 660, z: 1, at: 0.0 },
  { key: 'paper', src: paperUrl, x: 0, y: 157, w: 600, z: 2, at: 0.08 },
  { key: 'portrait', src: portraitUrl, x: 85, y: 345, w: 385, z: 4, at: 0.2 },
  { key: 'cloud', src: cloudUrl, x: -5, y: 90, w: 235, z: 5, at: 0.34 },
  { key: 'times', src: timesUrl, x: 8, y: 352, w: 130, z: 5, at: 0.42 },
  { key: 'figma', src: figmaUrl, x: 325, y: 195, w: 150, z: 5, at: 0.5 },
  { key: 'thread', src: threadUrl, x: 348, y: 285, w: 358, z: 5, at: 0.58 },
  { key: 'flowers', src: flowersUrl, x: 485, y: 543, w: 150, z: 6, at: 0.66 },
  { key: 'coffee', src: coffeeUrl, x: 445, y: 826, w: 170, z: 6, at: 0.74 },
]

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`

export default function AboutMe() {
  return (
    <div className="about-stage">
      <div className="about-title about-piece" style={{ '--at': 0.1 } as CSSProperties}>
        <h2>
          Find the things that
          <br />
          make me, me
        </h2>
        <p>(hints are all around me)</p>
      </div>

      {/* the collage is its own stage, pinned to the left edge of the screen instead of centred with the title */}
      <div className="about-stage about-stage-left">
        {PIECES.map((p) => (
          <img
            key={p.key}
            alt=""
            draggable={false}
            src={p.src}
            className={`about-piece about-${p.key}`}
            style={{ left: pct(p.x, W), top: pct(p.y, H), width: pct(p.w, W), zIndex: p.z, '--at': p.at } as CSSProperties}
          />
        ))}
      </div>

      {/* the word puzzle's place: 540 x 691 at (450, 240), centred horizontally, lowered to clear the heading text above */}
      <div
        className="about-puzzle about-piece"
        style={{ left: pct(450, W), top: pct(240, H), width: pct(540, W), height: pct(691, H), '--at': 0.85 } as CSSProperties}
      >
        <StrandsGame />
      </div>
    </div>
  )
}
