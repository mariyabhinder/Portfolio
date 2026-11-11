import { useEffect, type ReactNode } from 'react'

const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif'

type Block = { t: 'p' | 'q'; text: string }

const TITLE = 'Nudge: A journey from overthinking to finding your way'

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

export default function NudgePage() {
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
          {TITLE}
        </h1>

        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 style={{ fontSize: 'clamp(22px, 3.4vw, 28px)', lineHeight: 1.25, fontWeight: 700, margin: '56px 0 12px' }}>{s.title}</h2>
            {s.blocks.map((b, i) =>
              b.t === 'q' ? (
                <p key={i} style={{ fontStyle: 'italic', color: '#555', margin: '0 0 12px', paddingLeft: 16, borderLeft: '3px solid #14b8a6' }}>{b.text}</p>
              ) : (
                <p key={i} style={{ margin: '0 0 18px' }}>{rich(b.text)}</p>
              ),
            )}
          </section>
        ))}
      </article>
    </main>
  )
}
