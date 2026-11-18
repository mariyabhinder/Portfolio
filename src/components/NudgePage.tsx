import { useEffect, useRef, useState, type ReactNode } from 'react'
import heroImg from '@/assets/meadow/nudge image.webp'
import nmockup1 from '@/assets/meadow/nmockup1.webp'
import nmockup2 from '@/assets/meadow/nmockup2.webp'
import nmockup3 from '@/assets/meadow/nmockup3.webp'
import nudgeLaptop from '@/assets/meadow/nudgelaptop.webp'
import boyFront from '@/assets/meadow/boyfront.webp'
import boyBack from '@/assets/meadow/boy.webp'
import nudgeFront from '@/assets/meadow/nudge.webp'
import nudgeBack from '@/assets/meadow/nudgeback.webp'
import OverthinkingLoop from './OverthinkingLoop'
import DeviceShot from './DeviceShot'
import { backToLanding } from '@/lib/caseStudyNav'
import img1 from '@/assets/meadow/image (1).webp'
import img3 from '@/assets/meadow/image (3).webp'
import img7 from '@/assets/meadow/image (7).webp'
import img11 from '@/assets/meadow/image (11).webp'
import img12 from '@/assets/meadow/image (12).webp'

const FONT = '"Nunito", "Helvetica Neue", Arial, sans-serif'
const DISPLAY = '"Bagel Fat One", "Nunito", sans-serif'
const HEAD = '"Chango", "Bagel Fat One", sans-serif'
// paragraphs (section number -> block index) that sit on a teal speech-bubble blob
const BLOBS: Record<number, number> = { 1: 2, 3: 5, 4: 1, 5: 5, 7: 1, 9: 0 }
const GALLERY = [img1, img3, img7, img11, img12]

type Block = { t: 'p' | 'q'; text: string }

const SECTIONS: { title: string; blocks: Block[] }[] = [
  {
    title: '01. Before designing, I needed to understand what I was designing.',
    blocks: [
      { t: 'p', text: 'Every good design starts with a little curiosity. And this time, mine started with a question: *How do you visually explain something as complex as overthinking?*' },
      { t: 'p', text: 'I was given the task of designing a landing page for Nudge, an app developed by the company to help people deal with overthinking. Nudge has a chatbot that allows people to share what\'s bothering them, talk about their problems, and find possible solutions through conversations. Its little blob mascot acts as a companion throughout this experience.' },
      { t: 'p', text: 'Before jumping into Figma, I wanted to understand the product beyond its features. What does it actually feel like to use Nudge? What kind of experience does it offer? What is its personality? And most importantly, what should someone feel when they land on its website? So, I spent some time exploring the app, understanding its conversations, its visual identity, and the problem it was trying to solve. I realised that this wasn\'t just about creating a page to download an app. It was about communicating an experience that could make someone\'s overwhelming thoughts feel a little easier.' },
    ],
  },
  {
    title: '02. My first thought? Make it feel like a breath of fresh air.',
    blocks: [
      { t: 'p', text: 'If the app is about helping people feel better, shouldn\'t the landing page make them feel that way too?' },
      { t: 'p', text: 'That became my initial design direction. I wanted the website to feel peaceful, welcoming, and comforting. Something that instantly made visitors slow down for a moment. I started exploring different visual directions. One had a beautiful green, leafy environment, while another played with blue flowers and open skies. Both directions had their own charm, with natural elements, soft visuals, and an overall sense of calmness.' },
      { t: 'p', text: 'My thinking was simple: people who are already dealing with a lot of thoughts should land on a page that feels like a little escape from all that noise. The designs looked beautiful and captured the feeling I was aiming for. I was quite happy with where they were going. But sometimes, a design can look beautiful and still miss the point.' },
    ],
  },
  {
    title: '03. A little feedback, a completely different perspective.',
    blocks: [
      { t: 'p', text: 'I shared my designs with my colleagues to get their thoughts and understand what could be improved.' },
      { t: 'p', text: 'The feedback brought up two important things.' },
      { t: 'p', text: '**First, the identity.**' },
      { t: 'p', text: 'The colours and visual direction weren\'t quite communicating Nudge\'s existing brand identity. The page needed to feel more connected to the app itself.' },
      { t: 'p', text: '**Second, and more importantly, the story.**' },
      { t: 'p', text: 'The designs communicated calmness, but they didn\'t communicate the transformation that Nudge actually helps people experience. A peaceful background can make someone feel relaxed, but it doesn\'t tell them what happens when they use the app. Where is the overthinking? Where is the confusion? How does Nudge help someone move from feeling overwhelmed to finding clarity? That was the missing piece. I had focused so much on showing the destination that I had forgotten to show the journey.' },
      { t: 'p', text: 'And that changed the entire direction of the project.' },
    ],
  },
  {
    title: '04. What if we could actually show what overthinking feels like?',
    blocks: [
      { t: 'p', text: 'I went back to the drawing board, but this time with a different goal. Instead of simply making the page look calm, I wanted people to *see chaos turning into calmness.* I started thinking about different ways to visually represent an overthinking mind. How could I show someone feeling lost, confused, and stuck, and then gradually finding their way?' },
      { t: 'p', text: 'That\'s when I came across an idea: **What if overthinking was a maze?**' },
      { t: 'p', text: 'Think about it. A maze has multiple paths, unexpected turns, dead ends, and no obvious way out. You keep trying different directions, wondering whether you\'re making the right choice, only to find yourself stuck again. Doesn\'t that sound a little like overthinking? The more I thought about it, the more I liked the connection. A maze could become a visual representation of everything happening inside someone\'s mind. But I didn\'t want to stop at just a maze illustration. I wanted to turn this idea into a little story.' },
    ],
  },
  {
    title: '05. From a maze to a story. Enter the characters!',
    blocks: [
      { t: 'p', text: 'I imagined a boy standing outside a maze. He looks at it, takes a step forward, and enters. As he starts exploring, every path seems to lead somewhere, but none of them takes him where he wants to go. Each dead end brings a new thought bubble.' },
      { t: 'q', text: 'Did I overreact?' },
      { t: 'q', text: 'Am I making the right decision?' },
      { t: 'q', text: 'What if things go wrong?' },
      { t: 'q', text: 'Why can\'t I figure this out?' },
      { t: 'p', text: 'With every wrong turn, he becomes more confused and frustrated. He doesn\'t know which direction to take anymore, or how to get out. Just when everything seems hopeless, a light appears from a distance. The boy looks up. And there it is. Nudge\'s little blob mascot!' },
      { t: 'p', text: 'The blob enters the maze, making its way towards the boy. The two meet, and the boy finally has someone to talk to. He starts sharing what\'s bothering him, and the blob responds, helping him look at things differently. They have a little conversation, and together, they find a way out of the maze. And just like that, the story comes full circle. The boy who entered the maze feeling lost now walks out with a clearer mind and a little more confidence. This was exactly what I wanted the landing page to communicate. The maze represented overthinking. The boy represented someone experiencing it. And the blob represented Nudge — a companion that listens, responds, and helps people find their way forward.' },
      { t: 'p', text: 'It wasn\'t just an illustration anymore. It was the product experience turned into a visual story.' },
    ],
  },
  {
    title: '06. What if the story unfolded as you scrolled?',
    blocks: [
      { t: 'p', text: 'Now that I had the story, I wanted to find a way to make people experience it rather than simply look at it. A static illustration would tell the story, but an animation could make people feel like they were a part of it. That\'s when I decided to explore a scroll-based animation. The idea was simple: as users scroll down the page, the story progresses. The boy enters the maze, gets stuck, encounters the blob, has a conversation, and eventually finds his way out. I started creating the individual scenes using ChatGPT. I described each moment in detail, including the character\'s appearance, the maze, the blob, camera angles, positions, and the overall environment. I worked through the story scene by scene, generating the visuals that would eventually become the animation.' },
      { t: 'p', text: 'Once I had the illustrations, the next challenge was bringing them together.' },
    ],
  },
  {
    title: '07. From individual illustrations to one continuous journey.',
    blocks: [
      { t: 'p', text: 'This is where things got a little technical!' },
      { t: 'p', text: 'A colleague shared a GitHub project with me that used scroll-based animation. In that project, different parts of a battery gradually came together as the user scrolled, eventually forming a complete battery. I found this approach interesting because it gave me a starting point for building my own experience. I cloned the repository, explored how it worked, and replaced the existing visuals with my ChatGPT-generated scenes. I arranged the images in the sequence of my story, from the boy standing outside the maze to the moment he finally finds his way out with the blob. The goal was to make every scroll movement reveal the next part of the story, creating the feeling of one continuous journey rather than a collection of separate illustrations. After putting everything together, I deployed the page and shared it with my colleagues. This time, the feedback was different. The maze concept worked! The connection between overthinking and finding calmness was much clearer, and the story communicated what Nudge was actually about. The direction was finally coming together.' },
      { t: 'p', text: 'But there was one more thing to figure out.' },
    ],
  },
  {
    title: '08. Not everyone wants to take the scenic route.',
    blocks: [
      { t: 'p', text: 'The scroll-based story was working well, but I started thinking about the different kinds of people visiting the website. What if someone already understood what Nudge was and simply wanted to download the app? Would they really need to scroll through the entire story first? I didn\'t want the storytelling experience to become an obstacle between users and the app. So, I thought about creating a more direct entry point. The solution was to design a landing screen that communicated the entire idea at a glance. I brought the main elements of the story together into one composition: the boy standing outside the maze, thought bubbles floating above his head, and a maze with a softly illuminated path leading towards the Nudge blob. The blob has its own little thought bubble saying, **"I\'m here to help!"**' },
      { t: 'p', text: 'Even without scrolling, visitors can understand what\'s happening. Someone is overwhelmed with thoughts, Nudge is there to help, and there\'s a way forward. I placed the Android and iOS download buttons right at the centre of the screen, making the primary action easy to find.' },
      { t: 'p', text: 'Now, users have two ways to experience the website. They can download the app straight away, or they can scroll down and follow the complete story of the boy and the blob.' },
    ],
  },
  {
    title: '09. And that\'s how Nudge found its way onto the screen.',
    blocks: [
      { t: 'p', text: 'What started as a simple landing page design turned into a storytelling experience. I began by trying to communicate calmness through colours, flowers, and natural elements. But through feedback and exploration, I realised that the real story wasn\'t just about feeling calm. It was about showing how someone gets there. The maze helped me visualise overthinking. The boy gave that feeling a character. The blob brought the personality of Nudge into the story. And scroll-based animation connected all these elements into one experience.' },
      { t: 'p', text: 'For me, the biggest takeaway was that sometimes the best design direction doesn\'t come from making something look more beautiful. It comes from understanding the product more deeply, questioning your first approach, and finding a better way to communicate its purpose.' },
      { t: 'p', text: '**Because Nudge isn\'t just about finding calmness. It\'s about finding your way through the chaos.**' },
    ],
  },
]

// *text* is italic (the source's single-asterisk emphasis), **text** is bold
const rich = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).flatMap((part, i) =>
    part.startsWith('**')
      ? [<strong key={`b${i}`}>{part.slice(2, -2)}</strong>]
      : part.split(/(\*[^*]+\*)/g).filter(Boolean).map((s, j) =>
          s.startsWith('*') ? <em key={`i${i}-${j}`}>{s.slice(1, -1)}</em> : s,
        ),
  )



const CSS = `
.np{background:#fbf8f2;color:#1f2430;font-family:${FONT};overflow-x:hidden}
.np *{box-sizing:border-box}
.np-wrap{max-width:1100px;margin:0 auto;padding:0 24px}
/* back to the landing: pinned, so it is one tap away anywhere in a long read */
.np-back{position:fixed;top:max(16px,env(safe-area-inset-top));left:max(16px,env(safe-area-inset-left));z-index:50;display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.92);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#1f2430;text-decoration:none;font-weight:800;font-size:15px;line-height:1;padding:10px 18px 10px 14px;border-radius:999px;box-shadow:0 6px 18px -6px rgba(15,118,110,.35),0 0 0 1px rgba(20,184,166,.2);transition:transform .2s ease,box-shadow .2s ease}
.np-back:hover{transform:translateY(-1px);box-shadow:0 10px 24px -8px rgba(15,118,110,.4),0 0 0 1px rgba(20,184,166,.35)}
.np-back:focus-visible{outline:2px solid #14b8a6;outline-offset:3px}
.np-back span{display:inline-block;transition:transform .2s ease}
.np-back:hover span{transform:translateX(-3px)}
.np-hero{display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:24px;min-height:100vh;padding:70px 0 40px}
.np-hero>div{min-width:0;text-align:center}
.np-hero img{width:100%;max-height:92vh;object-fit:contain}
.np-3d{white-space:nowrap;font-family:${HEAD};font-weight:400;font-size:clamp(28px,4vw,58px);line-height:1.25;margin:0;color:#e6fbf7;letter-spacing:.01em;-webkit-text-stroke:3px #0b5d54;paint-order:stroke fill;
text-shadow:3px 3px 0 #0b5d54,4px 4px 0 #0b5d54,5px 5px 0 #0b5d54,6px 6px 0 #0b5d54,7px 7px 0 #14b8a6,8px 8px 0 #14b8a6;
transform:rotate(-3deg);transform-origin:center}
.np-3d span{display:block;white-space:nowrap}
.np-3d .a{color:#7fd8cb;font-size:1.1em;margin:.1em 0}
.np-sub{margin:34px 0 0;font-size:clamp(16px,2vw,20px);font-weight:700;color:#4a5160}
.np-sec{padding:72px 0}
.np-h2{font-family:${HEAD};font-weight:400;font-size:clamp(24px,3.2vw,38px);line-height:1.2;margin:0 0 26px;color:#e6fbf7;letter-spacing:.01em;-webkit-text-stroke:2px #0b5d54;paint-order:stroke fill;text-shadow:3px 3px 0 #0b5d54,4px 4px 0 #0b5d54,5px 5px 0 #14b8a6;transform:rotate(-1.2deg);transform-origin:left center}
.np-num{display:inline-block;color:#fff;background:#14b8a6;border-radius:14px;padding:2px 12px;margin-right:10px;transform:rotate(-4deg);text-shadow:none;-webkit-text-stroke:0}
.np-body p{font-size:clamp(17px,1.7vw,20px);line-height:1.8;font-weight:600;color:#2a2f3a;margin:0 0 18px}
.np-body p:last-child{margin-bottom:0}
.np-body p.np-bub{position:relative;color:#06302c;padding:clamp(26px,4vw,48px) clamp(26px,4.5vw,56px);margin:10px 0 44px;border-radius:70px 90px 80px 100px / 80px 70px 90px 70px;
background-color:#7fd8cb;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 -.12'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.np-body p.np-bub::after{content:'';position:absolute;bottom:-28px;left:18%;width:34px;height:34px;background:#7fd8cb;clip-path:polygon(0 0,100% 0,35% 100%)}
.np-body p.np-bub.r::after{left:auto;right:18%;clip-path:polygon(0 0,100% 0,65% 100%)}
.np-q{font-style:italic;font-weight:800;color:#0f766e;background:#e6fbf7;border:2px solid #14b8a6;border-radius:22px 22px 22px 4px;padding:10px 18px;margin:0 12px 12px 0;display:inline-block;font-size:18px}
.np-mocks{display:flex;justify-content:center;gap:clamp(20px,5vw,48px);margin:48px 0 0;align-items:center}
.np-mocks .np-device{flex:0 0 auto;width:min(232px,40vw)}
.np-mocks .np-device:first-child{transform:rotate(-3deg)}
.np-mocks .np-device:last-child{transform:rotate(3deg) translateY(16px)}
.np-device{filter:drop-shadow(0 20px 24px rgba(15,60,60,.2)) drop-shadow(0 3px 5px rgba(15,60,60,.12))}
.np-center .np-h2,.np-center .np-body p{text-align:center}
.np-center{text-align:center;max-width:760px;margin:0 auto}
/* section 08: the phone stood in front of the laptop's left corner, one composition (the padding is the phone's height above the laptop) */
.np-devices{position:relative;width:100%;padding:24% 0 0 20%}
.np-devices .lap{display:block;width:100%;height:auto;filter:drop-shadow(0 16px 22px rgba(0,0,0,.22))}
.np-devices .ph{position:absolute;left:3%;bottom:0;width:34%;z-index:2;transform:rotate(-6deg);transform-origin:bottom center}
/* a story beside its picture: the picture stays in view (sticky) while the longer text goes past */
.np-split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(32px,5vw,64px);align-items:start}
.np-split.loop{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr)}
.np-split.devices{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}
.np-media{position:sticky;top:max(96px,14vh)}
.np-p3{display:grid;grid-template-columns:1.25fr 1fr;gap:32px;align-items:center}
.np-p3 p{margin:0}
.np-spiral{width:100%;max-width:600px;margin:0 auto}
.np-spiral svg{width:100%;height:auto;overflow:visible;display:block}
.np-flow{animation:np-loop 11s cubic-bezier(.45,.05,.55,.95) infinite}
@keyframes np-loop{0%{stroke-dasharray:.0001 2;stroke-dashoffset:0}50%{stroke-dasharray:1 2;stroke-dashoffset:0}100%{stroke-dasharray:.0001 2;stroke-dashoffset:-1}}
.np-chars{display:flex;justify-content:center;gap:clamp(20px,8vw,110px);margin-top:44px;perspective:900px;flex-wrap:wrap}
.np-char{display:flex;flex-direction:column;align-items:center;width:min(42%,220px)}
.np-char .spin{width:100%}
.np-spinner{position:relative;width:100%;perspective:900px;filter:drop-shadow(0 10px 8px rgba(0,0,0,.25))}
.np-frame{position:absolute;left:50%;bottom:0;overflow:hidden;will-change:transform,opacity}
.np-frame img{position:absolute;max-width:none;display:block;user-select:none}
.np-char .pad{width:130%;height:26px;margin-top:-6px;border-radius:50%;background:radial-gradient(ellipse,rgba(20,184,166,.55),rgba(20,184,166,0) 70%);border:2px solid rgba(20,184,166,.35)}
.np-char b{margin-top:10px;font-family:${DISPLAY};font-weight:400;font-size:18px;color:#0f766e}
.np-stage{position:relative;height:clamp(240px,40vw,420px);margin-top:44px}
.np-stage img{position:absolute;top:50%;left:50%;height:100%;width:auto;max-width:56%;object-fit:cover;border-radius:22px;box-shadow:0 18px 36px rgba(0,0,0,.25);transition:transform .8s cubic-bezier(.6,.05,.25,1),opacity .8s,filter .8s}
@media(max-width:820px){.np-hero,.np-split,.np-p3{grid-template-columns:1fr}.np-p3{gap:24px}.np-hero{min-height:auto;padding-top:80px}.np-3d{transform:rotate(-2deg)}.np-sec{padding:48px 0}.np-split .np-spiral,.np-split .ot{order:2}}
@media(max-width:600px){.np-3d{font-size:clamp(24px,9vw,52px);line-height:1.25}.np-chars{flex-wrap:nowrap;gap:12px}.np-char{width:46%}.np-char b{font-size:16px}.np-char .pad{width:100%}}
@media(prefers-reduced-motion:reduce){.np *{animation:none!important}}
`

type Frame = { angle: number; src: string; mirror?: boolean }
type Box = { x: number; y: number; w: number; h: number; nw: number; nh: number }
const BOX_H = 280

// Finds the opaque bounding box of an image so every view can be scaled to the same visible size.
const measure = (src: string) =>
  new Promise<Box>((resolve) => {
    const im = new Image()
    im.onload = () => {
      const c = document.createElement('canvas')
      c.width = im.naturalWidth
      c.height = im.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.drawImage(im, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height).data
      let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0
      for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++)
          if (d[(y * c.width + x) * 4 + 3] > 24) {
            if (x < x0) x0 = x
            if (x > x1) x1 = x
            if (y < y0) y0 = y
            if (y > y1) y1 = y
          }
      resolve({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, nw: c.width, nh: c.height })
    }
    im.src = src
  })

// Turns a character through 360deg. All views are cropped to their visible area and scaled to the
// same height, then cross-faded while rotating, driven by rAF without React re-renders.
function Spinner({ frames, alt, offset = 0, height: h = BOX_H }: { frames: Frame[]; alt: string; offset?: number; height?: number }) {
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 600px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 600px)')
    const on = () => setSmall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const height = small ? Math.min(h, 150) : h
  const [boxes, setBoxes] = useState<Box[] | null>(null)
  const refs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    let live = true
    Promise.all(frames.map((f) => measure(f.src))).then((b) => live && setBoxes(b))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!boxes) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let deg = offset
    let raf = 0
    let last = performance.now()
    const paint = () => {
      frames.forEach((f, i) => {
        const el = refs.current[i]
        if (!el) return
        const rel = ((deg - f.angle + 540) % 360) - 180
        const half = 180 / frames.length
        const z = half * 0.3
        const wgt = Math.max(0, Math.min(1, (half + z / 2 - Math.abs(rel)) / z))
        el.style.opacity = String(wgt)
        el.style.transform = `rotateY(${rel}deg)${f.mirror ? ' scaleX(-1)' : ''}`
      })
    }
    const tick = (now: number) => {
      deg = (deg + (now - last) * 0.05) % 360
      last = now
      paint()
      raf = requestAnimationFrame(tick)
    }
    paint()
    if (!still) raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes])
  return (
    <div className="np-spinner" style={{ height }} role="img" aria-label={alt}>
      {boxes && frames.map((f, i) => {
        const b = boxes[i]
        const s = height / b.h
        return (
          <div
            key={i}
            ref={(el) => { refs.current[i] = el }}
            className="np-frame"
            style={{ width: b.w * s, height, marginLeft: -(b.w * s) / 2, opacity: 0 }}
          >
            <img src={f.src} alt="" draggable={false} style={{ width: b.nw * s, height: b.nh * s, left: -b.x * s, top: -b.y * s }} />
          </div>
        )
      })}
    </div>
  )
}


function Gallery() {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % GALLERY.length), 2000)
    return () => clearInterval(id)
  }, [])
  const n = GALLERY.length
  return (
    <div className="np-stage">
      {GALLERY.map((src, i) => {
        const off = ((i - active + n + 2) % n) - 2 // -2..2, 0 = centre
        const a = Math.abs(off)
        return (
          <img
            key={src}
            src={src}
            alt=""
            style={{
              transform: `translate(calc(-50% + ${off * 30}%), -50%) scale(${a === 0 ? 1 : a === 1 ? 0.8 : 0.62})`,
              zIndex: 10 - a,
              opacity: a === 2 ? 0.55 : 1,
              filter: a === 0 ? 'none' : 'brightness(.85)',
            }}
          />
        )
      })}
    </div>
  )
}

const Body = ({ blocks, bub = -1, right = false }: { blocks: Block[]; bub?: number; right?: boolean }) => {
  const firstQ = blocks.findIndex((b) => b.t === 'q')
  return (
    <div className="np-body">
      {blocks.map((b, i) => {
        if (b.t === 'q') {
          if (i !== firstQ) return null
          return (
            <p key={i}>
              {blocks.filter((x) => x.t === 'q').map((q) => (
                <span key={q.text} className="np-q">{q.text}</span>
              ))}
            </p>
          )
        }
        return <p key={i} className={i === bub ? `np-bub${right ? ' r' : ''}` : undefined}>{rich(b.text)}</p>
      })}
    </div>
  )
}

const heading = (i: number, title: string) => {
  const m = title.match(/^(\d+)\.\s*(.*)$/)
  return (
    <h2 className="np-h2">
      <span className="np-num">{m ? m[1] : i + 1}</span>
      {m ? m[2] : title}
    </h2>
  )
}

export default function NudgePage() {
  useEffect(() => {
    window.scrollTo(0, 0)
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Bagel+Fat+One&family=Chango&family=Nunito:wght@600;700;800&display=swap'
    document.head.appendChild(link)
    return () => {
      link.remove()
    }
  }, [])

  return (
    <main className="np">
      <style>{CSS}</style>
      <a href="#/" className="np-back" onClick={backToLanding}>
        <span aria-hidden="true">←</span> Back
      </a>

      <div className="np-wrap">
        <header className="np-hero">
          <img src={heroImg} alt="Nudge illustration" />
          <div>
            <h1 className="np-3d">
              <span>Nudge</span>
              <span className="a">Stop</span><span className="a">Overthinking</span>
              <span>Start Doing</span>
            </h1>
          </div>
        </header>
      </div>

      {SECTIONS.map((s, idx) => {
        const n = idx + 1
        const text = (
          <>
            {heading(idx, s.title)}
            <Body blocks={s.blocks} bub={BLOBS[idx + 1] ?? -1} right={(idx + 1) % 4 === 3} />
          </>
        )
        let inner: ReactNode
        if (n === 3) {
          inner = (
            <div className="np-split">
              <OverthinkingLoop />
              <div>{text}</div>
            </div>
          )
        } else if (n === 8) {
          inner = (
            <div className="np-split devices">
              <div>{text}</div>
              <div className="np-media np-devices">
                <img className="lap" src={nudgeLaptop} alt="Nudge desktop screen" />
                <DeviceShot className="ph np-device" src={nmockup3} alt="Nudge mobile screen" iw={809} ih={1188} crop={[0.238, 0.197, 0.422, 0.581]} />
              </div>
            </div>
          )
        } else {
          inner = (
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
              {text}
            </div>
          )
        }
        return (
          <section key={s.title} className="np-sec">
            <div className="np-wrap">
              {inner}
              {n === 2 && (
                <div className="np-mocks">
                  <DeviceShot className="np-device" src={nmockup1} alt="Nudge app screen 1" iw={946} ih={1234} crop={[0.249, 0.196, 0.45, 0.583]} />
                  <DeviceShot className="np-device" src={nmockup2} alt="Nudge app screen 2" iw={906} ih={1228} crop={[0.258, 0.196, 0.454, 0.583]} />
                </div>
              )}
              {n === 5 && (
                <div className="np-chars">
                  <div className="np-char">
                    <div className="spin"><Spinner alt="The boy" frames={[{ angle: 0, src: boyFront }, { angle: 180, src: boyBack }]} /></div>
                    <div className="pad" />
                    <b>The Boy</b>
                  </div>
                  <div className="np-char">
                    <div className="spin"><Spinner alt="Nudge blob" offset={0} frames={[{ angle: 0, src: nudgeFront }, { angle: 180, src: nudgeBack }]} /></div>
                    <div className="pad" />
                    <b>Nudge</b>
                  </div>
                </div>
              )}
              {n === 6 && <Gallery />}
            </div>
          </section>
        )
      })}
    </main>
  )
}
