import { useEffect, useState } from 'react'
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

// The phone's Photos app, opened by clicking her phone in the hero: an Albums screen, and an album screen once one is picked.
// Each photo is a plain colour for now: put the real pictures in `photos` (any image url) and they replace the colours.
interface Album {
  id: string
  name: string
  color: string
  /** image urls shown in the album; empty = placeholder colours */
  photos: string[]
  /** how many placeholder tiles to show while there are no photos */
  count: number
}

const ALBUMS: Album[] = [
  { id: 'udaipur', name: 'Udaipur ☀️🥂👒', color: '#f4a6b8', photos: [udp1, udp2, udp3, udp4, udp5, udp6, udp7, udp8, udp9, udp10, udp11, udp12, udp13, udp14], count: 30 },
  { id: 'colorful', name: 'Colorful Corner 🎨', color: '#a8d8f0', photos: [cc1, cc2, cc3], count: 16 },
  { id: 'stitches', name: 'Little Stitches 🧵🌸', color: '#f3e08a', photos: [ls1, ls2, ls3, ls4, ls5], count: 34 },
  { id: 'bf', name: '', color: '#b9a6e8', photos: [], count: 16 },
]

const PALETTE = ['#f4a6b8', '#a8d8f0', '#f3e08a', '#b9a6e8', '#9fdcb4', '#f7b88a', '#8fc7e8', '#e8a0d0']
const tileColor = (album: Album, i: number) => PALETTE[(i + ALBUMS.indexOf(album) * 3) % PALETTE.length]
const countOf = (a: Album) => (a.photos.length || a.count)

function Tile({ album, i, heart }: { album: Album; i: number; heart?: boolean }) {
  const src = album.photos[i]
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
}

function AlbumsScreen({ onOpen }: { onOpen: (a: Album) => void }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain bg-white" style={{ scrollbarWidth: 'none' }}>
      <div className="px-4 pt-3 text-[#0a84ff] text-[28px] leading-none">+</div>
      <h1 className="px-4 pt-3 text-[30px] font-bold text-black">Albums</h1>
      <div className="mx-4 mt-2 border-t border-neutral-200" />
      <div className="flex items-baseline justify-between px-4 pt-3">
        <h2 className="text-[19px] font-bold text-black">My Albums</h2>
        <span className="text-[#0a84ff] text-[15px]">See All</span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 px-3 pt-3">
        {ALBUMS.map((a) => (
          <button key={a.id} onClick={() => onOpen(a)} className="text-left cursor-pointer">
            <div className="aspect-square overflow-hidden rounded-md">
              <Tile album={a} i={0} />
            </div>
            <div className="pt-1 text-[14px] text-black leading-tight">{a.name}</div>
            <div className="text-[14px] text-neutral-400 leading-tight">{countOf(a)}</div>
          </button>
        ))}
      </div>
      <div className="mx-4 mt-4 border-t border-neutral-200" />
      <h2 className="px-4 pt-3 text-[19px] font-bold text-black">More</h2>
      <div className="grid grid-cols-2 gap-3 px-3 pt-3 pb-24">
        {[0, 1].map((i) => (
          <div key={i} className="aspect-square rounded-md" style={{ background: PALETTE[(i + 4) % PALETTE.length] }} />
        ))}
      </div>
    </div>
  )
}

function AlbumScreen({ album, onBack, onView }: { album: Album; onBack: () => void; onView: (i: number) => void }) {
  const n = countOf(album)
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <button onClick={onBack} className="text-[#0a84ff] text-[17px] cursor-pointer">‹ Albums</button>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[14px] font-semibold text-[#0a84ff]">Select</span>
      </div>
      <h1 className="px-4 pb-2 text-[22px] font-bold text-black">{album.name}</h1>
      <div className="flex-1 overflow-y-auto overscroll-contain" style={{ scrollbarWidth: 'none' }}>
        <div className="grid grid-cols-3 gap-[2px] pb-24">
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="aspect-square cursor-pointer" onClick={() => onView(i)}>
              <Tile album={album} i={i} heart={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
)

// a photo opened in the phone's gallery: back arrow, date and menu on top; the photo; a thumbnail strip; share / like, edit, delete / info below
function PhotoViewer({ album, index, onIndex, onClose }: { album: Album; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const n = countOf(album)
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn() }
  const arrow = 'absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-lg leading-none text-white cursor-pointer'
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black pt-7 text-white" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 pb-2">
        <button onClick={onClose} aria-label="Back" className="cursor-pointer"><Icon d="M19 12H5M11 6l-6 6 6 6" /></button>
        <div className="mr-auto pl-4 leading-tight">
          <div className="text-[15px] font-medium">18 October</div>
          <div className="text-[12px] text-neutral-400">20:21</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" /></svg>
      </div>

      <div className="relative min-h-0 flex-1">
        {album.photos[index] ? (
          <img alt="" src={album.photos[index]} className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="mx-auto h-full w-full" style={{ background: tileColor(album, index) }} />
        )}
        {index > 0 ? <button onClick={stop(() => onIndex(index - 1))} aria-label="Previous photo" className={`${arrow} left-2`}>‹</button> : null}
        {index < n - 1 ? <button onClick={stop(() => onIndex(index + 1))} aria-label="Next photo" className={`${arrow} right-2`}>›</button> : null}
      </div>

      <div className="flex gap-1 overflow-x-auto px-2 py-2" style={{ scrollbarWidth: 'none' }}>
        {Array.from({ length: n }, (_, i) => (
          <button key={i} onClick={stop(() => onIndex(i))} aria-label={`Photo ${i + 1}`} className={`h-9 shrink-0 cursor-pointer overflow-hidden rounded-[3px] ${i === index ? 'w-12' : 'w-7 opacity-70'}`}>
            <Tile album={album} i={i} />
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 pb-4 pt-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800"><Icon d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></div>
        <div className="flex h-10 items-center gap-5 rounded-full bg-neutral-800 px-5">
          <Icon d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3 4.5 6.7 4.5c2 0 3.5 1.1 5.3 3 1.8-1.9 3.3-3 5.3-3 3.7 0 5.8 3.8 4.3 7.3C19.5 16.4 12 21 12 21z" />
          <Icon d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
          <Icon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800"><Icon d="M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v6M12 7.5v.01" /></div>
      </div>
    </div>
  )
}

export default function PhoneGallery({ onClose }: { onClose: () => void }) {
  const [album, setAlbum] = useState<Album | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (!album || viewing === null) return
        e.preventDefault()
        setViewing(step(e.key === 'ArrowRight' ? 1 : -1))
        return
      }
      if (e.key === 'Escape') viewing !== null ? setViewing(null) : album ? setAlbum(null) : onClose()
    }
    // the neighbouring photo in the open album, stopping at the first and last
    const step = (d: number) => Math.max(0, Math.min(countOf(album!) - 1, viewing! + d))
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [album, viewing, onClose])

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div
        className="relative overflow-hidden rounded-[44px] border-[10px] border-[#16161a] bg-white shadow-2xl"
        style={{ width: 'min(375px, 92vw)', height: 'min(760px, 90vh)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute left-1/2 top-0 z-10 h-[22px] w-[110px] -translate-x-1/2 rounded-b-2xl bg-[#16161a]" />
        <div className="h-full pt-6">{album ? <AlbumScreen album={album} onBack={() => setAlbum(null)} onView={setViewing} /> : <AlbumsScreen onOpen={setAlbum} />}</div>
        <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-neutral-200 bg-white/90 py-2 text-[11px] text-neutral-400 backdrop-blur">
          <span>Library</span>
          <span>For You</span>
          <span className="font-semibold text-[#0a84ff]">Albums</span>
          <span>Search</span>
        </div>
      {album && viewing !== null ? <PhotoViewer album={album} index={viewing} onIndex={setViewing} onClose={() => setViewing(null)} /> : null}
      </div>
      <button onClick={onClose} aria-label="Close" className="absolute right-5 top-5 text-3xl leading-none text-white cursor-pointer">×</button>
    </div>
  )
}
