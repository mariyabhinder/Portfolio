// The Strands word game on the About Me page: drag across neighbouring letters to find the words that make her, her.
// The board is 8 x 6 and lives in an 800 x 640 box, so letters and strands scale with the container (see .strands-game in index.css).

import { useEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent } from "react"

const COLS = 8
const VB_W = 800
const VB_H = 640
const PITCH = 90 // distance between letter centres
const X0 = (VB_W - (COLS - 1) * PITCH) / 2
const Y0 = 130
const HIT_RADIUS = 36 // how close the pointer must be to a letter centre
const REVEAL_STEP = 900

type Word = { word: string; spangram?: boolean; cells: number[] }

// cells are [row, col]; paths may turn freely, each step touches the previous one (diagonals included)
const WORDS: Word[] = (
  [
    { word: "ALLABOUTME", spangram: true, cells: [[2, 2], [2, 3], [3, 3], [3, 4], [4, 4], [4, 5], [3, 5], [2, 5], [2, 6], [1, 6]] },
    { word: "DESIGNER", cells: [[1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [0, 3], [0, 4]] },
    { word: "COFFEE", cells: [[1, 1], [2, 1], [2, 0], [3, 0], [4, 0], [5, 0]] },
    { word: "STITCH", cells: [[3, 1], [3, 2], [4, 2], [5, 2], [5, 1], [4, 1]] },
    { word: "GAMES", cells: [[1, 7], [2, 7], [3, 7], [3, 6], [4, 6]] },
    { word: "FLOWERS", cells: [[4, 7], [5, 7], [5, 6], [5, 5], [5, 4], [5, 3], [4, 3]] },
    { word: "CLOUDS", cells: [[0, 7], [0, 6], [0, 5], [1, 5], [1, 4], [2, 4]] },
  ] as { word: string; spangram?: boolean; cells: number[][] }[]
).map((w) => ({ ...w, cells: w.cells.map(([r, c]) => r * COLS + c) }))

const LETTERS: string[] = []
WORDS.forEach((w) => w.cells.forEach((cell, i) => (LETTERS[cell] = w.word[i])))

const pos = (index: number) => ({ x: X0 + (index % COLS) * PITCH, y: Y0 + Math.floor(index / COLS) * PITCH })
const adjacent = (a: number, b: number) =>
  a !== b && Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1 && Math.abs((a % COLS) - (b % COLS)) <= 1
const pathData = (cells: number[]) =>
  cells.map((c, i) => `${i === 0 ? "M" : "L"} ${pos(c).x} ${pos(c).y}`).join(" ")

export default function StrandsGame({ onComplete }: { onComplete?: (done: boolean) => void }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const timers = useRef<number[]>([])
  const [selection, setSelection] = useState<number[]>([])
  const [solved, setSolved] = useState<string[]>([])
  const [fading, setFading] = useState<number[][]>([])
  const [revealing, setRevealing] = useState(false)
  const [complete, setComplete] = useState(false)
  const selRef = useRef<number[]>([])
  const solvedRef = useRef<string[]>([])

  const solvedCells = useMemo(() => {
    const map = new Map<number, { spangram: boolean; order: number }>()
    solved.forEach((name) => {
      const w = WORDS.find((x) => x.word === name)!
      w.cells.forEach((c, i) => map.set(c, { spangram: !!w.spangram, order: i }))
    })
    return map
  }, [solved])

  const setSel = (next: number[]) => {
    selRef.current = next
    setSelection(next)
  }
  const markSolved = (names: string[]) => {
    solvedRef.current = names
    setSolved(names)
  }
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setRevealing(false)
  }
  useEffect(() => clearTimers, [])
  useEffect(() => onComplete?.(complete), [complete, onComplete])

  const cellAt = (e: ReactPointerEvent) => {
    const rect = gridRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * VB_W
    const y = ((e.clientY - rect.top) / rect.height) * VB_H
    let best = -1
    let bestDist = HIT_RADIUS
    LETTERS.forEach((_, i) => {
      if (solvedCells.has(i)) return
      const p = pos(i)
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    return best
  }

  const finishSelection = () => {
    const sel = selRef.current
    if (!sel.length) return
    const text = sel.map((i) => LETTERS[i]).join("")
    const picked = [...sel].sort((a, b) => a - b).join(",")
    const match =
      sel.length > 1 &&
      WORDS.find(
        (w) =>
          !solvedRef.current.includes(w.word) &&
          w.word === text &&
          [...w.cells].sort((a, b) => a - b).join(",") === picked,
      )
    if (match) {
      const names = [...solvedRef.current, match.word]
      markSolved(names)
      if (names.length === WORDS.length) timers.current.push(window.setTimeout(() => setComplete(true), 700))
    } else if (sel.length > 1) {
      setFading((f) => [...f, sel])
      window.setTimeout(() => setFading((f) => f.slice(1)), 400)
    }
    setSel([])
  }

  const onDown = (e: ReactPointerEvent) => {
    if (pointer.current !== null || (e.pointerType === "mouse" && e.button !== 0)) return
    const i = cellAt(e)
    if (i < 0) return
    e.preventDefault()
    pointer.current = e.pointerId
    gridRef.current!.setPointerCapture(e.pointerId)
    setSel([i])
  }

  const onMove = (e: ReactPointerEvent) => {
    if (e.pointerId !== pointer.current) return
    const i = cellAt(e)
    const sel = selRef.current
    if (i < 0 || i === sel[sel.length - 1]) return
    // dragging back onto the previous letter undoes the last step
    if (sel.length > 1 && i === sel[sel.length - 2]) return setSel(sel.slice(0, -1))
    if (!sel.includes(i) && adjacent(sel[sel.length - 1], i)) setSel([...sel, i])
  }

  const onUp = (e: ReactPointerEvent, cancelled: boolean) => {
    if (e.pointerId !== pointer.current) return
    pointer.current = null
    if (cancelled) setSel([])
    else finishSelection()
  }

  const replay = () => {
    clearTimers()
    setComplete(false)
    setSel([])
    markSolved([])
    setFading([])
  }

  const reveal = () => {
    clearTimers()
    setSel([])
    const remaining = WORDS.filter((w) => !solvedRef.current.includes(w.word)).sort(
      (a, b) => Number(!!b.spangram) - Number(!!a.spangram),
    )
    if (!remaining.length) return
    setRevealing(true)
    remaining.forEach((w, i) => {
      timers.current.push(
        window.setTimeout(() => {
          markSolved([...solvedRef.current, w.word])
          if (i === remaining.length - 1) {
            setRevealing(false)
            timers.current.push(window.setTimeout(() => setComplete(true), 700))
          }
        }, i * REVEAL_STEP),
      )
    })
  }

  return (
    <div className="strands-game">
      <div className="strands-game__top">
        <button className="strands-btn" type="button" onClick={replay}>
          Replay
        </button>
        <div className={`strands-complete${complete ? " is-visible" : ""}`}>
          <span>You've found me.</span>
          <strong>☕</strong>
        </div>
        <button className="strands-btn" type="button" onClick={reveal} disabled={revealing}>
          Reveal answers
        </button>
      </div>

      <svg className="strands-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {solved.map((name) => {
          const w = WORDS.find((x) => x.word === name)!
          return <path key={name} className={`strand-path ${w.spangram ? "strand-path--yellow" : "strand-path--blue"}`} d={pathData(w.cells)} />
        })}
        {fading.map((cells, i) => (
          <path key={`f${i}`} className="strand-path strand-path--live is-fading" d={pathData(cells)} />
        ))}
        {selection.length > 1 && <path className="strand-path strand-path--live" d={pathData(selection)} />}
      </svg>

      <div
        className="strands-grid"
        ref={gridRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => onUp(e, false)}
        onPointerCancel={(e) => onUp(e, true)}
      >
        {LETTERS.map((letter, i) => {
          const { x, y } = pos(i)
          const hit = solvedCells.get(i)
          const cls = ["strand-letter"]
          if (selection.includes(i)) cls.push("is-selected")
          if (hit) cls.push("is-solved", hit.spangram ? "is-yellow" : "is-blue")
          return (
            <div
              key={i}
              className={cls.join(" ")}
              style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%`, ["--d" as string]: hit ? `${hit.order * 45}ms` : undefined }}
            >
              {letter}
            </div>
          )
        })}
      </div>
    </div>
  )
}
