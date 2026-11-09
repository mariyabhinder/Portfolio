// The decoration on the right of the About Me page. It is drawn in the p5 scene (meadow.ts drawAbout), not as DOM, so the wake wave
// (the liquid distortion back to the meadow) carries it like the rest of the frame: grain, colour split and light bloom included.
// x, y, w are in design pixels (1440 x 1024); drawn back to front, so later pieces sit on top. `at` is where in the page's 0-1 (state.about)
// each piece starts to come in. `arch` draws a semi-oval frame of swaying grass and little flowers (touch.ts drawArch) round the picture.

import deco9 from '../../assets/meadow/deco9.webp'
import figma from '../../assets/meadow/figma.webp'
import games from '../../assets/meadow/games.webp'
import cloud from '../../assets/meadow/cloud.webp'
import stitch from '../../assets/meadow/stitch.webp'
import coffee from '../../assets/meadow/coffee.webp'

export const ABOUT_DESIGN = { w: 1440, h: 1024 }

export const RIGHT_SIDE: { src: string; x: number; y: number; w: number; at: number; rotate?: number; flip?: boolean; arch?: boolean }[] = [
  { src: cloud, x: 1247, y: 485, w: 188, at: 0.6 }, // right, mid height; listed before her so the arch is drawn over it
  { src: deco9, x: 880, y: 344, w: 376, at: 0.4, arch: true }, // her
  { src: figma, x: 809, y: 526, w: 105, at: 0.5 }, // left of her shoulder
  { src: games, x: 1175, y: 360, w: 110, at: 0.55 }, // upper right
  { src: stitch, x: 774, y: 850, w: 128, at: 0.65, rotate: -6 }, // bottom left
  { src: coffee, x: 1232, y: 762, w: 142, at: 0.7, rotate: 4 }, // bottom right
]
