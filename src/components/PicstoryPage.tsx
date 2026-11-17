import { useEffect, type ReactNode } from 'react'
import mockup1 from '@/assets/meadow/mockup1.webp'
import mockup2 from '@/assets/meadow/mockup2.webp'
import mockup3 from '@/assets/meadow/mockup3.webp'
import para3 from '@/assets/meadow/para3.webp'
import para33 from '@/assets/meadow/para33.webp'
import paper from '@/assets/meadow/picstory-paper.png'

const MAROON = '#6E0D25'
const YELLOW = '#FFFFB3'
const BROWN = '#6A381F'
const GOLD = '#DCAB6B'
const CREAM = '#efe9dd'
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
.ps-paper { position: fixed; inset: 0; z-index: 0; background: ${CREAM} url(${paper}) center / cover no-repeat; }
.ps-wrap { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 32px 24px 120px; }
.ps-back { color: ${MAROON}; font-size: 15px; font-weight: 700; text-decoration: none; letter-spacing: .02em; }
.ps-hero { display: grid; grid-template-columns: 1fr 1.1fr; align-items: center; gap: 8px; margin: 12px 0 72px; }
.ps-title { font-family: ${BODY}; font-weight: 300; font-size: clamp(44px, 8vw, 84px); letter-spacing: .04em; line-height: 1; margin: 0; color: ${MAROON}; }
.ps-sub { font-size: clamp(18px, 2.6vw, 26px); line-height: 1.35; margin: 14px 0 0; max-width: 11em; color: ${BROWN}; }
.ps-mocks { position: relative; aspect-ratio: 1 / 1.05; }
.ps-mocks img { position: absolute; height: auto; filter: drop-shadow(0 18px 24px rgba(60,10,25,.18)); }
.ps-grad { position: relative; border-radius: 28px; padding: clamp(32px, 6vw, 72px); margin: 0 0 88px; color: ${YELLOW};
  background: radial-gradient(ellipse 70% 80% at 50% 50%, #1d1517 0%, #3d0f1b 35%, ${MAROON} 80%); box-shadow: 0 30px 60px -28px rgba(80,10,30,.55); overflow: hidden; }
.ps-grad::after { content: ''; position: absolute; inset: 10px; border: 1px solid rgba(255,255,179,.28); border-radius: 20px; pointer-events: none; }
.ps-sec { margin: 0 0 96px; }
.ps-num { font-family: ${BODY}; font-weight: 300; font-size: 15px; letter-spacing: .3em; color: ${GOLD}; margin: 0 0 10px; }
.ps-h2 { font-family: ${SERIF}; font-weight: 700; font-size: clamp(24px, 3.8vw, 36px); line-height: 1.25; margin: 0 0 14px; }
.ps-subline { font-family: ${SERIF}; font-style: italic; font-size: 17px; line-height: 1.6; margin: 0 0 22px; opacity: .85; }
.ps-p { font-size: 18px; line-height: 1.85; margin: 0 0 18px; max-width: 700px; }
.ps-strong { font-family: ${SERIF}; font-weight: 700; font-size: 20px; line-height: 1.6; margin: 26px 0; max-width: 700px; padding-left: 18px; border-left: 3px solid ${GOLD}; }
.ps-li { margin: 0 0 18px; max-width: 700px; padding-left: 18px; border-left: 2px solid ${GOLD}; line-height: 1.75; font-size: 17px; }
.ps-li b { font-family: ${SERIF}; display: block; margin-bottom: 2px; }
.ps-frames { display: flex; flex-wrap: wrap; justify-content: center; gap: 36px; margin: 52px 0 0; }
.ps-frame { position: relative; background: #fffdf6; padding: 14px 14px 44px; box-shadow: 0 14px 30px -10px rgba(70,35,20,.35), 0 2px 4px rgba(70,35,20,.15); transition: transform .35s ease; }
.ps-frame:hover { transform: rotate(0deg) scale(1.03) !important; }
.ps-frame::before { content: ''; position: absolute; top: -13px; left: 50%; width: 84px; height: 26px; transform: translateX(-50%) rotate(-3deg); background: rgba(220,171,107,.75); }
.ps-frame .ph { display: flex; align-items: center; justify-content: center; background: repeating-linear-gradient(45deg, #f3e7d3, #f3e7d3 10px, #efdfc6 10px, #efdfc6 20px); border: 2px dashed ${GOLD}; color: ${BROWN}; font-size: 13px; letter-spacing: .15em; text-transform: uppercase; }
.ps-frame img { display: block; max-width: 100%; height: auto; }
.ps-journey { position: relative; width: 100%; max-width: 900px; margin: 56px auto 0; aspect-ratio: 1 / 1.22; }
.ps-journey img { position: absolute; height: auto; filter: drop-shadow(0 18px 24px rgba(60,10,25,.2)); }
.ps-journey svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
@media (max-width: 720px) {
  .ps-hero { grid-template-columns: 1fr; text-align: left; margin-bottom: 40px; }
  .ps-wrap { padding: 24px 16px 80px; }
  .ps-p, .ps-li { font-size: 16.5px; }
  .ps-sec, .ps-grad { margin-bottom: 64px; }
  .ps-frames { gap: 28px; }
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

function Arrow({ d, head }: { d: string; head: string }) {
  const p = { fill: 'none', stroke: MAROON, strokeWidth: 3.5, strokeLinecap: 'round', strokeLinejoin: 'round', vectorEffect: 'non-scaling-stroke' } as const
  return (
    <>
      <path d={d} {...p} />
      <path d={head} {...p} />
    </>
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
      <div className="ps-wrap">
        <a href="#/" className="ps-back">← Back</a>

        <header className="ps-hero">
          <div>
            <h1 className="ps-title">PICSTORY</h1>
            <p className="ps-sub">Create your perfect visual story</p>
          </div>
          <div className="ps-mocks">
            <img src={mockup1} alt="Picstory splash screen" style={{ width: '58%', left: '-4%', top: '2%', transform: 'rotate(-2deg)' }} />
            <img src={mockup2} alt="Picstory template gallery" style={{ width: '60%', right: '-8%', top: '-2%' }} />
          </div>
        </header>

        <section className="ps-grad">
          <p style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, opacity: 0.8, margin: '0 0 28px' }}>{INTRO}</p>
          <Heading s={s1} />
          <Text blocks={s1.blocks} />
        </section>

        <section className="ps-sec">
          <Heading s={s2} />
          <Text blocks={s2.blocks} />
          <div className="ps-frames">
            {[-4, 2, -2].map((r, i) => (
              <Frame key={i} rot={r} w={250}>
                <div className="ph" style={{ aspectRatio: '3 / 4' }}>Sketch {i + 1}</div>
              </Frame>
            ))}
          </div>
        </section>

        <section className="ps-sec">
          <Heading s={s3} />
          <Text blocks={s3.blocks} />
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
          <Heading s={s4} />
          <Text blocks={s4.blocks} />
        </section>

        <section className="ps-sec">
          <Heading s={s5} />
          <Text blocks={s5.blocks} />
          <div className="ps-journey">
            <img src={mockup1} alt="Splash screen" style={{ width: '48%', left: '-6%', top: '-2%' }} />
            <img src={mockup2} alt="Template gallery" style={{ width: '50%', left: '26%', top: '17%' }} />
            <img src={mockup3} alt="Editor" style={{ width: '50%', right: '-8%', top: '36%' }} />
            <svg viewBox="0 0 100 122" preserveAspectRatio="none" aria-hidden="true">
              <Arrow d="M 22 5 C 36 -3, 52 2, 50 20" head="M 45 15 L 50 21 L 54 14" />
              <Arrow d="M 62 38 C 78 30, 94 40, 88 56" head="M 83 51 L 88 57 L 92 50" />
            </svg>
          </div>
        </section>

        <section className="ps-sec">
          <Heading s={s6} />
          <Text blocks={s6.blocks} />
        </section>

        <section className="ps-grad" style={{ marginBottom: 0 }}>
          <Heading s={s7} />
          <Text blocks={s7.blocks} />
        </section>
      </div>
    </main>
  )
}
