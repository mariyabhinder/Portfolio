// The About Me page, drawn over the pinned scene once she has landed: the heading and the word game are DOM here. The decorations on the
// right (aboutDecos.ts) are drawn in the p5 scene so the wake wave can take them. The layout is a 1440 x 1024 design fitted into the viewport, so the
// whole page scales as one piece (see .about-stage in index.css). DreamLanding sets --about (0-1, scroll-driven) on the camera;
// each piece fades and settles in when --about passes its `at`, so the page is a pure function of scroll like the rest of the dream.

import StrandsGame from "./StrandsGame"

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
    </>
  )
}
