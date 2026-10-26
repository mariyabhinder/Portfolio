// The About Me word game's completion state, shared with the girl's animation (GirlFx.tsx and the memory pose in meadow/touch.ts).
//
// The game itself is not built yet. When it is, it reports its REAL progress here and nothing else decides whether she remembers:
//   reportWordGameProgress(foundCount, totalWords)   // call whenever the found set changes
// "complete" is derived from those two numbers, so it can never disagree with the game. Nothing here is tied to scroll, so
// scrolling back and forth neither resets nor completes the game.

type Listener = () => void

let found = 0
let total = 0
const listeners = new Set<Listener>()

const isComplete = () => total > 0 && found >= total

/** The game calls this whenever a word is found (or progress is reset). Only a real change notifies listeners. */
export function reportWordGameProgress(foundCount: number, totalWords: number) {
  const before = isComplete()
  found = foundCount
  total = totalWords
  if (before !== isComplete()) listeners.forEach((l) => l())
}

export const getWordGameComplete = () => isComplete()

export function subscribeWordGame(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Development only: drive the same entry point from the console to try the animation before the game exists
//   __wordGame.set(1, 1)  -> complete      __wordGame.set(0, 1) -> back to confused
if (import.meta.env.DEV) {
  ;(window as unknown as { __wordGame: unknown }).__wordGame = { set: reportWordGameProgress }
}
