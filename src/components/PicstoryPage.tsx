import { useEffect, type ReactNode } from 'react'
import DeviceShot from '@/components/DeviceShot'
import { backToLanding } from '@/lib/caseStudyNav'
import mockup1 from '@/assets/meadow/mockup1.webp'
import mockup2 from '@/assets/meadow/mockup2.webp'
import mockup3 from '@/assets/meadow/mockup3.webp'
import group2167 from '@/assets/meadow/Group 2167.webp'
import para3 from '@/assets/meadow/para3.webp'
import para33 from '@/assets/meadow/para33.webp'
import sketch1 from '@/assets/meadow/sketch1.webp'
import sketch2 from '@/assets/meadow/sketch2.webp'
import sketch3 from '@/assets/meadow/sketch3.webp'
import stars from '@/assets/scrap/stars.png'
import plaid from '@/assets/scrap/plaid.png'
import flowernote from '@/assets/scrap/flowernote.png'

const MAROON = '#6E0D25'
const YELLOW = '#FFFFB3'
const BROWN = '#6A381F'
const GOLD = '#DCAB6B'
const CREAM = '#ffffff'
const INK = '#2b1a14'
const BODY = 'Lato, Inter, "Helvetica Neue", Arial, sans-serif'
const SERIF = 'Merriweather, Georgia, serif'

type Block = { t: 'p' | 'strong' | 'li'; text: string; lead?: string }
type Section = { title: string; sub?: string; blocks: Block[] }

const INTRO = "Sometimes, the best ideas don't come from brainstorming sessions. They come from the simplest moments."

const SECTIONS: Section[] = [
  {
    title: '01. It all started with a birthday!',
    blocks: [
      { t: 'p', text: "One day, it was my best friend's birthday, and I wanted to create something really pretty and creative for my Instagram story. I didn't want to just put a picture with a birthday wish. I wanted to make something that looked thoughtfully designed, something that would make her feel special. I started thinking about different layouts, photo arrangements, cute elements, and all the little details that could make a story stand out. And then, a thought crossed my mind." },
      { t: 'strong', text: 'What if there was a website where I could simply pick a beautifully designed template, add my pictures, and have a ready-to-post Instagram story?' },
      { t: 'p', text: 'That one thought became the beginning of Picstory.' },
    ],
  },
  {
    title: '02. Before pixels, there were pen and paper.',
    sub: 'Every good design has a messy beginning. Mine started in a notebook.',
    blocks: [
      { t: 'p', text: 'Before opening Figma, I picked up my notebook and started sketching. I wanted to explore different layouts for different occasions — birthdays, anniversaries, outings, trips, and all those little moments people love capturing. I sketched multiple templates, experimenting with photo placements, frames, tags, decorative elements, backgrounds, and different compositions. Some layouts were simple, some were playful, and some had a lot more going on.' },
      { t: 'p', text: "I wasn't just drawing pretty templates. I was trying to imagine how someone would use them, where their pictures would go, and how all the elements would come together." },
    ],
  },
  {
    title: '03. Bringing those little sketches to life.',
    sub: 'From notebook doodles to pixels on a screen — this is where things started taking shape.',
    blocks: [
      { t: 'p', text: 'Once I was happy with the rough layouts, I moved to Figma. I took each sketch as a reference and started recreating it digitally. I experimented with backgrounds, colours, stickers, tags, photo frames, and decorative elements. I wanted every template to have its own personality while still feeling like a part of the same website. I combined all the elements into individual, ready-to-use templates, making sure the photo frames were positioned exactly where I wanted them.' },
      { t: 'p', text: 'Slowly, my notebook sketches started looking like something people could actually use.' },
    ],
  },
  {
    title: '04. A template is great, but how do people get to it?',
    sub: 'I had the templates. Now I needed to build an experience around them.',
    blocks: [
      { t: 'p', text: "I didn't want Picstory to be just a collection of designs. I wanted the entire experience to feel simple, intuitive, and enjoyable. So, I started designing the other screens." },
      { t: 'p', text: 'First came the splash screen — the very first thing users would see when they opened the website.' },
      { t: 'p', text: 'Then came the template browsing screen, where users could explore different designs.' },
      { t: 'p', text: 'I planned category capsule buttons so users could quickly find templates based on occasions, along with a search bar for those who already knew what they were looking for. I also designed the template editing screen, keeping the photo frames and editing actions easy to understand.' },
      { t: 'p', text: "At this point, I wasn't just designing individual screens anymore. I was connecting them into one complete user journey." },
    ],
  },
  {
    title: "05. And now, let's make it work!",
    sub: "Designing how something looks is one thing. Making every little button actually do what it's supposed to? That's another story.",
    blocks: [
      { t: 'p', text: 'Once the Figma designs were ready, I moved to Claude Code to bring the website to life. I provided my designs and explained how I wanted the entire experience to work, step by step.' },
      { t: 'p', text: "Here's the journey I had in mind:" },
      { t: 'li', lead: 'First stop: The splash screen.', text: 'Users land on the introductory screen, where they can click on the "Let\'s Get Started" button to begin.' },
      { t: 'li', lead: 'Next: The template gallery.', text: 'They arrive at a screen filled with ready-made templates. They can browse through different categories using the capsule buttons or search for something specific.' },
      { t: 'li', lead: 'Found something you love?', text: 'They click on the "Use Template" button, and their selected design opens in the editor.' },
      { t: 'li', lead: 'Time to add your memories!', text: 'Users can click on any photo frame they want to fill. An "Add Photo" button appears at the bottom, which opens their device gallery so they can choose the picture they want. They can repeat this process for every frame until their template is complete.' },
      { t: 'li', lead: "And finally, it's ready!", text: 'Once all the pictures are in place, they can download their creation and share it on Instagram.' },
      { t: 'p', text: 'I wanted the process to be so simple that anyone could create a beautiful visual story without having to design one from scratch.' },
    ],
  },
  {
    title: "06. But wait, there's more!",
    sub: 'Why stop at ready-made templates when users can make them their own?',
    blocks: [
      { t: 'p', text: 'While building Picstory, I started thinking about what else could make it more useful. I wanted to give users a little more creative freedom rather than limiting them to the templates exactly as they were. So, I started exploring a few additional features:' },
      { t: 'li', lead: 'Personalised stickers:', text: 'Users can upload their own stickers or choose from a collection of pre-built ones.' },
      { t: 'li', lead: 'More photo frames:', text: 'They can add additional frames to a template instead of being restricted to the original layout.' },
      { t: 'li', lead: 'Flexible resizing:', text: 'They can resize elements and frames to customise the composition according to their liking.' },
      { t: 'p', text: 'The idea is to let people start with a beautifully designed template but still have the freedom to make it feel like their own. These are some of the additions I want to keep working on as Picstory evolves.' },
    ],
  },
  {
    title: '07. From a little thought to something real.',
    sub: 'There\'s a different kind of happiness in seeing something that once existed only in your imagination actually working on a screen.',
    blocks: [
      { t: 'p', text: 'Looking back, Picstory started with me wanting to make one birthday story for my best friend. Today, that little thought has turned into a website where people can choose templates, add their favourite pictures, customise their designs, and create visual stories of their own. There are still things I want to improve, features I want to add, and ideas waiting to be explored.' },
      { t: 'p', text: "But I'm genuinely happy with what I've built so far. Not just because I created a website, but because I got to experience the entire journey — from sketching the first layout in my notebook to designing screens in Figma and bringing them to life with code. And I think that's what motivates me the most." },
      { t: 'strong', text: 'A random little thought became an idea. That idea became a design. And that design became something real.' },
      { t: 'p', text: "That's Picstory. And this is only the beginning!" },
    ],
  },
]

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Playfair+Display:ital,wght@0,900;1,900&family=Rye&family=Special+Elite&display=swap');
.ps-root { position: relative; min-height: 100vh; color: ${INK}; font-family: ${BODY}; }
.ps-paper { position: fixed; inset: 0; z-index: 0; background: ${CREAM}; }
.ps-wrap { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 32px 24px 120px; }
.ps-back { color: ${MAROON}; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: .02em; }
.ps-hero { display: grid; grid-template-columns: 1fr 1.1fr; align-items: center; gap: 56px; margin: 12px 0 72px; }
.ps-title { font-family: 'Arial Black', Impact, Inter, sans-serif; font-weight: 900; font-size: clamp(44px, 8.4vw, 92px); letter-spacing: .02em; line-height: 1; margin: 0; color: ${YELLOW}; -webkit-text-stroke: 2px ${MAROON};
  text-shadow: 1px 1px 0 ${MAROON}, 2px 2px 0 ${MAROON}, 3px 3px 0 ${MAROON}, 4px 4px 0 ${MAROON}, 5px 5px 0 ${MAROON}, 6px 6px 0 ${MAROON}, 7px 7px 0 ${MAROON}, 8px 8px 0 ${MAROON}, 9px 9px 0 ${MAROON}, 10px 10px 0 ${MAROON}, 12px 16px 22px rgba(60,10,25,.35); transform: perspective(600px) rotateX(8deg) rotateY(-6deg); transform-origin: left center; }
.ps-sub { font-family: ${SERIF}; font-weight: 900; font-style: italic; font-size: clamp(20px, 3vw, 30px); line-height: 1.25; margin: 26px 0 0; max-width: 11em; color: ${MAROON}; text-shadow: 1px 1px 2px rgba(220,171,107,.35); }
.ps-mocks { position: relative; aspect-ratio: 1 / 1.05; }
.ps-mocks img { position: absolute; height: auto; }
.ps-sec { position: relative; margin: 0 0 96px; }
.ps-num { margin: 0 0 12px; line-height: 1; }
.ps-h2 { margin: 0 0 18px; line-height: 1.9; font-size: 0; }
.ps-cut { display: inline-block; margin: 0 4px 6px 0; padding: 2px 8px 3px; font-size: clamp(22px, 3.4vw, 32px); line-height: 1.15; box-shadow: 1px 2px 0 rgba(0,0,0,.18); }
.ps-num .ps-cut { font-size: 26px; margin-right: 3px; }
.ps-cut.c0 { background: #f6c915; color: #a3123f; font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 900; transform: rotate(-3deg); clip-path: polygon(0 6%, 96% 0, 100% 92%, 4% 100%); }
.ps-cut.c1 { background: #a3123f; color: #fff4d6; font-family: 'Abril Fatface', 'Playfair Display', serif; transform: rotate(2deg); clip-path: polygon(3% 0, 100% 8%, 97% 100%, 0 94%); }
.ps-cut.c2 { background: #efe6da; color: #111; font-family: 'Special Elite', 'Courier New', monospace; font-weight: 700; transform: rotate(-1.5deg); background-image: linear-gradient(rgba(0,0,0,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.12) 1px, transparent 1px); background-size: 8px 8px; }
.ps-cut.c3 { background: #7cc7d0; color: #1b3a6b; font-family: 'Rye', 'Abril Fatface', serif; transform: rotate(3deg); clip-path: polygon(0 0, 98% 5%, 100% 100%, 5% 96%); }
.ps-cut.c4 { background: #f4a6bd; color: #5a1230; font-family: 'Playfair Display', Georgia, serif; font-weight: 900; transform: rotate(-2deg); clip-path: polygon(4% 4%, 100% 0, 96% 100%, 0 92%); }
.ps-cut.c5 { background: #1c1c1c; color: #f6f0e4; font-family: 'Abril Fatface', serif; transform: rotate(1.5deg); }
.ps-note-wrap { position: relative; margin: 20px 0 110px 28px; transform: rotate(-.8deg); }
.ps-note-wrap::before { content: ''; position: absolute; inset: 22px -22px -22px 60px; background: #7a1226 radial-gradient(#f3d9d9 1.4px, transparent 1.6px) 0 0 / 14px 14px; z-index: 0; }
.ps-note { position: relative; z-index: 1; padding: 56px clamp(18px, 6vw, 64px) 48px clamp(68px, 7vw, 84px); background-color: #e9dfc3;
  background-image: linear-gradient(90deg, transparent 52px, rgba(190,80,80,.45) 52px, rgba(190,80,80,.45) 54px, transparent 54px), repeating-linear-gradient(transparent 0, transparent 32px, rgba(150,120,110,.45) 32px, rgba(150,120,110,.45) 33px);
  clip-path: polygon(0 2%, 8% 0, 20% 1.5%, 35% 0, 52% 1.6%, 70% 0, 88% 1.4%, 100% 0, 100% 97%, 92% 100%, 78% 98.4%, 60% 100%, 42% 98.5%, 25% 100%, 10% 98.6%, 0 100%); }
.ps-note .ps-p, .ps-note .ps-strong { line-height: 33px; margin-bottom: 33px; }
.ps-note .ps-strong { border-left-color: #a3123f; }
.ps-pin { position: absolute; top: -12px; left: 54%; z-index: 3; width: 26px; height: 26px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ff9a9a, #c01d2e 55%, #7a0c18); box-shadow: 4px 8px 6px rgba(0,0,0,.28); }
.ps-pin::after { content: ''; position: absolute; left: 11px; top: 22px; width: 2px; height: 12px; background: #999; transform: rotate(28deg); }
.ps-plaidwrap { position: relative; margin: 40px 0 0; padding: 20px 0 0 0; }
.ps-plaid { position: absolute; right: -24px; top: -34px; width: min(330px, 56vw); aspect-ratio: 723 / 640; background: url(${plaid}) top right / 100% 100% no-repeat; z-index: 0; transform: scaleX(-1) rotate(8deg); }
.ps-ticket { position: relative; z-index: 1; margin: 90px 0 0; padding: clamp(28px, 5vw, 56px); background: #fff9e8; border: 3px dashed #a3123f; border-radius: 6px; transform: rotate(1deg); box-shadow: 10px 12px 0 rgba(163,18,63,.9); }
.ps-ticket::before { content: ''; position: absolute; top: -16px; left: 14%; width: 110px; height: 30px; background: rgba(246,201,21,.8); transform: rotate(-4deg); }
.ps-el { position: absolute; background-image: url(${stars}); background-repeat: no-repeat; mix-blend-mode: multiply; pointer-events: none; z-index: 2; }
.ps-el.s1 { aspect-ratio: 695/670; background-size: 166% auto; background-position: 8.7% 2.9%; }
.ps-el.s2 { aspect-ratio: 655/625; background-size: 176% auto; background-position: 91.5% 44.3%; }
.ps-el.s3 { aspect-ratio: 680/655; background-size: 169% auto; background-position: 22.2% 87.2%; }
.ps-el.flower { background-image: url(${flowernote}); aspect-ratio: 305/290; background-size: 378% auto; background-position: 7.1% 37.5%; mix-blend-mode: normal; }
.ps-el.flower { -webkit-mask-image: radial-gradient(closest-side, #000 85%, transparent); mask-image: radial-gradient(closest-side, #000 85%, transparent); }
.ps-tape { position: absolute; width: 120px; height: 30px; background: rgba(246,201,21,.75); z-index: 2; }
.ps-subline { font-family: ${SERIF}; font-style: italic; font-size: 17px; line-height: 1.6; margin: 0 0 22px; opacity: .85; }
.ps-p { font-size: 18px; line-height: 1.85; margin: 0 0 18px; max-width: 700px; }
.ps-strong { font-family: ${SERIF}; font-weight: 700; font-size: 20px; line-height: 1.6; margin: 26px 0; max-width: 700px; padding-left: 18px; border-left: 3px solid ${GOLD}; }
.ps-li { margin: 0 0 18px; max-width: 700px; padding-left: 18px; border-left: 2px solid ${GOLD}; line-height: 1.75; font-size: 17px; }
.ps-li b { font-family: ${SERIF}; display: block; margin-bottom: 2px; }

.ps-frames { display: flex; flex-wrap: wrap; justify-content: center; gap: 36px; margin: 56px 0 0; }
.ps-frame { position: relative; background: #fffdf6; padding: 14px 14px 44px; box-shadow: 0 14px 30px -10px rgba(70,35,20,.35), 0 2px 4px rgba(70,35,20,.15); transition: transform .35s ease; }
.ps-frame:hover { transform: rotate(0deg) scale(1.03) !important; }
.ps-frame::before { content: ''; position: absolute; top: -13px; left: 50%; width: 84px; height: 26px; transform: translateX(-50%) rotate(-3deg); background: rgba(220,171,107,.75); }
.ps-frame .ph { display: flex; align-items: center; justify-content: center; background: repeating-linear-gradient(45deg, #f3e7d3, #f3e7d3 10px, #efdfc6 10px, #efdfc6 20px); border: 2px dashed ${GOLD}; color: ${BROWN}; font-size: 13px; letter-spacing: .15em; text-transform: uppercase; }
.ps-frame img { display: block; max-width: 100%; height: auto; }
.ps-journey { position: relative; width: 100%; max-width: 900px; margin: 56px auto 0; aspect-ratio: 900 / 890; }
.ps-journey img { position: absolute; height: auto; }
.ps-journey svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
@media (max-width: 720px) {
  .ps-wrap { padding: 84px 16px 80px; }
  .ps-hero { grid-template-columns: 1fr; gap: 8px; margin-bottom: 56px; }
  .ps-mocks .ps-device { width: min(100%, 380px); }
  .ps-p, .ps-li { font-size: 16.5px; }
  .ps-sec { margin-bottom: 64px; }
  .ps-note-wrap { margin-left: 8px; margin-right: 12px; }
  .ps-note { padding-top: 44px; padding-bottom: 36px; }
  .ps-note-wrap::before { inset: 16px -12px -14px 30px; }
  .ps-el.hide-m { display: none; }
  .ps-frames { gap: 28px; }
  /* the journey turns into a zigzag down the page */
  .ps-journey { grid-template-columns: 1fr; width: auto; margin: 48px 0 0; }
  .ps-step { width: min(62%, 250px); }
  .ps-step.s1, .ps-step.s3 { justify-self: start; margin: 0 0 0 4%; }
  .ps-step.s2 { justify-self: end; margin: 0 4% 0 0; }
  .ps-arcs { display: none; }
  .ps-arrow { margin: 6px 0; }
  .ps-arrow svg { display: block; width: 100%; height: auto; overflow: visible; }
  .ps-arrow.a2 svg { transform: scaleX(-1); }
}
`

function Text({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.t === 'strong' ? (
          <p key={i} className="ps-strong">{b.text}</p>
        ) : b.t === 'li' ? (
          <p key={i} className="ps-li">
            <b>{b.lead}</b>
            {b.text}
          </p>
        ) : (
          <p key={i} className="ps-p">{b.text}</p>
        ),
      )}
    </>
  )
}

function Cut({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <span key={i} className={`ps-cut c${(i + offset) % 6}`}>{w}</span>
      ))}
    </>
  )
}

function Heading({ s }: { s: Section }) {
  const [num, ...rest] = s.title.split('. ')
  const off = parseInt(num, 10) || 0
  return (
    <>
      <p className="ps-num"><Cut text={num} offset={off + 2} /></p>
      <h2 className="ps-h2"><Cut text={rest.join('. ')} offset={off} /></h2>
      {s.sub ? <p className="ps-subline">{s.sub}</p> : null}
    </>
  )
}

function Frame({ rot, w, children }: { rot: number; w: number; children: ReactNode }) {
  return (
    <div className="ps-frame" style={{ transform: `rotate(${rot}deg)`, width: w, maxWidth: '88vw' }}>
      {children}
    </div>
  )
}

function Arrow({ d, head }: { d: string; head: string }) {
  const p = { fill: 'none', stroke: '#111', strokeWidth: 4.5, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const
  return (
    <svg className="ps-arcs" viewBox="0 0 1000 631" aria-hidden="true">
      <path d="M 250 16 C 282 -64, 444 -82, 503 48" {...ARROW} />
      <path d="M 504.6 22.1 L 503 48 L 482.4 32.1" {...ARROW} />
      <path d="M 618 66 C 656 -14, 778 -22, 812 100" {...ARROW} />
      <path d="M 817.6 74.6 L 812 100 L 794.1 81.2" {...ARROW} />
    </svg>
  )
}

// On phones the journey runs down the page in a zigzag: a swoop from one step to the next (the second mirrored, as it turns back)
function Arrow({ className }: { className: string }) {
  return (
    <div className={`ps-arrow ${className}`} aria-hidden="true">
      <svg viewBox="0 0 360 80">
        <path d="M 128 6 C 140 52, 196 30, 230 70" {...ARROW} />
        <path d="M 227 56.3 L 230 70 L 217 64.8" {...ARROW} />
      </svg>
    </div>
  )
}

export default function PicstoryPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [s1, s2, s3, s4, s5, s6, s7] = SECTIONS

  return (
    <main className="ps-root">
      <style>{CSS}</style>
      <div className="ps-paper" />
      <a href="#/" className="ps-back" onClick={backToLanding}>
        <span aria-hidden="true">←</span> Back
      </a>
      <div className="ps-wrap">
        <header className="ps-hero">
          <div>
            <h1 className="ps-title">PICSTORY</h1>
            <p className="ps-sub">Create your perfect visual story</p>
          </div>
          <div className="ps-mocks">
            <img src={group2167} alt="Picstory app screens" style={{ width: '88%', left: '12%', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
          </div>
        </header>

        <section className="ps-note-wrap">
          <i className="ps-pin" />
          <div className="ps-el flower" style={{ width: 120, left: -52, top: -40, transform: 'rotate(-12deg)' }} />
          <div className="ps-el s2" style={{ width: 90, right: -34, bottom: -40, transform: 'rotate(14deg)' }} />
          <div className="ps-note">
            <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, lineHeight: '33px', margin: '0 0 33px' }}>{INTRO}</p>
            <Heading s={s1} />
            <Text blocks={s1.blocks} />
          </div>
        </section>

        <section className="ps-sec">
          <div className="ps-el s1 hide-m" style={{ width: 110, right: 0, top: -30, transform: 'rotate(10deg)' }} />
          <Heading s={s2} />
          <Text blocks={s2.blocks} />
          <div className="ps-frames">
            {[-4, 2, -2].map((r, i) => (
              <Frame key={i} rot={r} w={[420, 440, 270][i]}>
                <img src={[sketch1, sketch2, sketch3][i]} alt={`Sketch ${i + 1}`} />
              </Frame>
            ))}
          </div>
        </section>

        <section className="ps-sec">
          <div className="ps-col">
            <Heading s={s3} />
            <Text blocks={s3.blocks} />
          </div>
          <div className="ps-frames" style={{ flexDirection: 'column', alignItems: 'center', gap: 44 }}>
            <Frame rot={-1.2} w={640}>
              <img src={para3} alt="Picstory screens designed in Figma" />
            </Frame>
            <Frame rot={1.2} w={640}>
              <img src={para33} alt="Picstory colours, components and fonts" />
            </Frame>
          </div>
        </section>

        <section className="ps-sec">
          <div className="ps-el s3 hide-m" style={{ width: 130, right: -20, top: 10, transform: 'rotate(-14deg)' }} />
          <div className="ps-el s1 hide-m" style={{ width: 60, right: 120, top: 120, transform: 'rotate(22deg)' }} />
          <Heading s={s4} />
          <Text blocks={s4.blocks} />
        </section>

        <section className="ps-sec">
          <Heading s={s5} />
          <Text blocks={s5.blocks} />
          <div className="ps-journey">
            <img src={mockup1} alt="Splash screen" style={{ width: '56.2%', left: '2.2%', top: '1.9%', transform: 'rotate(8deg)', transformOrigin: '27.7% 46.4%' }} />
            <img src={mockup2} alt="Template gallery" style={{ width: '42.9%', left: '28.8%', top: '18.2%', transform: 'rotate(-9deg)', transformOrigin: '49.5% 46.7%' }} />
            <img src={mockup3} alt="Editor" style={{ width: '52.6%', left: '51.5%', top: '26.4%' }} />
            <svg viewBox="0 0 900 890" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="ps-sketchy" x="-5%" y="-5%" width="110%" height="110%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="4" />
                </filter>
              </defs>
              <g filter="url(#ps-sketchy)">
                <Arrow d="M 190 88 C 280 52, 410 84, 448 214" head="M 431 192 C 438 200, 443 208, 449 218 C 455 208, 461 200, 470 190" />
                <Arrow d="M 520 232 C 610 196, 700 228, 738 364" head="M 721 342 C 728 350, 733 358, 739 368 C 745 358, 751 350, 760 340" />
              </g>
            </svg>
          </div>
        </section>

        <section className="ps-sec">
          <div className="ps-el flower hide-m" style={{ width: 100, right: 10, top: -20, transform: 'rotate(20deg)' }} />
          <Heading s={s6} />
          <Text blocks={s6.blocks} />
        </section>

        <section className="ps-plaidwrap">
          <div className="ps-plaid" />
          <div className="ps-el s2" style={{ width: 80, left: -20, bottom: -30, transform: 'rotate(-16deg)' }} />
          <div className="ps-ticket">
            <Heading s={s7} />
            <Text blocks={s7.blocks} />
          </div>
        </section>
      </div>
    </main>
  )
}
