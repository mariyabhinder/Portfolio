// The contact flower, the last thing on the page. When the meadow has finished zooming out, one white petal drifts in from the left on
// the wind, and as it comes into the frame it turns over and opens out into a big flower holding her LinkedIn and email.
// DreamLanding adds `flower-on` to the camera once the wake scene is done (and takes it off scrolling back); the whole move is the CSS
// animation `flower-fly` in index.css (the turn is a 2D squash: the petal narrows to an edge, the flower widens out of it).

import linkedinImg from '../assets/linkedin-sketch.png'
import gmailImg from '../assets/gmail-sketch.png'

export const LINKEDIN_NAME = 'mariyah-bhinderwala'
export const LINKEDIN ='www.linkedin.com/in/mariyah-bhinderwala-4aa1872a0'
export const LINKEDIN_HREF = `https://${LINKEDIN}`
export const EMAIL = 'bhinderwalamariyah@gmail.com'

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

export function LinkedInLogo() {
  return <img src={linkedinImg} alt="" className="fl-logo fl-logo--in" draggable={false} />
}

export function GmailLogo() {
  return <img src={gmailImg} alt="" className="fl-logo fl-logo--multiply" draggable={false} />
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
                <span>{LINKEDIN_NAME}</span>
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
