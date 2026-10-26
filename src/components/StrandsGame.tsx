import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { reportWordGameProgress } from './aboutMemory'

// The About Me word game (a Strands-style puzzle), ported from the standalone strands prototype. The board is 6 columns x 8 rows so it
// fits the portrait slot in the About Me design. Drag across touching letters to spell a word; a found word turns blue, the
// spangram (ALLABOUTME) turns yellow. Progress is reported to aboutMemory.ts, which is what makes the girl remember.

const COLS = 6
const ROWS = 8
const VB_W = 600
const VB_H = 768
const PITCH = 88
const X0 = (VB_W - (COLS - 1) * PITCH) / 2
const TOP_BAR = 84
const Y0 = TOP_BAR + (VB_H - TOP_BAR - (ROWS - 1) * PITCH) / 2
const HIT_RADIUS = 38

type Kind = 'spangram' | 'word'
interface Word {
  word: string
  kind: Kind
  cells: number[]
}

// paths written as [row, col] on the original 8 x 6 board, then turned a quarter so they sit on this 6 x 8 one
const RAW: { word: string; kind: Kind; cells: [number, number][] }[] = [
  { word: 'ALLABOUTME', kind: 'spangram', cells: [[2,2],[2,3],[3,3],[3,4],[4,4],[4,5],[3,5],[2,5],[2,6],[1,6]] },
  { word: 'DESIGNER', kind: 'word', cells: [[1,0],[0,0],[0,1],[0,2],[1,2],[1,3],[0,3],[0,4]] },
  { word: 'COFFEE', kind: 'word', cells: [[1,1],[2,1],[2,0],[3,0],[4,0],[5,0]] },
  { word: 'STITCH', kind: 'word', cells: [[3,1],[3,2],[4,2],[5,2],[5,1],[4,1]] },
  { word: 'GAMES', kind: 'word', cells: [[1,7],[2,7],[3,7],[3,6],[4,6]] },
  { word: 'FLOWERS', kind: 'word', cells: [[4,7],[5,7],[5,6],[5,5],[5,4],[5,3],[4,3]] },
  { word: 'CLOUDS', kind: 'word', cells: [[0,7],[0,6],[0,5],[1,5],[1,4],[2,4]] },
]

const WORDS: Word[] = RAW.map((w) => ({
  word: w.word,
  kind: w.kind,
  cells: w.cells.map(([r, c]) => c * COLS + r),
}))

const LETTERS: string[] = new Array(COLS * ROWS).fill('')
WORDS.forEach((w) => w.cells.forEach((cell, i) => (LETTERS[cell] = w.word[i])))

const pos = (i: number) => ({ x: X0 + (i % COLS) * PITCH, y: Y0 + Math.floor(i / COLS) * PITCH })
const adjacent = (a: number, b: number) =>
  a !== b && Math.abs(Math.floor(a / COLS) - Math.floor(b / COLS)) <= 1 && Math.abs((a % COLS) - (b % COLS)) <= 1
const pathData = (cells: number[]) =>
  cells.map((c, i) => `${i ? 'L' : 'M'} ${pos(c).x} ${pos(c).y}`).join(' ')

interface Solved {
  word: string
  kind: Kind
  cells: number[]
}

export default function StrandsGame() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [solved, setSolved] = useState<Solved[]>([])
  const [selection, setSelection] = useState<number[]>([])
  const [fading, setFading] = useState<number[] | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [done, setDone] = useState(false)

  const selRef = useRef<number[]>([])
  const solvedRef = useRef<Solved[]>([])
  const pointerRef = useRef<number | null>(null)
  const timers = useRef<number[]>([])

  const setSel = (s: number[]) => {
    selRef.current = s
    setSelection(s)
  }
  const setSolvedBoth = (s: Solved[]) => {
    solvedRef.current = s
    setSolved(s)
    reportWordGameProgress(s.length, WORDS.length)
  }
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms))
  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(
    () => () => {
      clearTimers()
      reportWordGameProgress(0, 0)
    },
    [],
  )

  const solvedAt = useCallback((i: number) => solvedRef.current.find((s) => s.cells.includes(i)), [])

  const cellAt = (e: ReactPointerEvent) => {
    const rect = gridRef.current!.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * VB_W
    const y = ((e.clientY - rect.top) / rect.height) * VB_H
    let best = -1
    let bestD = HIT_RADIUS
    for (let i = 0; i < COLS * ROWS; i++) {
      if (solvedAt(i)) continue
      const p = pos(i)
      const d = Math.hypot(p.x - x, p.y - y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  const finish = (cancelled: boolean) => {
    const sel = selRef.current
    if (!sel.length) return
    const text = sel.map((i) => LETTERS[i]).join('')
    const key = [...sel].sort((a, b) => a - b).join()
    const match = cancelled || sel.length < 2
      ? undefined
      : WORDS.find(
          (w) =>
            !solvedRef.current.some((s) => s.word === w.word) &&
            w.word === text &&
            [...w.cells].sort((a, b) => a - b).join() === key,
        )
    if (match) {
      const next = [...solvedRef.current, { word: match.word, kind: match.kind, cells: sel }]
      setSolvedBoth(next)
      if (next.length === WORDS.length) later(() => setDone(true), 700)
    } else if (sel.length > 1) {
      setFading(sel)
      later(() => setFading(null), 400)
    }
    setSel([])
  }

  const onDown = (e: ReactPointerEvent) => {
    if (pointerRef.current !== null || revealing || (e.pointerType === 'mouse' && e.button !== 0)) return
    const i = cellAt(e)
    if (i < 0) return
    e.preventDefault()
    pointerRef.current = e.pointerId
    gridRef.current!.setPointerCapture(e.pointerId)
    setFading(null)
    setSel([i])
  }

  const onMove = (e: ReactPointerEvent) => {
    if (e.pointerId !== pointerRef.current) return
    const i = cellAt(e)
    if (i < 0) return
    const sel = selRef.current
    const last = sel[sel.length - 1]
    if (i === last) return
    if (sel.length > 1 && i === sel[sel.length - 2]) setSel(sel.slice(0, -1))
    else if (!sel.includes(i) && adjacent(last, i)) setSel([...sel, i])
  }

  const onEnd = (e: ReactPointerEvent, cancelled: boolean) => {
    if (e.pointerId !== pointerRef.current) return
    if (gridRef.current!.hasPointerCapture(e.pointerId)) gridRef.current!.releasePointerCapture(e.pointerId)
    pointerRef.current = null
    finish(cancelled)
  }

  const replay = () => {
    clearTimers()
    setRevealing(false)
    setDone(false)
    setFading(null)
    setSel([])
    setSolvedBoth([])
  }

  const reveal = () => {
    clearTimers()
    setSel([])
    const remaining = WORDS.filter((w) => !solvedRef.current.some((s) => s.word === w.word)).sort(
      (a, b) => Number(b.kind === 'spangram') - Number(a.kind === 'spangram'),
    )
    if (!remaining.length) return
    setRevealing(true)
    remaining.forEach((w, i) =>
      later(() => {
        setSolvedBoth([...solvedRef.current, { word: w.word, kind: w.kind, cells: w.cells }])
        if (i === remaining.length - 1) {
          setRevealing(false)
          later(() => setDone(true), 700)
        }
      }, i * 900),
    )
  }

  return (
    <div className="strands-game">
      <div className="strands-top">
        <button className="strands-btn" type="button" onClick={replay}>
          Replay
        </button>
        <div className={`strands-complete${done ? ' is-visible' : ''}`}>
          <span>You've found me.</span>
          <strong>☕</strong>
        </div>
        <button className="strands-btn" type="button" onClick={reveal} disabled={revealing}>
          Reveal answers
        </button>
      </div>

      <svg className="strands-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {solved.map((s) => (
          <path key={s.word} className={`strand-path ${s.kind === 'spangram' ? 'is-yellow' : 'is-blue'}`} d={pathData(s.cells)} />
        ))}
        {selection.length > 1 && <path className="strand-path is-live" d={pathData(selection)} />}
        {fading && <path className="strand-path is-live is-fading" d={pathData(fading)} />}
      </svg>

      <div
        ref={gridRef}
        className="strands-grid"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={(e) => onEnd(e, false)}
        onPointerCancel={(e) => onEnd(e, true)}
      >
        {LETTERS.map((letter, i) => {
          const { x, y } = pos(i)
          const s = solved.find((w) => w.cells.includes(i))
          const cls = s ? `is-solved ${s.kind === 'spangram' ? 'is-yellow' : 'is-blue'}` : selection.includes(i) ? 'is-selected' : ''
          const delay = s ? s.cells.indexOf(i) * 45 : 0
          return (
            <div
              key={i}
              className={`strand-letter ${cls}`}
              style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%`, '--d': `${delay}ms` } as CSSProperties}
            >
              {letter}
            </div>
          )
        })}
      </div>
    </div>
  )
}
