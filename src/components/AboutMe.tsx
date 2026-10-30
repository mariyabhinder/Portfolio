// The About Me page, drawn over the pinned scene once she has landed. The layout is a 1440 x 1024 design fitted into the viewport, so the
// whole page scales as one piece (see .about-stage in index.css). DreamLanding sets --about (0-1, scroll-driven) on the camera;
// each piece fades and settles in when --about passes its `at`, so the page is a pure function of scroll like the rest of the dream.

import StrandsGame from "./StrandsGame"
import deco1 from "../assets/meadow/deco1.webp"
import deco2 from "../assets/meadow/deco2.webp"
import deco3 from "../assets/meadow/deco3.webp"
import deco4 from "../assets/meadow/deco4.webp"
import deco5 from "../assets/meadow/deco5.webp"
import deco6 from "../assets/meadow/deco6.webp"
import deco7 from "../assets/meadow/deco7.webp"
import deco8 from "../assets/meadow/deco8.webp"
import deco9 from "../assets/meadow/deco9.webp"

// x, y, w are in design pixels (1440 x 1024); drawn back to front, so later pieces sit on top
const RIGHT_SIDE = [
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

export default function AboutMe({ onRemembered }: { onRemembered?: (done: boolean) => void }) {
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
        <StrandsGame onComplete={onRemembered} />
      </div>
      <div className="about-stage">
      {RIGHT_SIDE.map(({ src, x, y, w, at, rotate }, i) => (
        <img
          key={i}
          src={src}
          alt=""
          draggable={false}
          className="about-piece"
          style={{
            left: `${(x / 1440) * 100}%`,
            top: `${(y / 1024) * 100}%`,
            width: `${(w / 1440) * 100}%`,
            rotate: rotate ? `${rotate}deg` : undefined,
            ["--at" as string]: at,
          }}
        />
      ))}
      </div>
    </>
  )
}
