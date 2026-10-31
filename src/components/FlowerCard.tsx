// The contact flower, the last thing on the page. When the meadow has finished zooming out, one white petal drifts in from the left on
// the wind, and as it comes into the frame it turns over and opens out into a big flower holding her LinkedIn and email.
// DreamLanding adds `flower-on` to the camera once the wake scene is done (and takes it off scrolling back); the whole move is the CSS
// animation `flower-fly` in index.css (the turn is a 2D squash: the petal narrows to an edge, the flower widens out of it).

const LINKEDIN = 'www.linkedin.com/in/mariyah-bhinderwala-4aa1872a0'
const LINKEDIN_HREF = `https://${LINKEDIN}`
const EMAIL = 'bhinderwalamariyah@gmail.com'

// the same white as the small petals blowing about (meadow.ts drawPetals), with their soft green shadow
const WHITE = '#fcfcf4'
const SHADOW = 'rgba(70, 90, 40, 0.28)'
const RIM = '#cfcdb4'

// the flower, drawn like the reference: a pink scalloped blob with the red outline in separate arcs (gaps at the notches), shifted up-left
const LOBES = 9, CENTRE = 500, RING = 330, LOBE_R = 130, GAP = 0.13
const lobes = Array.from({ length: LOBES }, (_, i) => {
  const a = -Math.PI / 2 + (i + 0.5) * ((Math.PI * 2) / LOBES)
  return { a, x: CENTRE + RING * Math.cos(a), y: CENTRE + RING * Math.sin(a) }
})
// where two neighbouring lobes' circles cross, on the bisector between them
const notch = (a: number) => {
  const half = Math.PI / LOBES
  const d = RING * Math.cos(half) + Math.sqrt(LOBE_R ** 2 - (RING * Math.sin(half)) ** 2)
  return { x: CENTRE + d * Math.cos(a), y: CENTRE + d * Math.sin(a) }
}
const outline = lobes
  .map(({ a, x, y }) => {
    const half = Math.PI / LOBES
    const p0 = notch(a - half), p1 = notch(a + half)
    const a0 = Math.atan2(p0.y - y, p0.x - x) + GAP, a1 = Math.atan2(p1.y - y, p1.x - x) - GAP
    const span = (a1 - a0 + Math.PI * 4) % (Math.PI * 2)
    const f = (t: number) => `${(x + LOBE_R * Math.cos(t)).toFixed(1)} ${(y + LOBE_R * Math.sin(t)).toFixed(1)}`
    return `M${f(a0)}A${LOBE_R} ${LOBE_R} 0 ${span > Math.PI ? 1 : 0} 1 ${f(a0 + span)}`
  })
  .join('')

function FlowerArt() {
  return (
    <svg viewBox="0 0 1000 1000" className="fl-art" aria-hidden="true">
      <g>
        <g transform="translate(16 18)" fill={SHADOW}>
          <circle cx={CENTRE} cy={CENTRE} r={RING} />
          {lobes.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={LOBE_R} />)}
        </g>
        <g fill={WHITE}>
          <circle cx={CENTRE} cy={CENTRE} r={RING} />
          {lobes.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={LOBE_R} />)}
        </g>
      </g>
      <path d={outline} transform="translate(-14 -12)" fill="none" stroke={RIM} strokeWidth="11" strokeLinecap="round" />
    </svg>
  )
}

function PetalArt() {
  return (
    <svg viewBox="0 0 1000 1000" className="fl-art" aria-hidden="true">
      <ellipse cx="520" cy="525" rx="250" ry="150" fill={SHADOW} />
      <ellipse cx="500" cy="500" rx="250" ry="150" fill={WHITE} />
    </svg>
  )
}

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" className="fl-logo" aria-hidden="true">
      <rect width="24" height="24" rx="4.5" fill="#0a66c2" />
      <path fill="#fff" d="M5.2 9.5h2.9V19H5.2zM6.65 5a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4zM10 9.5h2.8v1.3c.4-.8 1.4-1.5 2.9-1.5 3 0 3.5 2 3.5 4.5V19h-2.9v-4.7c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V19H10z" />
    </svg>
  )
}

function GmailLogo() {
  return (
    <svg viewBox="0 0 24 24" className="fl-logo" aria-hidden="true">
      <rect x="1" y="3.5" width="22" height="17" rx="2.5" fill="#fff" />
      <path fill="#4285f4" d="M1 8v10.5A2 2 0 0 0 3 20.5h3.5V10.4z" />
      <path fill="#34a853" d="M23 8v10.5a2 2 0 0 1-2 2h-3.5V10.4z" />
      <path fill="#ea4335" d="M6.5 5.2 12 9.4l5.5-4.2v5.2L12 14.6 6.5 10.4z" />
      <path fill="#c5221f" d="M1 6a2.3 2.3 0 0 1 3.7-1.8l1.8 1V10.4L1 8z" />
      <path fill="#fbbc04" d="M23 6a2.3 2.3 0 0 0-3.7-1.8l-1.8 1V10.4L23 8z" />
    </svg>
  )
}

export default function FlowerCard() {
  return (
    <div className="fl-stage">
      <div className="fl-wrap">
        <div className="fl-bob">
          <div className="fl-face fl-petal"><PetalArt /></div>
          <div className="fl-face fl-flower">
            <FlowerArt />
            <div className="fl-links">
              <a href={LINKEDIN_HREF} target="_blank" rel="noopener noreferrer" className="fl-link">
                <LinkedInLogo />
                <span>{LINKEDIN}</span>
              </a>
              <a href={`mailto:${EMAIL}`} className="fl-link">
                <GmailLogo />
                <span>{EMAIL}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
