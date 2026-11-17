import { useEffect, type ReactNode } from 'react'
import DeviceShot from '@/components/DeviceShot'
import { backToLanding } from '@/lib/caseStudyNav'
import mockup1 from '@/assets/meadow/mockup1.webp'
import mockup2 from '@/assets/meadow/mockup2.webp'
import mockup3 from '@/assets/meadow/mockup3.webp'
import group2167 from '@/assets/meadow/Group 2167.webp'
import para3 from '@/assets/meadow/para3.webp'
import para33 from '@/assets/meadow/para33.webp'

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

const CSS = `
.ps-root { position: relative; min-height: 100vh; color: ${INK}; font-family: ${BODY}; }
.ps-paper { position: fixed; inset: 0; z-index: 0; background: ${CREAM}; }
.ps-wrap { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 96px 24px 120px; }

/* back to the landing: pinned, so it is one tap away anywhere in a long read */
.ps-back { position: fixed; z-index: 50; top: max(16px, env(safe-area-inset-top)); left: max(16px, env(safe-area-inset-left));
  display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px 10px 14px; border-radius: 999px;
  background: rgba(255,255,255,.9); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: ${MAROON}; font: 700 15px/1 ${BODY}; letter-spacing: .02em; text-decoration: none;
  box-shadow: 0 6px 18px -6px rgba(80,10,30,.3), 0 0 0 1px rgba(110,13,37,.1); transition: transform .2s ease, box-shadow .2s ease; }
.ps-back:hover { transform: translateY(-1px); box-shadow: 0 10px 24px -8px rgba(80,10,30,.36), 0 0 0 1px rgba(110,13,37,.18); }
.ps-back:focus-visible { outline: 2px solid ${MAROON}; outline-offset: 3px; }
.ps-back span { display: inline-block; transition: transform .2s ease; }
.ps-back:hover span { transform: translateX(-3px); }

/* hero: the name and its promise on the left, the app on the right, centred on one line */
.ps-hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); align-items: center; gap: clamp(24px, 4vw, 48px); margin: 0 0 clamp(64px, 9vw, 104px); }
.ps-title { font-family: 'Arial Black', Impact, Inter, sans-serif; font-weight: 900; font-size: clamp(44px, 5.2vw, 72px); letter-spacing: .02em; line-height: 1; margin: 0; color: ${YELLOW}; -webkit-text-stroke: 2px ${MAROON};
  text-shadow: 1px 1px 0 ${MAROON}, 2px 2px 0 ${MAROON}, 3px 3px 0 ${MAROON}, 4px 4px 0 ${MAROON}, 5px 5px 0 ${MAROON}, 6px 6px 0 ${MAROON}, 7px 7px 0 ${MAROON}, 8px 8px 0 ${MAROON}, 9px 9px 0 ${MAROON}, 10px 10px 0 ${MAROON}, 12px 16px 22px rgba(60,10,25,.35); transform: perspective(600px) rotateX(8deg) rotateY(-6deg); transform-origin: left center; width: fit-content; max-width: 100%; }
.ps-sub { font-family: ${SERIF}; font-weight: 900; font-style: italic; font-size: clamp(20px, 2.8vw, 30px); line-height: 1.25; margin: 30px 0 0; max-width: 11em; color: ${MAROON}; text-shadow: 2px 2px 0 ${GOLD}; }
.ps-mocks { position: relative; display: flex; justify-content: center; align-items: center; padding: 4% 0; }
.ps-glow { position: absolute; inset: 0 -4%; border-radius: 50%; background: radial-gradient(closest-side, rgba(110,13,37,.09), rgba(110,13,37,0)); }
.ps-device { filter: drop-shadow(0 22px 26px rgba(60,10,25,.2)) drop-shadow(0 3px 5px rgba(60,10,25,.12)); }
.ps-mocks .ps-device { position: relative; width: min(100%, 430px); }

/* one reading column, centred on the same axis as the pictures */
.ps-col { max-width: 680px; margin: 0 auto; }
.ps-col > :last-child { margin-bottom: 0; }
.ps-grad { position: relative; border-radius: 28px; padding: clamp(36px, 6vw, 72px) clamp(24px, 6vw, 72px); margin: 0 0 clamp(72px, 10vw, 112px); color: ${YELLOW};
  background: ${MAROON}; box-shadow: 0 30px 60px -28px rgba(80,10,30,.55); overflow: hidden; }
.ps-grad::after { content: ''; position: absolute; inset: 10px; border: 1px solid rgba(255,255,179,.28); border-radius: 20px; pointer-events: none; }
.ps-intro { font-family: ${SERIF}; font-style: italic; font-size: 17px; line-height: 1.6; opacity: .8; margin: 0 0 32px; }
.ps-sec { margin: 0 0 clamp(72px, 10vw, 112px); }
.ps-num { display: flex; align-items: center; gap: 12px; font-family: ${BODY}; font-weight: 700; font-size: 13px; letter-spacing: .16em; font-variant-numeric: tabular-nums; color: ${GOLD}; margin: 0 0 12px; }
.ps-num::after { content: ''; width: 32px; height: 2px; border-radius: 1px; background: currentColor; opacity: .6; }
.ps-h2 { font-family: ${SERIF}; font-weight: 700; font-size: clamp(26px, 3.6vw, 36px); line-height: 1.25; margin: 0 0 14px; text-wrap: balance; }
.ps-subline { font-family: ${SERIF}; font-style: italic; font-size: 17px; line-height: 1.6; margin: 0 0 24px; opacity: .85; }
.ps-p { font-size: 18px; line-height: 1.8; margin: 0 0 18px; }
.ps-strong { font-family: ${SERIF}; font-weight: 700; font-size: 20px; line-height: 1.6; margin: 28px 0; padding-left: 20px; border-left: 3px solid ${GOLD}; }
.ps-li { margin: 0 0 18px; padding-left: 20px; border-left: 2px solid ${GOLD}; line-height: 1.75; font-size: 17px; }
.ps-li b { font-family: ${SERIF}; display: block; margin-bottom: 2px; }

.ps-frames { display: flex; flex-wrap: wrap; justify-content: center; gap: 36px; margin: 56px 0 0; }
.ps-frame { position: relative; background: #fffdf6; padding: 14px 14px 44px; box-shadow: 0 14px 30px -10px rgba(70,35,20,.35), 0 2px 4px rgba(70,35,20,.15); transition: transform .35s ease; }
.ps-frame:hover { transform: rotate(0deg) scale(1.03) !important; }
.ps-frame::before { content: ''; position: absolute; top: -13px; left: 50%; width: 84px; height: 26px; transform: translateX(-50%) rotate(-3deg); background: rgba(220,171,107,.75); }
.ps-frame .ph { display: flex; align-items: center; justify-content: center; background: repeating-linear-gradient(45deg, #f3e7d3, #f3e7d3 10px, #efdfc6 10px, #efdfc6 20px); border: 2px dashed ${GOLD}; color: ${BROWN}; font-size: 13px; letter-spacing: .15em; text-transform: uppercase; }
.ps-frame img { display: block; max-width: 100%; height: auto; }

/* the user journey: splash, gallery, editor, left to right, each a step lower, joined by hand-drawn arrows that arc over the
   gaps. A little wider than the text so the screens can be read. Every length in it is a share of its own width (fr columns
   in proportion to each phone, so all three are the same height, and lifts in cqw), so the arrows, drawn once over the whole
   row (.ps-arcs: 1000 units across), land on the phones at any size */
.ps-journey { container-type: inline-size; position: relative; display: grid; align-items: start;
  grid-template-columns: 580fr 140fr 603fr 140fr 495fr;
  width: min(1040px, calc(100vw - 48px)); margin: 128px 0 0 calc(50% - min(520px, 50vw - 24px)); }
.ps-step { margin: 0; }
.ps-step.s2 { margin-top: 3.6vw; margin-top: 6cqw; }
.ps-step.s3 { margin-top: 7.2vw; margin-top: 12cqw; }
.ps-arcs { position: absolute; left: 0; top: 0; width: 100%; height: auto; overflow: visible; pointer-events: none; }
.ps-arrow svg { display: none; }

@media (max-width: 720px) {
  .ps-wrap { padding: 84px 16px 80px; }
  .ps-hero { grid-template-columns: 1fr; gap: 8px; margin-bottom: 56px; }
  .ps-mocks .ps-device { width: min(100%, 380px); }
  .ps-p, .ps-li { font-size: 16.5px; }
  .ps-sec, .ps-grad { margin-bottom: 64px; }
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

function Heading({ s }: { s: Section }) {
  const [num, ...rest] = s.title.split('. ')
  return (
    <>
      <p className="ps-num">{num}</p>
      <h2 className="ps-h2">{rest.join('. ')}</h2>
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

const ARROW = { fill: 'none', stroke: MAROON, strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const

// The journey's arrows on wide screens, in the row's own units (1000 across; the phones' tops are at 0, 60 and 120): each
// leaves from beside the top of one phone, arcs over the gap and comes down onto the top of the next
function Arcs() {
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
            <div className="ps-glow" />
            <DeviceShot className="ps-device" src={group2167} alt="Picstory app screens" iw={774} ih={1002} crop={[0.011, 0.136, 0.89, 0.661]} />
          </div>
        </header>

        <section className="ps-grad">
          <div className="ps-col">
            <p className="ps-intro">{INTRO}</p>
            <Heading s={s1} />
            <Text blocks={s1.blocks} />
          </div>
        </section>

        <section className="ps-sec">
          <div className="ps-col">
            <Heading s={s2} />
            <Text blocks={s2.blocks} />
          </div>
          <div className="ps-frames">
            {[-4, 2, -2].map((r, i) => (
              <Frame key={i} rot={r} w={250}>
                <div className="ph" style={{ aspectRatio: '3 / 4' }}>Sketch {i + 1}</div>
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
          <div className="ps-col">
            <Heading s={s4} />
            <Text blocks={s4.blocks} />
          </div>
        </section>

        <section className="ps-sec">
          <div className="ps-col">
            <Heading s={s5} />
            <Text blocks={s5.blocks} />
          </div>
          <div className="ps-journey">
            <Arcs />
            <figure className="ps-step s1">
              <DeviceShot className="ps-device" src={mockup1} alt="Splash screen" iw={723} ih={995} crop={[0.012, 0.137, 0.527, 0.66]} />
            </figure>
            <Arrow className="a1" />
            <figure className="ps-step s2">
              <DeviceShot className="ps-device" src={mockup2} alt="Template gallery" iw={551} ih={1002} crop={[0.136, 0.137, 0.724, 0.66]} />
            </figure>
            <Arrow className="a2" />
            <figure className="ps-step s3">
              <DeviceShot className="ps-device" src={mockup3} alt="Editor" iw={676} ih={1188} crop={[0.332, 0.197, 0.505, 0.581]} />
            </figure>
          </div>
        </section>

        <section className="ps-sec">
          <div className="ps-col">
            <Heading s={s6} />
            <Text blocks={s6.blocks} />
          </div>
        </section>

        <section className="ps-grad" style={{ marginBottom: 0 }}>
          <div className="ps-col">
            <Heading s={s7} />
            <Text blocks={s7.blocks} />
          </div>
        </section>
      </div>
    </main>
  )
}
