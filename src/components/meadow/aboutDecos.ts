// The decoration on the right of the About Me page. It is drawn in the p5 scene (meadow.ts drawAbout), not as DOM, so the wake wave
// (the liquid distortion back to the meadow) carries it like the rest of the frame: grain, colour split and light bloom included.
// x, y, w are in design pixels (1440 x 1024); drawn back to front, so later pieces sit on top. `at` is where in the page's 0-1 (state.about)
// each piece starts to come in. `arch` draws a semi-oval frame of swaying grass and little flowers (touch.ts drawArch) round the picture.


import deco9 from '../../assets/meadow/deco9.webp'
import jharoka from '../../assets/meadow/jharoka.webp'
import cloud from '../../assets/meadow/cloud.webp'
import figma from '../../assets/meadow/figma.webp'
import games from '../../assets/meadow/games.webp'
import stitch from '../../assets/meadow/stitching.webp'
import coffee from '../../assets/meadow/coffee.webp'
import flower1 from '../../assets/meadow/flower1.webp'
import flower2 from '../../assets/meadow/flower2.webp'

export const ABOUT_DESIGN = { w: 1440, h: 1024 }

export const RIGHT_SIDE: { src: string; x: number; y: number; w: number; at: number; rotate?: number; flip?: boolean; arch?: boolean; m?: number }[] = [
  { src: cloud, x: 816, y: 358, w: 200, at: 0.5 }, // cloud, left of the arch opening; behind the jharoka
  { src: cloud, x: 1114, y: 252, w: 190, at: 0.55, flip: true }, // cloud, upper right; behind the jharoka
  { src: jharoka, x: 748, y: 63, w: 640, at: 0.4, m: 1 }, // the carved window frame round her; she stands inside it
  { src: stitch, x: 805, y: 570, w: 190, at: 0.6 }, // left, thread; in front of the jharoka, spilling out past its left pillar
  { src: figma, x: 1144, y: 498, w: 96, at: 0.6 }, // right of her head
  { src: games, x: 1212, y: 612, w: 73, at: 0.65 }, // NYT, under figma
  { src: deco9, x: 936, y: 482, w: 304, at: 0.4, m: 1 }, // her
  { src: coffee, x: 825, y: 715, w: 215, at: 0.7 }, // bottom left, overlapping her a little
  { src: flower2, x: 1213, y: 809, w: 193, at: 0.75 }, // sunflower, bottom right
  { src: flower1, x: 1110, y: 851, w: 220, at: 0.8 }, // cream flower, in front of the sunflower
]
