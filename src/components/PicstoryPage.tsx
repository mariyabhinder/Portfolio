import { useEffect } from 'react'

const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif'

type Block = { t: 'h2' | 'sub' | 'p' | 'strong' | 'li'; text: string; lead?: string }

const INTRO = "Sometimes, the best ideas don't come from brainstorming sessions. They come from the simplest moments."

const SECTIONS: { title: string; sub?: string; blocks: Block[] }[] = [
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

export default function PicstoryPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main style={{ background: '#fff', color: '#222', fontFamily: FONT, minHeight: '100vh' }}>
      <article style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 96px', fontSize: 18, lineHeight: 1.75 }}>
        <a href="#/" style={{ color: '#555', fontSize: 15, textDecoration: 'none', fontWeight: 500 }}>
          ← Back
        </a>
        <h1 style={{ fontSize: 'clamp(30px, 5vw, 44px)', lineHeight: 1.15, fontWeight: 800, margin: '32px 0 16px', letterSpacing: '-0.02em' }}>
          A little birthday idea that turned into something bigger.
        </h1>
        <p style={{ fontStyle: 'italic', color: '#555', margin: '0 0 24px' }}>{INTRO}</p>

        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 style={{ fontSize: 'clamp(22px, 3.4vw, 28px)', lineHeight: 1.25, fontWeight: 700, margin: '56px 0 12px' }}>{s.title}</h2>
            {s.sub ? <p style={{ fontStyle: 'italic', color: '#555', margin: '0 0 16px' }}>{s.sub}</p> : null}
            {s.blocks.map((b, i) =>
              b.t === 'strong' ? (
                <p key={i} style={{ fontWeight: 700, margin: '0 0 18px' }}>{b.text}</p>
              ) : b.t === 'li' ? (
                <p key={i} style={{ margin: '0 0 18px' }}>
                  <strong>{b.lead}</strong>
                  <br />
                  {b.text}
                </p>
              ) : (
                <p key={i} style={{ margin: '0 0 18px' }}>{b.text}</p>
              ),
            )}
          </section>
        ))}
      </article>
    </main>
  )
}
