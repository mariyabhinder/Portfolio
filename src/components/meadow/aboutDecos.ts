// The decorations on the right of the About Me page. They are drawn in the p5 scene (meadow.ts drawAbout), not as DOM, so the wake wave
// (the liquid distortion back to the meadow) carries them like the rest of the frame: grain, colour split and light bloom included.
// x, y, w are in design pixels (1440 x 1024); drawn back to front, so later pieces sit on top. `at` is where in the page's 0-1 (state.about)
// each piece starts to come in.

import deco1 from '../../assets/meadow/deco1.webp'
import deco2 from '../../assets/meadow/deco2.webp'
import deco3 from '../../assets/meadow/deco3.webp'
import deco4 from '../../assets/meadow/deco4.webp'
import deco5 from '../../assets/meadow/deco5.webp'
import deco6 from '../../assets/meadow/deco6.webp'
import deco7 from '../../assets/meadow/deco7.webp'
import deco8 from '../../assets/meadow/deco8.webp'
import deco9 from '../../assets/meadow/deco9.webp'

export const ABOUT_DESIGN = { w: 1440, h: 1024 }

export const RIGHT_SIDE: { src: string; x: number; y: number; w: number; at: number; rotate?: number }[] = [
  { src: deco7, x: 954, y: 65, w: 532, at: 0.05 }, // pink grid paper with tape
  { src: deco8, x: 845, y: 499, w: 484, at: 0.1 }, // pink blob
  { src: deco4, x: 1273, y: 112, w: 200, at: 0.15 }, // cloud
  { src: deco3, x: 985, y: 123, w: 142, at: 0.2 }, // NYT T
  { src: deco5, x: 1300, y: 308, w: 170, at: 0.25 }, // Figma logo
  { src: deco2, x: 862, y: 338, w: 218, at: 0.3 }, // iced coffee
  { src: deco1, x: 890, y: 690, w: 152, at: 0.35 }, // flowers
  { src: deco9, x: 1052, y: 344, w: 376, at: 0.4 }, // her
  { src: deco6, x: 765, y: 785, w: 295, at: 0.5, rotate: 80 }, // needle and thread
]
