// The decoration on the right of the About Me page. It is drawn in the p5 scene (meadow.ts drawAbout), not as DOM, so the wake wave
// (the liquid distortion back to the meadow) carries it like the rest of the frame: grain, colour split and light bloom included.
// x, y, w are in design pixels (1440 x 1024); drawn back to front, so later pieces sit on top. `at` is where in the page's 0-1 (state.about)
// each piece starts to come in. `arch` draws a semi-oval frame of swaying grass and little flowers (touch.ts drawArch) round the picture.

import deco9 from '../../assets/meadow/deco9.webp'

export const ABOUT_DESIGN = { w: 1440, h: 1024 }

export const RIGHT_SIDE: { src: string; x: number; y: number; w: number; at: number; rotate?: number; flip?: boolean; arch?: boolean }[] = [
  { src: deco9, x: 990, y: 344, w: 376, at: 0.4, arch: true }, // her
]
