import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import cc1 from '@/assets/meadow/cc1.webp'
import cc2 from '@/assets/meadow/cc2.webp'
import cc3 from '@/assets/meadow/cc3.webp'
import ls1 from '@/assets/meadow/ls1.webp'
import ls2 from '@/assets/meadow/ls2.webp'
import ls3 from '@/assets/meadow/ls3.webp'
import ls4 from '@/assets/meadow/ls4.webp'
import ls5 from '@/assets/meadow/ls5.webp'
import udp1 from '@/assets/meadow/udp1.webp'
import udp2 from '@/assets/meadow/udp2.webp'
import udp3 from '@/assets/meadow/udp3.webp'
import udp4 from '@/assets/meadow/udp4.webp'
import udp5 from '@/assets/meadow/udp5.webp'
import udp6 from '@/assets/meadow/udp6.webp'
import udp7 from '@/assets/meadow/udp7.webp'
import udp8 from '@/assets/meadow/udp8.webp'
import udp9 from '@/assets/meadow/udp9.webp'
import udp10 from '@/assets/meadow/udp10.webp'
import udp11 from '@/assets/meadow/udp11.webp'
import udp12 from '@/assets/meadow/udp12.webp'
import udp13 from '@/assets/meadow/udp13.webp'
import udp14 from '@/assets/meadow/udp14.webp'
import udp17 from '@/assets/meadow/udp17.webp'
import udp15 from '@/assets/meadow/udp15.webp'
import udp16 from '@/assets/meadow/udp16.webp'
import wallpaper from '@/assets/meadow/phone-wallpaper.webp'
import { HANGING_CHARM, NAME_CHARM, paintHangingCharm, paintNameCharm } from '@/components/meadow/props'

// The phone's Photos app, opened by clicking her phone in the hero: an Albums screen, and an album screen once one is picked.
// Each photo is a plain colour for now: put the real pictures in `photos` (any image url) and they replace the colours.
interface Album {
  id: string
  name: string
  color: string
  /** image urls shown in the album; empty = placeholder colours */
  photos: string[]
  /** optional caption under each photo in the viewer (same order as `photos`): a bold place line and a line of text */
  captions?: ([string, string] | undefined)[]
  /** small versions of `photos` (same order) for the grid and the scrubber strip */
  thumbs: string[]
  /** how many placeholder tiles to show while there are no photos */
  count: number
}

// the thumbnails (assets/meadow/thumbs: each photo at 480 px on its short side) are named like the photos: udp1.webp, cc2.webp...
const THUMBS = import.meta.glob<string>('../assets/meadow/thumbs/*.webp', { eager: true, import: 'default' })
const thumbs = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => THUMBS[`../assets/meadow/thumbs/${prefix}${i + 1}.webp`])

const UDAIPUR_CAPTIONS: [string, string][] = [
  ['Lake Pichola, Udaipur', 'A little blue poetry, written one wave at a time.'], // udp1
  ['Jawai, Udaipur', 'A million little stars, and not one of them out of place.'], // udp2
  ['City Palace, Udaipur', "If these walls could talk, they'd have a thousand royal tales to tell."], // udp3
  ['Lake Pichola, Udaipur', 'A city that decided to wear its own constellation.'], // udp4
  ['Lake Pichola, Udaipur', 'The sun clocking out, Udaipur stealing the spotlight.'], // udp5
  ['City Palace, Udaipur', 'Centuries of artistry, hiding in every little detail.'], // udp6
]

const ALBUMS: Album[] = [
  {
    id: 'udaipur', name: 'Udaipur ☀️🥂👒', color: '#f4a6b8',
    photos: [udp1, udp2, udp3, udp4, udp5, udp6, udp7, udp8, udp9, udp10, udp11, udp12, udp13, udp14, udp15, udp16, udp17],
    captions: [
      ...UDAIPUR_CAPTIONS, undefined, undefined, undefined, // udp7-9 have no caption yet
      ['Jawai, Udaipur', 'Where the wild has a home, and humans are just visitors.'], // udp10
      ['Lake Pichola, Udaipur', 'Some cities have roads. This one has reflections.'], // udp11
      ['Paradise Lake, Udaipur', 'Somewhere between the sky and the water, time forgot to move.'], // udp12
      ['Jagdish Mishtan Bhandar, Udaipur', "Calories don't count when they're part of the itinerary. Ghevar and kachori chaat, please!"], // udp13
      ['Old City, Udaipur', 'Took a wrong turn, found a hundred stories.'], // udp14
      ['Jawai, Udaipur', 'The hills have eyes, and one of them is beautifully spotted.'], // udp15
      undefined, // udp16
      ['Jawai, Udaipur', 'A little game of hide-and-seek. Can you spot who\'s watching?'], // udp17
    ],
    thumbs: thumbs('udp', 17), count: 30,
  },
  { id: 'colorful', name: 'Colorful Corner 🎨', color: '#a8d8f0', photos: [cc1, cc2, cc3], thumbs: thumbs('cc', 3), count: 16 },
  { id: 'stitches', name: 'Little Stitches 🧵🌸', color: '#f3e08a', photos: [ls1, ls2, ls3, ls4, ls5], thumbs: thumbs('ls', 5), count: 34 },
]

const PALETTE = ['#f4a6b8', '#a8d8f0', '#f3e08a', '#b9a6e8', '#9fdcb4', '#f7b88a', '#8fc7e8', '#e8a0d0']
const tileColor = (album: Album, i: number) => PALETTE[(i + ALBUMS.indexOf(album) * 3) % PALETTE.length]
const countOf = (a: Album) => (a.photos.length || a.count)

// Photos decoded ahead of time, so the viewer's <img> of the same url shows at once when a swipe reaches it (kept here, so the
// browser holds on to them)
const decoded = new Map<string, HTMLImageElement>()
function predecode(src: string) {
  if (decoded.has(src)) return
  const img = new Image()
  img.decoding = 'async'
  img.src = src
  decoded.set(src, img)
  img.decode().catch(() => decoded.delete(src))
}

const Tile = memo(function Tile({ album, i, heart }: { album: Album; i: number; heart?: boolean }) {
  const src = album.thumbs[i] ?? album.photos[i]
  return (
    <div className="relative w-full h-full" style={{ background: src ? undefined : tileColor(album, i) }}>
      {src ? <img alt="" src={src} className="w-full h-full object-cover" draggable={false} loading="lazy" decoding="async" /> : null}
      {heart ? (
        <svg className="absolute left-1.5 bottom-1.5" width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2 0 3.5 1.1 5.3 3 1.8-1.9 3.3-3 5.3-3 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" />
        </svg>
      ) : null}
    </div>
  )
})

// SF Symbols-style line icons, drawn in the current text colour
const Sym = ({ d, size = 22, fill }: { d: string; size?: number; fill?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)
const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2 0 3.5 1.1 5.3 3 1.8-1.9 3.3-3 5.3-3 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z'
const ICON = {
  plus: 'M12 5v14M5 12h14',
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 5l7 7-7 7',
  share: 'M12 3v12M8 7l4-4 4 4M8 10H6a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1v-9a1 1 0 00-1-1h-2',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.01',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12v9H6z',
  library: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM4 16l5-5 5 5 2-2 4 4',
  forYou: 'M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1zM12 16s-4-2.4-4-5.2a2 2 0 014-.6 2 2 0 014 .6C16 13.6 12 16 12 16z',
  albums: 'M8 3h11a2 2 0 012 2v11M4 7h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  video: 'M3 7h12v10H3zM15 10l6-3v10l-6-3',
  selfie: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  live: 'M12 15a3 3 0 100-6 3 3 0 000 6zM12 20a8 8 0 100-16 8 8 0 000 16z',
  portrait: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  pano: 'M3 6c6 2 12 2 18 0v12c-6-2-12-2-18 0z',
  screenshot: 'M8 3h8a1 1 0 011 1v16a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1zM10 6h4',
  imports: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  duplicates: 'M9 9h11v11H9zM5 15H4V4h11v1',
  hidden: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6zM4 4l16 16',
}
const BLUE = '#0a84ff'

// the rows under My Albums: [name, icon, count], a padlock when the count is null
const MEDIA_TYPES: [string, string, number | null][] = [['Videos', ICON.video, 23], ['Selfies', ICON.selfie, 41], ['Live Photos', ICON.live, 312], ['Portrait', ICON.portrait, 57], ['Panoramas', ICON.pano, 4], ['Screenshots', ICON.screenshot, 186]]
const UTILITIES: [string, string, number | null][] = [['Imports', ICON.imports, 18], ['Duplicates', ICON.duplicates, 6], ['Hidden', ICON.hidden, null], ['Recently Deleted', ICON.trash, null]]

function ListSection({ title, rows }: { title: string; rows: [string, string, number | null][] }) {
  return (
    <>
      <div className="mx-4 mt-5 border-t border-neutral-200" />
      <h2 className="px-4 pb-1 pt-3 text-[20px] font-bold text-black">{title}</h2>
      {rows.map(([name, d, n], i) => (
        <div key={name} className="flex items-center gap-3 pl-4">
          <span style={{ color: BLUE }}><Sym d={d} /></span>
          <div className={`flex flex-1 items-center gap-1 py-2.5 pr-3 ${i ? 'border-t border-neutral-200' : ''}`}>
            <span className="flex-1 text-[17px]" style={{ color: BLUE }}>{name}</span>
            <span className="text-[17px] text-neutral-400">{n ?? <Sym d={ICON.lock} size={15} />}</span>
            <span className="text-neutral-300"><Sym d={ICON.chevron} size={15} /></span>
          </div>
        </div>
      ))}
    </>
  )
}

// (the screens are memo'd: a swipe in the viewer changes the index up in PhoneGallery, and the album grid under the viewer,
// a few dozen thumbnails, has nothing to redo for it)
const AlbumsScreen = memo(function AlbumsScreen({ onOpen }: { onOpen: (a: Album) => void }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-white pb-24" style={{ scrollbarWidth: 'none' }}>
      <div className="px-3 pt-1" style={{ color: BLUE }}><Sym d={ICON.plus} size={24} /></div>
      <h1 className="px-4 pt-1 text-[32px] font-bold leading-tight text-black">Albums</h1>
      <div className="mx-4 mt-2 border-t border-neutral-200" />
      <div className="flex items-baseline justify-between px-4 pt-3">
        <h2 className="text-[20px] font-bold text-black">My Albums</h2>
        <span className="text-[17px]" style={{ color: BLUE }}>See All</span>
      </div>
      <div className="grid snap-x grid-flow-col grid-rows-2 gap-x-3 gap-y-3 overflow-x-auto px-4 pt-2" style={{ gridAutoColumns: '46%', scrollbarWidth: 'none' }}>
        {ALBUMS.map((a) => (
          <button key={a.id} onClick={() => onOpen(a)} className="snap-start text-left cursor-pointer">
            <div className="aspect-square overflow-hidden rounded-lg">
              <Tile album={a} i={0} />
            </div>
            <div className="truncate pt-1 text-[15px] leading-tight text-black">{a.name || 'Untitled'}</div>
            <div className="text-[15px] leading-tight text-neutral-400">{countOf(a)}</div>
          </button>
        ))}
      </div>
      <ListSection title="Media Types" rows={MEDIA_TYPES} />
      <ListSection title="Utilities" rows={UTILITIES} />
    </div>
  )
})

const AlbumScreen = memo(function AlbumScreen({ album, onBack, onView }: { album: Album; onBack: () => void; onView: (i: number) => void }) {
  const n = countOf(album)
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-white pb-24" style={{ scrollbarWidth: 'none' }}>
      <div className="sticky top-0 z-10 flex items-center justify-between bg-white/85 py-1 pl-1 pr-3 backdrop-blur-xl">
        <button onClick={onBack} className="flex items-center text-[17px] cursor-pointer" style={{ color: BLUE }}><Sym d={ICON.back} size={26} />Albums</button>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[15px] font-semibold" style={{ color: BLUE }}>Select</span>
      </div>
      <h1 className="truncate px-4 pb-2 text-[30px] font-bold leading-tight text-black">{album.name || 'Untitled'}</h1>
      <div className="grid grid-cols-3 gap-[1.5px]">
        {Array.from({ length: n }, (_, i) => (
          <div key={i} className="aspect-square cursor-pointer" onClick={() => onView(i)}>
            <Tile album={album} i={i} />
          </div>
        ))}
      </div>
      <p className="py-4 text-center text-[15px] font-semibold text-black">{n} Photos</p>
    </div>
  )
})

// a photo opened from an album, as in iOS Photos: back / date / Edit on top, the photo, the scrubber strip and share, like,
// info and delete below. Swipe (or the arrows, or the strip) for the neighbouring photos; a tap hides the chrome on black.
// A drag of `dist` of the width, or a flick faster than `speed` (px/ms), moves on to the next photo; `ease` is the glide there.
const SWIPE = { dist: 0.2, speed: 0.4, ease: 'cubic-bezier(.25,.8,.3,1)' }
// the photos kept on the track either side of the current one: all a drag, or a glide caught by another swipe, can show
const AROUND = 2

// one photo on the viewer's track, at its own place along it (photo i at i stage widths, --sw), so it stays put as the index changes
const Slide = memo(function Slide({ album, i, current, immersive }: { album: Album; i: number; current: boolean; immersive: boolean }) {
  const src = album.photos[i], caption = album.captions?.[i]
  return (
    <div className="absolute inset-y-0 flex w-full flex-col justify-center" style={{ left: `calc(${i} * var(--sw))` }}>
      {src ? (
        <img alt="" src={src} className={`pointer-events-none min-h-0 w-full ${caption ? 'h-auto max-h-full object-cover' : 'h-full object-contain'}`} draggable={false} decoding="async" fetchPriority={current ? 'high' : 'low'} />
      ) : (
        <div className="h-full w-full" style={{ background: tileColor(album, i) }} />
      )}
      {caption ? (
        <div className="shrink-0 px-8 pb-5 pt-7 text-center">
          <div className={`text-[14px] font-semibold leading-tight tracking-tight transition-colors duration-200 ${immersive ? 'text-white' : 'text-black'}`}>{caption[0]}</div>
          <div className={`mx-auto mt-2 max-w-[17rem] text-[10px] font-normal leading-snug transition-colors duration-200 ${immersive ? 'text-neutral-400' : 'text-neutral-500'}`}>{caption[1]}</div>
        </div>
      ) : null}
    </div>
  )
})

interface Drag {
  id: number
  /** where the pointer went down, and where the track was then (px) */
  x0: number
  from: number
  /** where the track is now (px) */
  x: number
  /** the stage's width (px), read once per drag */
  w: number
  /** it went down on a glide, and stopped it */
  caught: boolean
  /** the last few pointer positions, [time, x], for its speed at release */
  trail: [number, number][]
}

function PhotoViewer({ album, index, onIndex, onClose, immersive, onImmersive }: {
  album: Album; index: number; onIndex: (i: number) => void; onClose: () => void; immersive: boolean; onImmersive: (on: boolean) => void
}) {
  const n = countOf(album)
  const strip = useRef<HTMLDivElement>(null)
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const key = `${album.id}/${index}`
  const go = (i: number) => onIndex(Math.max(0, Math.min(n - 1, i)))

  // decode the photos either side ahead, so a swipe finds them ready
  useEffect(() => {
    for (let k = 1; k <= AROUND; k++) {
      for (const i of [index + k, index - k]) {
        const src = album.photos[i]
        if (src) predecode(src)
      }
    }
  }, [album, index])

  // keep the current photo centred in the scrubber strip
  useEffect(() => {
    const s = strip.current, t = s?.children[index] as HTMLElement | undefined
    if (s && t) s.scrollTo({ left: t.offsetLeft - s.clientWidth / 2 + t.offsetWidth / 2, behavior: 'smooth' })
  }, [index])

  // The photos sit side by side on a track that rests at -index widths. A drag moves the track straight from the pointer events,
  // with no re-render; the release glides it to a photo on the compositor (an animation of its transform), and the index changes
  // as the glide sets off, so React's update (the strip, the next photo along) runs while it glides instead of holding it up.
  // A touch during a glide catches the track where it is, so a swipe never has to wait for the last one to finish.
  const stage = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  // the photo the track rests on, or is gliding to
  const at = useRef(-1)
  const glide = useRef<Animation | null>(null)
  const drag = useRef<Drag | null>(null)
  // The stage's exact width (px, with its fraction), also kept in --sw on the track: the photos are placed along the track, and
  // it is moved, in whole multiples of this one length. (In percentages, the browser rounds the width differently for the
  // track's move than for the photos' places, and a few pixels of the next photo showed at the edge, more the further along.)
  const sw = useRef(0)
  const width = () => sw.current || stage.current?.offsetWidth || 1
  useLayoutEffect(() => {
    const el = stage.current!, t = track.current!
    const measure = (w: number) => {
      sw.current = w
      t.style.setProperty('--sw', `${w}px`)
    }
    // (a first guess, put right by the observer's first report, which comes before the first paint)
    measure(el.offsetWidth)
    const ro = new ResizeObserver(([entry]) => measure(entry.contentRect.width))
    ro.observe(el)
    return () => {
      ro.disconnect()
      // closed mid-glide: the glide goes with it
      glide.current?.cancel()
      glide.current = null
    }
  }, [])
  const place = (x: number) => { if (track.current) track.current.style.transform = `translate3d(${x}px, 0, 0)` }
  // at rest it is placed in stage widths, so it stays on its photo if the screen is resized
  const rest = (i: number) => { if (track.current) track.current.style.transform = `translate3d(calc(${-i} * var(--sw)), 0, 0)` }
  // where the track is now (px), stopping any glide there
  const stop = () => {
    const g = glide.current
    if (!g) return -at.current * width()
    const x = new DOMMatrixReadOnly(getComputedStyle(track.current!).transform).m41
    glide.current = null
    g.cancel()
    place(x)
    return x
  }
  const glideTo = (i: number, from: number) => {
    const w = width(), to = -i * w, way = Math.abs(to - from)
    at.current = i
    if (way < 1) return rest(i)
    place(to)
    const g = track.current!.animate([{ transform: `translate3d(${from}px, 0, 0)` }, { transform: `translate3d(${to}px, 0, 0)` }], {
      duration: Math.round(180 + 160 * Math.min(1, way / w)),
      easing: SWIPE.ease,
    })
    glide.current = g
    g.onfinish = () => {
      if (glide.current !== g) return
      glide.current = null
      rest(i)
    }
  }

  // a new index from the strip, the arrows or the keys: the next photo along glides in, one further away is shown at once
  useLayoutEffect(() => {
    if (at.current === index) return
    const was = at.current
    drag.current = null
    const from = stop()
    if (was >= 0 && Math.abs(index - was) === 1) glideTo(index, from)
    else {
      at.current = index
      rest(index)
    }
  }, [index])

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const caught = glide.current !== null
    const x = stop()
    drag.current = { id: e.pointerId, x0: e.clientX, from: x, x, w: width(), caught, trail: [[e.timeStamp, e.clientX]] }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    // it follows the finger as far as the photos either side; past those (and past the first and last photo) it gives, a third as far
    const i = at.current
    const lo = -Math.min(n - 1, i + 1) * d.w, hi = -Math.max(0, i - 1) * d.w
    let x = d.from + e.clientX - d.x0
    if (x > hi) x = hi + (x - hi) / 3
    else if (x < lo) x = lo + (x - lo) / 3
    d.x = x
    d.trail.push([e.timeStamp, e.clientX])
    if (d.trail.length > 8) d.trail.shift()
    place(x)
  }
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    const i = at.current
    // taken over by the browser (a phone turning the touch into a scroll of the page): back to its photo. (A cancel carries no
    // usable position, so it must not be read as the end of a swipe.)
    if (e.type === 'pointercancel') return glideTo(i, d.x)
    // a tap shows or hides the chrome (a tap that caught a glide just lets it carry on)
    if (Math.abs(e.clientX - d.x0) < 6) {
      glideTo(i, d.x)
      if (!d.caught) onImmersive(!immersive)
      return
    }
    // its speed over the last 100 ms of the drag (px/ms)
    d.trail.push([e.timeStamp, e.clientX])
    const recent = d.trail.filter(([t]) => e.timeStamp - t <= 100)
    const [ta, xa] = recent[0], [tb, xb] = recent[recent.length - 1]
    const v = tb > ta ? (xb - xa) / (tb - ta) : 0
    // where the track is, and where the drag began, in photos: a flick goes on to the next photo its way, a drag of `dist` to the
    // next one from where it began, and anything less back to the nearest; never more than one on, nor past either end
    const pos = -d.x / d.w, from = -d.from / d.w
    let to = Math.round(pos)
    if (v < -SWIPE.speed) to = Math.floor(pos) + 1
    else if (v > SWIPE.speed) to = Math.ceil(pos) - 1
    else if (pos - from > SWIPE.dist) to = Math.floor(from) + 1
    else if (from - pos > SWIPE.dist) to = Math.ceil(from) - 1
    to = Math.max(0, i - 1, Math.min(n - 1, i + 1, to))
    glideTo(to, d.x)
    if (to !== index) onIndex(to)
  }

  const chrome = `transition-opacity duration-200 ${immersive ? 'pointer-events-none opacity-0' : ''}`
  const arrow = 'absolute top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur cursor-pointer group-hover:flex'
  return (
    <div className={`absolute inset-0 z-20 flex flex-col transition-colors duration-200 ${immersive ? 'bg-black' : 'bg-white'}`} style={{ paddingTop: u(STATUS) }} onClick={(e) => e.stopPropagation()}>
      <div className={`flex items-center pb-1 pl-1 pr-3 ${chrome}`}>
        <button onClick={onClose} aria-label="Back" className="w-16 cursor-pointer" style={{ color: BLUE }}><Sym d={ICON.back} size={26} /></button>
        <div className="flex-1 text-center leading-tight text-black">
          <div className="text-[15px] font-semibold">18 October</div>
          <div className="text-[12px] text-neutral-500">20:21</div>
        </div>
        <span className="w-16 text-right text-[17px]" style={{ color: BLUE }}>Edit</span>
      </div>

      <div ref={stage} className="group relative min-h-0 flex-1 touch-pan-y select-none overflow-hidden" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {/* its transform is set from the gestures (see `place`, `rest` and `glideTo`), never by React */}
        <div ref={track} className="absolute inset-0 will-change-transform">
          {Array.from({ length: Math.min(n - 1, index + AROUND) - Math.max(0, index - AROUND) + 1 }, (_, k) => {
            const i = Math.max(0, index - AROUND) + k
            return <Slide key={i} album={album} i={i} current={i === index} immersive={immersive} />
          })}
        </div>
        {index > 0 ? <button onPointerDown={(e) => e.stopPropagation()} onClick={() => go(index - 1)} aria-label="Previous photo" className={`${arrow} left-2`}><Sym d={ICON.back} size={18} /></button> : null}
        {index < n - 1 ? <button onPointerDown={(e) => e.stopPropagation()} onClick={() => go(index + 1)} aria-label="Next photo" className={`${arrow} right-2`}><Sym d={ICON.chevron} size={18} /></button> : null}
      </div>

      <div className={chrome}>
        <div ref={strip} className="flex items-center gap-[2px] overflow-x-auto px-[50%] py-2" style={{ scrollbarWidth: 'none' }}>
          {Array.from({ length: n }, (_, i) => (
            <button key={i} onClick={() => go(i)} aria-label={`Photo ${i + 1}`} className={`h-10 shrink-0 cursor-pointer overflow-hidden transition-[width,margin] duration-200 ${i === index ? 'mx-1 w-10' : 'w-6'}`}>
              <Tile album={album} i={i} />
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between px-5 pb-7 pt-1" style={{ color: BLUE }}>
          <Sym d={ICON.share} size={24} />
          <button onClick={() => setLiked({ ...liked, [key]: !liked[key] })} aria-label="Favourite" className="cursor-pointer"><Sym d={HEART} size={24} fill={liked[key]} /></button>
          <Sym d={ICON.info} size={24} />
          <Sym d={ICON.trash} size={24} />
        </div>
      </div>
    </div>
  )
}

// ---------- the iPhone itself, drawn from the gold mockup SVG (its frame spans x 639..2439, y 120..3750; 1800 units = --w) ----------
const u = (n: number) => `calc(var(--w) * ${n / 1800})`
// the display: the mockup's black glass (x 684, y 148) less a thin black bezel all round
const BEZEL = 34
const SCREEN = { x: 45.2 + BEZEL, y: 27.7 + BEZEL, w: 1709.3 - 2 * BEZEL, h: 3574.4 - 2 * BEZEL, r: 260.8 - BEZEL }
// room at the top of the display for the status bar beside the Dynamic Island
const STATUS = 230

const BUTTON_EDGE = [['0', '#6D6750'], ['0.02', '#CCC299'], ['0.04', '#746F58'], ['0.08', '#2E2D1F'], ['0.11', '#8F886C'], ['0.9', '#65604E'], ['0.94', '#2E2D1F'], ['0.96', '#746F58'], ['0.98', '#A39A75'], ['1', '#64604F']]
const BUTTON_FACE = [['0', '#67675F'], ['0.06', '#545040'], ['0.19', '#B0AC9C'], ['0.81', '#B0AC9C'], ['0.92', '#545040'], ['1', '#67675F']]
const BUTTON_SIDE = [['0', '#6D6750'], ['0.05', '#2E2D1F'], ['0.52', '#746F58'], ['0.96', '#2E2D1F'], ['1', '#64604F']]
const stops = (list: string[][]) => list.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)

// one side button: its metal edge, rounded face and (on the left) the strip where it meets the frame
function SideButton({ id, y0, y1, left }: { id: string; y0: number; y1: number; left: boolean }) {
  const [edge, face, side] = [`${id}e`, `${id}f`, `${id}s`]
  const h = y1 - y0
  return (
    <>
      <defs>
        <linearGradient id={edge} x1="0" y1={y0} x2="0" y2={y1} gradientUnits="userSpaceOnUse">{stops(BUTTON_EDGE)}</linearGradient>
        <linearGradient id={face} x1="0" y1={y0} x2="0" y2={y1} gradientUnits="userSpaceOnUse">{stops(BUTTON_FACE)}</linearGradient>
        <linearGradient id={side} x1="0" y1={y1} x2="12" y2={y0} gradientUnits="userSpaceOnUse">{stops(BUTTON_SIDE)}</linearGradient>
      </defs>
      {left ? (
        <>
          <rect x="641.96" y={y0} width="5.91" height={h} fill={`url(#${edge})`} />
          <path d={`M641.96 ${y1}V${y0}L639 ${y0 + 3.6}C640.5 ${y0 + h * 0.1} 640.4 ${y1 - h * 0.1} 639 ${y1 - 3.6}Z`} fill={`url(#${face})`} />
          <rect x="647.87" y={y0} width="6.34" height={h} fill={`url(#${side})`} />
        </>
      ) : (
        <>
          <rect x="2423.45" y={y0} width="10.4" height={h} fill={`url(#${edge})`} />
          <path d={`M2433.84 ${y1}V${y0}L2439 ${y0 + 5.7}C2436.4 ${y0 + h * 0.12} 2436.5 ${y1 - h * 0.12} 2439 ${y1 - 5.7}Z`} fill={`url(#${face})`} />
        </>
      )}
    </>
  )
}

// the gold body, its groove, the black glass and the side buttons, under the display
const FrameBody = memo(function FrameBody() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="639 120 1800 3629.83" fill="none" aria-hidden>
      <path d="M2139.82 120L937.844 120C781.196 120 654.207 246.989 654.207 403.637L654.207 3466.19C654.207 3622.84 781.196 3749.83 937.844 3749.83L2139.82 3749.83C2296.46 3749.83 2423.45 3622.84 2423.45 3466.19L2423.45 403.637C2423.45 246.989 2296.46 120 2139.82 120Z" fill="#E0D0AF" />
      <path style={{ mixBlendMode: 'overlay' }} fill="black" fillOpacity="0.6" d="M2137.62 128.449L940.041 128.449C786.858 128.449 662.656 252.651 662.656 405.834L662.656 3463.910C662.656 3617.09 786.858 3741.29 940.041 3741.29L2137.62 3741.29C2290.8 3741.29 2415 3617.09 2415 3463.91L2415 405.834C2415 252.651 2290.8 128.449 2137.62 128.449ZM2406.55 3461.71C2406.55 3611.51 2285.14 3732.93 2135.34 3732.93L942.322 3732.93C792.519 3732.93 671.105 3611.51 671.105 3461.71L671.105 408.115C671.105 258.312 792.519 136.898 942.322 136.898L2135.42 136.898C2285.22 136.898 2406.64 258.312 2406.64 408.115L2406.64 3461.79L2406.55 3461.71Z" />
      <path d="M2132.72 147.713L945.027 147.713C800.978 147.713 684.203 264.488 684.203 408.537L684.203 3461.29C684.203 3605.34 800.978 3722.11 945.027 3722.11L2132.72 3722.11C2276.77 3722.11 2393.54 3605.34 2393.54 3461.29L2393.54 408.537C2393.54 264.488 2276.770 147.713 2132.72 147.713Z" fill="#1D1D1B" />
      <SideButton id="pbPower" y0={1047.37} y1={1484.87} left={false} />
      <SideButton id="pbAction" y0={693.53} y1={835.81} left />
      <SideButton id="pbVolUp" y0={955.36} y1={1232.5} left />
      <SideButton id="pbVolDown" y0={1303.98} y1={1581.11} left />
    </svg>
  )
})

// the Dynamic Island and its camera, drawn over the display
const DynamicIsland = memo(function DynamicIsland() {
  return (
    <svg className="pointer-events-none absolute inset-0 z-40 h-full w-full" viewBox="639 120 1800 3629.83" fill="none" aria-hidden>
      <defs>
        <linearGradient id="pbCam1" x1="1656.53" y1="339.93" x2="1656.53" y2="290.418" gradientUnits="userSpaceOnUse"><stop stopColor="#666666" /><stop offset="1" stopColor="#010104" /></linearGradient>
        <linearGradient id="pbCam2" x1="1656.62" y1="302.923" x2="1656.62" y2="331.227" gradientUnits="userSpaceOnUse"><stop stopColor="#0B131C" /><stop offset="1" stopColor="#354039" /></linearGradient>
        <linearGradient id="pbCam3" x1="1665.4" y1="325.228" x2="1647.66" y2="307.485" gradientUnits="userSpaceOnUse">
          {stops([['0', '#231F20'], ['0.2', '#1F2C37'], ['0.47', '#13537B'], ['0.62', '#0A70AE'], ['0.78', '#0095EE'], ['0.84', '#0D689F'], ['0.91', '#1B394E'], ['1', '#231F20']])}
        </linearGradient>
        <radialGradient id="pbCam4" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1663.46 322.948) scale(4.478)">
          <stop stopColor="#CCCCCC" /><stop offset="0.41" stopColor="#585858" /><stop offset="1" />
        </radialGradient>
      </defs>
      <path d="M1672.5 373.896L1389.87 373.896C1358.11 373.896 1332.34 348.126 1332.34 316.357C1332.34 284.589 1358.11 258.734 1389.87 258.734L1672.5 258.734C1704.27 258.734 1730.04 284.504 1730.04 316.357C1730.04 348.126 1704.27 373.896 1672.5 373.896Z" fill="#1D1D1B" />
      <circle cx="1656.53" cy="316.357" r="25.18" fill="url(#pbCam1)" />
      <circle cx="1656.53" cy="316.357" r="14.36" fill="url(#pbCam2)" />
      <circle cx="1656.53" cy="316.357" r="12.59" fill="url(#pbCam3)" />
      <circle cx="1663.46" cy="322.948" r="4.48" fill="url(#pbCam4)" style={{ mixBlendMode: 'screen' }} />
    </svg>
  )
})

// ---------- the back of the phone: a clear case printed with black polka dots, and her beaded strap ----------
const BODY = 'M2139.82 120L937.844 120C781.196 120 654.207 246.989 654.207 403.637L654.207 3466.19C654.207 3622.84 781.196 3749.83 937.844 3749.83L2139.82 3749.83C2296.46 3749.83 2423.45 3622.84 2423.45 3466.19L2423.45 403.637C2423.45 246.989 2296.46 120 2139.82 120Z'
const GLASS = 'M2132.72 147.713L945.027 147.713C800.978 147.713 684.203 264.488 684.203 408.537L684.203 3461.29C684.203 3605.34 800.978 3722.11 945.027 3722.11L2132.72 3722.11C2276.77 3722.11 2393.54 3605.34 2393.54 3461.29L2393.54 408.537C2393.54 264.488 2276.770 147.713 2132.72 147.713Z'
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number) =>
  `M${x0 + r} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`
// the case's thick clear rim runs from the phone's edge in to here
const RIM = rrect(698, 164, 2379, 3706, 242)
// its corners are padded out a little further, like air cushions
const CUSHIONS = [[940, 406, 180], [2137, 406, 270], [2137, 3464, 0], [940, 3464, 90]]

// the camera: a frosted plateau with three lenses down its left and right, a flash and a LiDAR dot
const CAM = { x: 730, y: 190, s: 700, r: 160 }
const LENSES = [[905, 400], [1258, 545], [905, 700]]

// the case print: black polka dots in staggered rows, every other row shifted half a step
const DOTS: number[][] = []
for (let row = 0, y = 250; y < 3700; row++, y += 165) {
  for (let x = 770 + (row % 2) * 150; x < 2360; x += 300) {
    // leave the camera and its surround clear
    if (x < 1500 && y < 950) continue
    DOTS.push([x, y])
  }
}

const PhoneBack = memo(function PhoneBack() {
  return (
    <>
      {/* the same frame, mirrored so the side buttons land on the right sides when seen from behind */}
      <div className="absolute inset-0" style={{ transform: 'scaleX(-1)' }}><FrameBody /></div>
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="639 120 1800 3629.83" fill="none" aria-hidden>
        <defs>
          <linearGradient id="pbkGlass" x1="684" y1="148" x2="2393" y2="3722" gradientUnits="userSpaceOnUse">
            <stop stopColor="#dedad4" /><stop offset="0.5" stopColor="#d2cdc6" /><stop offset="1" stopColor="#c8c3bb" />
          </linearGradient>
          <linearGradient id="pbkSheen" x1="684" y1="148" x2="2393" y2="3722" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.45" /><stop offset="0.3" stopColor="white" stopOpacity="0.06" /><stop offset="0.65" stopColor="white" stopOpacity="0" /><stop offset="1" stopColor="white" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="pbkPlateau" x1="730" y1="190" x2="1430" y2="890" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f1efeb" /><stop offset="1" stopColor="#dcd8d1" />
          </linearGradient>
          <linearGradient id="pbkRing" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#fbfbfa" /><stop offset="0.45" stopColor="#bdbab4" /><stop offset="0.75" stopColor="#efedea" /><stop offset="1" stopColor="#a9a6a0" />
          </linearGradient>
          <radialGradient id="pbkLens" cx="0.38" cy="0.35" r="0.75">
            <stop stopColor="#5a72b8" /><stop offset="0.3" stopColor="#1c2a55" /><stop offset="0.7" stopColor="#070a14" /><stop offset="1" stopColor="#000" />
          </radialGradient>
          <filter id="pbkPrint" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#5e574c" floodOpacity="0.25" />
          </filter>
          <filter id="pbkShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#4a443a" floodOpacity="0.25" />
          </filter>
          <clipPath id="pbkInside"><path d={RIM} /></clipPath>
        </defs>

        {/* the phone's own frosted back glass */}
        <path d={GLASS} fill="url(#pbkGlass)" />

        {/* the camera plateau: three lenses in silver rings, the flash, the LiDAR dot and the mic */}
        <rect x={CAM.x} y={CAM.y} width={CAM.s} height={CAM.s} rx={CAM.r} fill="url(#pbkPlateau)" stroke="#c9c4bc" strokeWidth="4" filter="url(#pbkShadow)" />
        {LENSES.map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="132" fill="url(#pbkRing)" filter="url(#pbkShadow)" />
            <circle cx={cx} cy={cy} r="104" fill="#0b0b0c" />
            <circle cx={cx} cy={cy} r="74" fill="url(#pbkLens)" />
            <circle cx={cx} cy={cy} r="30" fill="#000" opacity="0.7" />
            <circle cx={cx - 24} cy={cy - 26} r="13" fill="white" opacity="0.4" />
            <circle cx={cx + 20} cy={cy + 22} r="6" fill="#8fb0ff" opacity="0.4" />
          </g>
        ))}
        <circle cx="1258" cy="300" r="50" fill="#f6f2e8" stroke="#cfc9bd" strokeWidth="6" />
        <circle cx="1258" cy="300" r="32" fill="#f8e7b8" />
        <circle cx="1258" cy="300" r="14" fill="#fbd98d" opacity="0.8" />
        <circle cx="1258" cy="790" r="46" fill="#151515" />
        <circle cx="1246" cy="778" r="10" fill="white" opacity="0.25" />
        <circle cx="1372" cy="712" r="11" fill="#7d786f" />

        {/* the clear case: a soft sheen, then its print, which sits just above the glass and throws a faint shadow */}
        <path d={GLASS} fill="url(#pbkSheen)" />
        <g clipPath="url(#pbkInside)">
          <g filter="url(#pbkPrint)">
            {DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="30" fill="#141414" />)}
          </g>
        </g>

        {/* the case's clear raised surround round the camera */}
        <rect x={CAM.x - 26} y={CAM.y - 26} width={CAM.s + 52} height={CAM.s + 52} rx={CAM.r + 26} fill="white" fillOpacity="0.12" stroke="white" strokeOpacity="0.9" strokeWidth="9" />
        <rect x={CAM.x - 12} y={CAM.y - 12} width={CAM.s + 24} height={CAM.s + 24} rx={CAM.r + 12} stroke="#9f9a91" strokeOpacity="0.35" strokeWidth="4" />

        {/* the thick clear rim, a little proud of the phone all round, its cushioned corners and inner edge catching the light */}
        <path d={BODY} stroke="white" strokeOpacity="0.55" strokeWidth="30" />
        <path d={`${BODY}${RIM}`} fillRule="evenodd" fill="white" fillOpacity="0.38" />
        {CUSHIONS.map(([cx, cy, from]) => {
          const a0 = (from * Math.PI) / 180, a1 = ((from + 90) * Math.PI) / 180, r = 262
          return <path key={from} d={`M${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`} stroke="white" strokeOpacity="0.55" strokeWidth="26" strokeLinecap="round" />
        })}
        <path d={RIM} stroke="#a7a198" strokeOpacity="0.45" strokeWidth="5" />
        <path d={rrect(708, 174, 2369, 3696, 232)} stroke="white" strokeOpacity="0.9" strokeWidth="6" />
        <path d={BODY} stroke="#bdb8b0" strokeOpacity="0.7" strokeWidth="4" />
        <path d="M676 900V1500M676 2300V2700M2402 1100V1900" stroke="white" strokeOpacity="0.9" strokeWidth="10" strokeLinecap="round" />
        {/* the lanyard hole in the top-right corner */}
        <circle cx={CHARM_HOLE[0]} cy={CHARM_HOLE[1]} r="17" fill="#bfbab2" stroke="white" strokeWidth="4" />
      </svg>
    </>
  )
})

// ---------- her beaded strap, the one lying by her phone in the meadow, hanging here from the case's top-right corner ----------
// it falls to the left, over the case, so it stays on screen even where the phone fills the screen's width
const CHARM_HOLE = [2310, 232]
// phone units to each of the strap's own units
const CHARM_SCALE = 60

// the two sprites, painted the first time the phone is picked up and kept for every time after
let charmSprites: { strap: HTMLCanvasElement; name: HTMLCanvasElement } | null = null
const sprites = () => (charmSprites ??= { strap: mirrored(paintHangingCharm()), name: paintNameCharm() })

// `sway`: they swing only while the case is turned to you (behind the screen they would only keep the GPU busy)
const PhoneCharm = memo(function PhoneCharm({ sway }: { sway: boolean }) {
  const { strap, name } = sprites()
  const { w, h, top } = HANGING_CHARM
  const state = sway ? 'running' : 'paused'
  return (
    <>
      <Charm sprite={strap} box={{ w, h, top: [w - top[0], top[1]] }} animation={`phone-charm-sway 3.6s ease-in-out infinite alternate ${state}`} />
      {/* her name strand, from the same hole, bending into the strap's loop and swaying to its own beat */}
      <Charm sprite={name} box={NAME_CHARM} animation={`phone-name-sway 2.9s ease-in-out infinite alternate ${state}`} />
    </>
  )
})

// the strap's sprite turned over left to right, so its loop falls to the left of the clasp
function mirrored(cv: HTMLCanvasElement) {
  const out = document.createElement('canvas')
  out.width = cv.width
  out.height = cv.height
  const ctx = out.getContext('2d')!
  ctx.scale(-1, 1)
  ctx.drawImage(cv, -cv.width, 0)
  return out
}

// a sprite shown in a canvas of its own: copied across (a quick GPU copy), not encoded to a PNG and decoded again for an <img>
function Charm({ sprite, box: { w, h, top }, animation }: { sprite: HTMLCanvasElement; box: { w: number; h: number; top: number[] }; animation: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const cv = ref.current!
    cv.width = sprite.width
    cv.height = sprite.height
    cv.getContext('2d')!.drawImage(sprite, 0, 0)
  }, [sprite])
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute max-w-none"
      style={{ left: u(CHARM_HOLE[0] - 639 - top[0] * CHARM_SCALE), top: u(CHARM_HOLE[1] - 120 - top[1] * CHARM_SCALE), width: u(w * CHARM_SCALE), height: u(h * CHARM_SCALE), transformOrigin: `${(top[0] / w) * 100}% ${(top[1] / h) * 100}%`, filter: 'drop-shadow(0 6px 6px rgba(40,30,20,0.3))', animation }}
    />
  )
}

// ---------- the lock screen it turns over to: her wallpaper, the clock, and a swipe up into Photos ----------
// the clock and date take a warm brown from the wallpaper's cat, as iOS tints them to suit a light wallpaper
const LOCK_INK = '#7a5638'
const LOCK_ICON = {
  open: 'M7 11V8a5 5 0 019.6-2M6 11h12v9H6z',
  torch: 'M8 3h8v3l-2 3v12h-4V9L8 6zM8 6h8M12 13v2',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
}

function LockScreen({ unlocking, recognized, onUnlock }: { unlocking: boolean; recognized: boolean; onUnlock: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  const start = useRef<number | null>(null)
  const [dy, setDy] = useState(0)
  const [torch, setTorch] = useState(false)
  const [date] = useState(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))

  const onDown = (e: React.PointerEvent) => { start.current = e.clientY; e.currentTarget.setPointerCapture(e.pointerId) }
  const onMove = (e: React.PointerEvent) => { if (start.current !== null) setDy(Math.min(0, e.clientY - start.current)) }
  const onUp = (e: React.PointerEvent) => {
    if (start.current === null) return
    const d = e.clientY - start.current
    start.current = null
    // a tap, or a swipe a little way up, opens it; a shorter drag springs back
    if (Math.abs(d) < 6 || d < -root.current!.offsetHeight * 0.15) onUnlock()
    setDy(0)
  }
  // the round torch and camera buttons keep their own taps
  const keep = (e: React.PointerEvent) => e.stopPropagation()
  const round = 'absolute flex items-center justify-center rounded-full backdrop-blur-md cursor-pointer transition-colors'

  return (
    <div
      ref={root}
      className="absolute inset-0 z-[25] touch-none select-none overflow-hidden cursor-pointer"
      style={{ transform: unlocking ? 'translateY(-100%)' : `translateY(${dy}px)`, transition: dy && !unlocking ? 'none' : 'transform 0.45s cubic-bezier(.32,.72,0,1)' }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    >
      <img alt="" src={wallpaper} className="pointer-events-none absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: u(STATUS + 10), color: LOCK_INK, transition: 'opacity 0.3s', opacity: unlocking ? 0 : 1 }}>
        <span style={{ transition: 'transform 0.35s cubic-bezier(.3,1.6,.5,1)', transform: recognized ? 'translateX(12%)' : 'none' }}>
          <Sym d={recognized ? LOCK_ICON.open : ICON.lock} size={22} />
        </span>
        <div className="font-semibold" style={{ marginTop: u(40), fontSize: u(84), lineHeight: 1.1, opacity: 0.85 }}>{date}</div>
        <div className="font-bold tracking-tight" style={{ fontSize: u(500), lineHeight: 1, marginTop: u(-6), opacity: 0.9 }}>9:41</div>
      </div>

      <button onPointerDown={keep} onClick={() => setTorch(!torch)} aria-label="Torch" className={round} style={{ left: u(170), bottom: u(190), width: u(230), height: u(230), background: torch ? 'white' : 'rgba(80, 60, 45, 0.18)', color: torch ? '#1d1d1b' : LOCK_INK }}>
        <Sym d={LOCK_ICON.torch} size={22} fill={torch} />
      </button>
      <button onPointerDown={keep} aria-label="Camera" className={round} style={{ right: u(170), bottom: u(190), width: u(230), height: u(230), background: 'rgba(80, 60, 45, 0.18)', color: LOCK_INK }}>
        <Sym d={LOCK_ICON.camera} size={22} />
      </button>
      <div className="absolute inset-x-0 text-center text-[13px] font-medium" style={{ bottom: u(110), color: LOCK_INK, opacity: recognized ? 0.85 : 0, transition: 'opacity 0.4s', animation: 'phone-swipe-hint 1.6s ease-in-out infinite' }}>Swipe up to open</div>
      <style>{'@keyframes phone-swipe-hint { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }'}</style>
    </div>
  )
}

const TABS: [string, string][] =[['Library', ICON.library], ['For You', ICON.forYou], ['Albums', ICON.albums], ['Search', ICON.search]]

// Photos' tab bar, which never changes
const TabBar = memo(function TabBar() {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-neutral-200 bg-white/85 pb-6 pt-1.5 backdrop-blur-xl">
      {TABS.map(([name, d]) => (
        <span key={name} className="flex flex-col items-center gap-0.5 text-[10px] font-medium" style={{ color: name === 'Albums' ? BLUE : '#a3a3a3' }}><Sym d={d} size={24} />{name}</span>
      ))}
    </div>
  )
})

/** where her phone lies face down on the grass (DreamLanding): its centre and height on screen (px), and how it is turned (radians) */
export interface PhoneSpot { x: number; y: number; h: number; rot: number }

// The pick-up: the phone rises a little off the grass, then flies to the middle of the screen on a slight arc, turning the
// short way round to upright and tipping its top towards you on the way, as a phone does when it is picked up; laying it
// down is the same flight backwards. Its shadow is cast in the phone's own turned frame, so each pose turns it back to
// fall straight down the screen, and lengthens it as the phone rises.
const FLIGHT = { open: 780, close: 760, openEase: 'cubic-bezier(.32,.72,0,1)', closeEase: 'cubic-bezier(.45,0,.2,1)', perspective: 1100 }
const BACKDROP = { color: 'rgba(0, 0, 0, 0.55)', blur: 'blur(6px)' }

function flightFrames(at: PhoneSpot, phone: HTMLElement): Keyframe[] {
  // the phone is laid out in the middle of the screen at full size; the flight is measured from there
  const dx = at.x - window.innerWidth / 2, dy = at.y - window.innerHeight / 2, k = at.h / phone.offsetHeight
  // its turn on the grass, the short way round from upright (degrees, clockwise)
  let a = ((at.rot * 180) / Math.PI) % 360
  if (a > 180) a -= 360
  if (a < -180) a += 360
  const pose = (t: number, rise: number, tilt: number, scale: number, shadow: number, offset?: number) => {
    const turn = a * (1 - t), r = (turn * Math.PI) / 180
    const d = shadow / scale
    return {
      transform: `translate(${dx * (1 - t)}px, ${dy * (1 - t) - rise}px) rotate(${turn}deg) perspective(${FLIGHT.perspective}px) rotateX(${tilt}deg) scale(${scale})`,
      filter: `drop-shadow(${d * Math.sin(r)}px ${d * Math.cos(r)}px ${d * 2}px rgba(0, 0, 0, 0.35))`,
      ...(offset === undefined ? {} : { offset }),
    }
  }
  return [
    pose(0, 0, 0, k, 2),
    pose(0.08, 8, 10, k * 1.25, 8, 0.15),
    pose(0.65, 40, 24, k + (1 - k) * 0.55, 30, 0.55),
    pose(1, 0, 0, 1, 24),
  ]
}

// Once it is up, its shadow is a still one under its body (the frame's BODY: x 654.2 to 2423.45, corners of radius 283.6), the
// same as the drop-shadow its flight ends on. A drop-shadow filter over the whole phone would be worked out again every time
// anything on its screen moved, at every step of a swipe.
const SHADOW = '0 24px 48px rgba(0, 0, 0, 0.35)'

// The turn over. Not one card with a face on each side, hidden from behind by backface-visibility: Safari hides only the face
// itself, and the screen's own layers (the lock screen, the status bar, the Dynamic Island) show through the case, mirrored.
// Instead each face turns on its own: the one going away turns edge-on over the first half, then the one coming in turns
// from edge-on to face you over the second, so neither ever shows its back; the shadow turns with whichever face is showing.
// At rest the face away from you is hidden, and nothing is in 3D.
const TURN = { ms: 700, ease: 'cubic-bezier(.6,.05,.3,1)' }
const yaw = (deg: number, offset?: number): Keyframe => ({ transform: `rotateY(${deg}deg)`, ...(offset === undefined ? {} : { offset }) })
/** the keyframes for [the screen, the case, the shadow], turning over to the case (`toBack`) or back to the screen */
function turnFrames(toBack: boolean): Keyframe[][] {
  const s = toBack ? 1 : -1
  const leaving = [yaw(0), yaw(90 * s, 0.5), yaw(90 * s)]
  const coming = [yaw(-90 * s), yaw(-90 * s, 0.5), yaw(0)]
  const shadow = [yaw(0), yaw(90 * s, 0.5), yaw(-90 * s, 0.5), yaw(0)]
  return toBack ? [leaving, coming, shadow] : [coming, leaving, shadow]
}

/** `onPause(true)` once the phone is up in front of the page (the page can stand still behind it), `onPause(false)` as it goes back down */
export default function PhoneGallery({ spot, onClose, onPause }: { spot: () => PhoneSpot | null; onClose: () => void; onPause?: (paused: boolean) => void }) {
  const [album, setAlbum] = useState<Album | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)
  const backToAlbums = useCallback(() => setAlbum(null), [])
  const closeViewer = useCallback(() => setViewing(null), [])
  // showing the back of the phone, its case and charm: it opens this way round, then turns over to the screen on its own
  const [flipped, setFlipped] = useState(true)
  const turn = useRef<number | undefined>(undefined)
  useEffect(() => {
    // (the lock screen's wallpaper is decoded meanwhile, so the screen is ready to draw as it comes round)
    predecode(wallpaper)
    turn.current = window.setTimeout(() => setFlipped(false), 1800)
    return () => clearTimeout(turn.current)
  }, [])
  // a flip by hand cancels the automatic one
  const flip = (to: boolean) => { clearTimeout(turn.current); setFlipped(to) }

  // the turn itself (turnFrames), played on the two faces and the shadow
  const front = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  // the way round it is, or is turning to (null until first shown); and the turn under way
  const side = useRef<boolean | null>(null)
  const turning = useRef<Animation[]>([])
  useLayoutEffect(() => {
    if (side.current === flipped) return
    const first = side.current === null
    side.current = flipped
    const f = front.current!, b = back.current!
    const settle = () => {
      f.style.visibility = side.current ? 'hidden' : 'visible'
      b.style.visibility = side.current ? 'visible' : 'hidden'
    }
    if (first) {
      settle()
      return
    }
    const running = turning.current
    // turned again mid-turn: it turns back from wherever it has got to
    if (running.length && running.every((a) => a.playState === 'running')) {
      running.forEach((a) => a.reverse())
      return
    }
    running.forEach((a) => a.cancel())
    f.style.visibility = b.style.visibility = 'visible'
    const timing: KeyframeAnimationOptions = { duration: TURN.ms, easing: TURN.ease, fill: 'both' }
    const [ff, bf, sf] = turnFrames(flipped)
    const list = [f.animate(ff, timing), b.animate(bf, timing), shadow.current!.animate(sf, timing)]
    turning.current = list
    // done (either way round): the face now away from you is hidden, and the turn's last frame is let go
    list[0].finished.then(() => {
      if (turning.current !== list) return
      turning.current = []
      settle()
      list.forEach((a) => a.cancel())
    }, () => {})
  }, [flipped])

  // it turns over to the lock screen; Face ID knows her a moment later, and a swipe up opens Photos
  const [locked, setLocked] = useState(true)
  const [recognized, setRecognized] = useState(false)
  useEffect(() => {
    if (flipped || !locked) return
    const t = window.setTimeout(() => setRecognized(true), 900)
    return () => clearTimeout(t)
  }, [flipped, locked])
  // the lock screen slides away, then leaves the page
  const [unlocking, setUnlocking] = useState(false)
  const unlock = () => {
    if (unlocking) return
    setRecognized(true)
    setUnlocking(true)
    window.setTimeout(() => setLocked(false), 450)
  }

  // it is picked up off the grass as it opens, and laid back down there, face down, as it closes
  const overlay = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const phone = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  // the page behind is told when the phone is up in front of it, and when it starts back down (and, whatever happens, at the end)
  const pause = useRef(onPause)
  pause.current = onPause
  useEffect(() => () => pause.current?.(false), [])
  useLayoutEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const at = spot()
    // the dimmed, blurred backdrop fades in: its opacity, so the blur itself is not worked out afresh at every step
    const fade = reduce ? 200 : 600
    scrim.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fade, easing: 'ease-out' })
    if (at && !reduce) {
      phone.current!.animate(flightFrames(at, phone.current!), { duration: FLIGHT.open, easing: FLIGHT.openEase })
      // in flight its shadow is the flight's own (a filter, falling away from it as it rises); the still one takes over as it lands
      shadow.current!.animate([{ opacity: 0 }, { opacity: 0 }], { duration: FLIGHT.open })
    } else phone.current!.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'ease-out' })
    overlay.current!.querySelectorAll('[data-chrome]').forEach((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: reduce ? 0 : FLIGHT.open - 250, fill: 'backwards' }))
    // the page behind stands still once the backdrop is mostly in (~70% at half its fade), so the rest of the flight has
    // the device to itself; by then the meadow has long since drawn the grass without the phone on it
    const still = window.setTimeout(() => { if (!closing.current) pause.current?.(true) }, fade / 2)
    return () => clearTimeout(still)
  }, [spot])
  const close = useCallback(() => {
    if (closing.current) return
    closing.current = true
    pause.current?.(false)
    overlay.current!.style.pointerEvents = 'none'
    // it turns back over on its way down
    clearTimeout(turn.current)
    setFlipped(true)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    const at = spot()
    const time = at && !reduce ? FLIGHT.close : 200
    scrim.current!.animate([{ opacity: 1 }, { opacity: 0 }], { duration: time, easing: 'ease-in', fill: 'forwards' })
    overlay.current!.querySelectorAll('[data-chrome]').forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' }))
    // flying down, the flight's own shadow takes over from the still one again
    if (at && !reduce) shadow.current!.animate([{ opacity: 0 }, { opacity: 0 }], { duration: time, fill: 'forwards' })
    const frames = at && !reduce
      ? flightFrames(at, phone.current!).reverse().map((f) => (f.offset === undefined ? f : { ...f, offset: 1 - (f.offset as number) }))
      : [{ opacity: 1 }, { opacity: 0 }]
    phone.current!.animate(frames, { duration: time, easing: at && !reduce ? FLIGHT.closeEase : 'ease-in', fill: 'forwards' }).finished.then(onClose, onClose)
  }, [spot, onClose])
  // scrolling the page lays the phone back down on the grass
  useEffect(() => {
    let lastY = window.scrollY
    const onScroll = () => {
      if (Math.abs(window.scrollY - lastY) < 4) return
      close()
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [close])
  // the photo viewer with its chrome hidden: black, with a white status bar
  const [immersive, setImmersive] = useState(false)
  useEffect(() => { if (viewing === null) setImmersive(false) }, [viewing])
  const dark = viewing !== null && immersive

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!album || viewing === null) return
        e.preventDefault()
        setViewing(step(e.key === 'ArrowRight' ? 1 : -1))
        return
      }
      if (e.key === 'Escape') viewing !== null ? setViewing(null) : album ? setAlbum(null) : close()
    }
    // the neighbouring photo in the open album, stopping at the first and last
    const step = (d: number) => Math.max(0, Math.min(countOf(album!) - 1, viewing! + d))
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [album, viewing, close])

  return (
    <div ref={overlay} className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onClick={close}>
      {/* the page behind, dimmed and blurred */}
      <div ref={scrim} className="absolute inset-0" style={{ background: BACKDROP.color, backdropFilter: BACKDROP.blur, WebkitBackdropFilter: BACKDROP.blur }} />
      <div
        ref={phone}
        className="relative"
        style={{ '--w': 'min(375px, 92vw, calc(90vh * 1800 / 3629.83))', width: 'var(--w)', height: u(3629.83), perspective: '2400px' } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div ref={shadow} className="pointer-events-none absolute top-0" style={{ left: u(15.2), width: u(1769.25), height: u(3629.83), borderRadius: u(283.6), boxShadow: SHADOW }} />
        {/* the phone turns over on its vertical axis, one face at a time (see turnFrames): the screen on this face... */}
        <div ref={front} className="absolute inset-0" style={{ pointerEvents: flipped ? 'none' : undefined }}>
          <FrameBody />
          <div
            className="absolute overflow-hidden bg-white"
            style={{ left: u(SCREEN.x), top: u(SCREEN.y), width: u(SCREEN.w), height: u(SCREEN.h), borderRadius: u(SCREEN.r), fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif' }}
          >
            <div className="absolute inset-x-0 top-0 z-30 grid items-center text-[15px] font-semibold" style={{ height: u(STATUS), gridTemplateColumns: `1fr ${u(420)} 1fr`, color: dark ? 'white' : 'black' }}>
              <span className="text-center transition-opacity duration-300" style={{ opacity: locked && !unlocking ? 0 : 1 }}>9:41</span>
              <span />
              <span className="flex items-center justify-center gap-1">
                <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.5" y="5" width="3" height="6" rx="1" /><rect x="9" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="0" width="3" height="11" rx="1" /></svg>
                <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" /><path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4z" fill="currentColor" opacity="0.4" /></svg>
              </span>
            </div>
            {/* Photos, which zooms up into place as the lock screen slides away */}
            <div className="absolute inset-0" style={{ transform: locked && !unlocking ? 'scale(0.9)' : 'none', opacity: locked && !unlocking ? 0 : 1, transition: 'transform 0.5s cubic-bezier(.32,.72,0,1), opacity 0.3s' }}>
              <div className="h-full" style={{ paddingTop: u(STATUS) }}>{album ? <AlbumScreen album={album} onBack={backToAlbums} onView={setViewing} /> : <AlbumsScreen onOpen={setAlbum} />}</div>
              <TabBar />
              {album && viewing !== null ? <PhotoViewer album={album} index={viewing} onIndex={setViewing} onClose={closeViewer} immersive={immersive} onImmersive={setImmersive} /> : null}
            </div>
            {locked ? <LockScreen unlocking={unlocking} recognized={recognized} onUnlock={unlock} /> : null}
            <div className="pointer-events-none absolute bottom-2 left-1/2 z-30 h-[5px] w-[36%] -translate-x-1/2 rounded-full" style={{ background: dark ? 'white' : 'black' }} />
          </div>
          <DynamicIsland />
        </div>
        {/* ...and the case on this one */}
        <div ref={back} className="absolute inset-0 cursor-pointer" style={{ pointerEvents: flipped ? undefined : 'none' }} onClick={() => flip(false)}>
          <PhoneBack />
          <PhoneCharm sway={flipped} />
          <style>{'@keyframes phone-charm-sway { from { transform: rotate(-3deg) } to { transform: rotate(2.5deg) } } @keyframes phone-name-sway { from { transform: rotate(-4deg) } to { transform: rotate(3deg) } }'}</style>
        </div>
      </div>
      <button data-chrome onClick={(e) => { e.stopPropagation(); flip(!flipped) }} aria-label="Flip phone" className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/25 cursor-pointer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0115.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 01-15.5 6.2L3 16M3 21v-5h5" /></svg>
        {flipped ? 'Front' : 'Flip'}
      </button>
      <button data-chrome onClick={(e) => { e.stopPropagation(); close() }} aria-label="Close" className="absolute right-5 top-5 text-3xl leading-none text-white cursor-pointer">×</button>
    </div>
  )
}
