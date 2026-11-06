// The touchdown's tunables (touch.ts), in a file of their own so the page can read them without loading p5

export const TOUCH_CONFIG = {
  /** extra scroll length for the touchdown, in viewport heights (the last part of it is the pinned rest) */
  scrollVh: 280,
  /** progress at which her feet meet the surface */
  contact: 0.36,
  /** where the surface is, as a fraction of the viewport height (screen), and how far below the viewport it starts out */
  surface: 0.84,
  rise: 0.5,
  /** the picture dissolves: [start, end] of u */
  toLand1: [0.36, 0.42] as [number, number],
  toLand2: [0.5, 0.68] as [number, number],
  /** the seated size relative to the falling picture (same face size), and how much closer she comes while settling */
  seatScale: 0.535,
  grow: 0.18,
  growSpan: [0.5, 0.85] as [number, number],
  /** impact: the spring's period and damping (in u), squash and spread of the body at the first peak, rebound hop (viewport heights) */
  impact: { period: 0.11, damping: 0.3, squash: 0.045, spread: 0.03, hop: 0.006 },
  /** the fall's wind lines: how strong they get on the way down (the drop leaves them at 0.15) */
  lines: { peak: 0.4, fadeOut: [0.28, 0.37] as [number, number] },
  /** the fraction to which reduced motion shrinks the squash, spread and hop */
  reducedMotion: 0.3,
}
