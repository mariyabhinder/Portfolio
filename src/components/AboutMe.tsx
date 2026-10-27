// The About Me page, drawn over the pinned scene once she has landed. The layout is a 1440 x 1024 design fitted into the viewport, so the
// whole page scales as one piece (see .about-stage in index.css). DreamLanding sets --about (0-1, scroll-driven) on the camera;
// each piece fades and settles in when --about passes its `at`, so the page is a pure function of scroll like the rest of the dream.

export default function AboutMe() {
  return (
    <div className="about-stage" />
  )
}
