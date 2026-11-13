// The About Me page, drawn over the pinned scene once she has landed: the heading and the word game are DOM here. The decorations on the
// right (aboutDecos.ts) are drawn in the p5 scene so the wake wave can take them. The layout is a 1440 x 1024 design fitted into the viewport, so the
// whole page scales as one piece (see .about-stage in index.css). DreamLanding sets --about (0-1, scroll-driven) on the camera;
// each piece fades and settles in when --about passes its `at`, so the page is a pure function of scroll like the rest of the dream.

import { useEffect, useRef, useState } from "react"
import StrandsGame from "./StrandsGame"
import bulb from "../assets/meadow/bulb.png"
import hintBox from "../assets/meadow/hint-box.png"

// two hints per word; once a word is found on the board its hints disappear
const HINTS = [
  { word: "CLOUDS", text: "Fluffy visitors in the sky" },
  { word: "CLOUDS", text: "They bring shade and sometimes rain" },
  { word: "FLOWERS", text: "Nature's colourful little smiles" },
  { word: "FLOWERS", text: "They bloom and make gardens beautiful" },
  { word: "COFFEE", text: "A little cup of energy" },
  { word: "COFFEE", text: "The aroma that wakes you up" },
  { word: "STITCH", text: "One thread at a time" },
  { word: "STITCH", text: "The tiny loop that holds fabric together" },
  { word: "GAMES", text: "From the first move to the final win, every step is an adventure" },
  { word: "GAMES", text: "Play, compete, and have fun" },
  { word: "DESIGNER", text: "Where typography, colour theory and creativity come together" },
  { word: "DESIGNER", text: "Someone who turns ideas into visuals" },
]

export default function AboutMe({ onRemembered }: { onRemembered?: (done: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [solved, setSolved] = useState<string[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open])
  const touchX = useRef<number | null>(null)
  const hints = HINTS.filter((h) => !solved.includes(h.word))
  const idx = hints.length ? Math.min(i, hints.length - 1) : 0
  const step = (d: number) => hints.length && setI((idx + d + hints.length) % hints.length)

  return (
    <>
      <div className="about-piece about-title" style={{ ["--at" as string]: 0 }}>
        <h2>
          Find the things that
          <br />
          make me, me
        </h2>
        <p>(hints are all around me)</p>
      </div>
      <div className="about-piece about-game" style={{ ["--at" as string]: 0.05 }}>
        <StrandsGame onComplete={onRemembered} onSolvedChange={setSolved} />
      </div>
      <div ref={wrapRef} className="about-piece about-bulb" style={{ ["--at" as string]: 0.1 }}>
        <button
          type="button"
          className="about-bulb-btn"
          aria-label={open ? "Close hint" : "Show a hint"}
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o)
          }}
        >
          <span className="about-bulb-shake" data-still={open || undefined}>
            <img src={bulb} alt="" draggable={false} />
            {!open && <span className="about-bulb-dot" />}
          </span>
        </button>
        <div className="about-hint" data-open={open || undefined} aria-live="polite">
          <div
            className="about-hint-box"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return
              const dx = e.changedTouches[0].clientX - touchX.current
              touchX.current = null
              if (Math.abs(dx) > 30) step(dx < 0 ? 1 : -1)
            }}
          >
            <img src={hintBox} alt="" draggable={false} />
            <span className="about-hint-text" key={idx}>
              {hints.length ? hints[idx].text : "All the hints are used up!"}
            </span>
          </div>
          {hints.length > 1 && (
            <div className="about-hint-nav">
              <button type="button" aria-label="Previous hint" tabIndex={open ? 0 : -1} onClick={() => step(-1)}>
                ‹
              </button>
              <span className="about-hint-count">
                {idx + 1} / {hints.length}
              </span>
              <button type="button" aria-label="Next hint" tabIndex={open ? 0 : -1} onClick={() => step(1)}>
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
