import { useEffect, useState, type CSSProperties } from 'react'

// Device mockups (the phones in the case studies) are exported with a faint glow round the device (alpha below ~40) that
// stops in hard edges at the image's bounds, so on the page it shows as a grey box behind the phone. DeviceShot shows the
// device alone: the part of the picture given by `crop` (x, y, w, h as fractions of its width and height), with whatever is
// left of the glow inside that part cleared. The box has the crop's proportions from the first paint, so nothing moves when
// the cleaned picture fades in, and a drop-shadow filter given to it follows the device's own outline.

export type Crop = readonly [x: number, y: number, w: number, h: number]

// below this alpha a pixel is glow; the device's anti-aliased edge sits well above it, so the outline stays smooth
const GLOW_ALPHA = 48

// one cleaned copy per picture and crop, kept for the visit: the case studies are opened again and again
const cleaned = new Map<string, Promise<string>>()

function clean(src: string, [x, y, w, h]: Crop) {
  const key = `${src}#${x},${y},${w},${h}`
  let job = cleaned.get(key)
  if (job) return job
  job = new Promise<string>((resolve, reject) => {
    const im = new Image()
    im.onload = () => {
      const sx = Math.round(x * im.naturalWidth), sy = Math.round(y * im.naturalHeight)
      const sw = Math.round(w * im.naturalWidth), sh = Math.round(h * im.naturalHeight)
      const c = document.createElement('canvas')
      c.width = sw
      c.height = sh
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return reject(new Error('no 2d canvas'))
      ctx.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh)
      const px = ctx.getImageData(0, 0, sw, sh)
      for (let i = 3; i < px.data.length; i += 4) if (px.data[i] < GLOW_ALPHA) px.data[i] = 0
      ctx.putImageData(px, 0, 0)
      c.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('canvas export failed'))), 'image/png')
    }
    im.onerror = () => reject(new Error(`could not load ${src}`))
    im.src = src
  })
  cleaned.set(key, job)
  // a failed attempt isn't kept, so the next visit tries again
  job.catch(() => cleaned.delete(key))
  return job
}

export default function DeviceShot({ src, alt, crop, iw, ih, className, style }: {
  src: string
  alt: string
  crop: Crop
  /** the picture's own size in px, for the box's proportions before it has loaded */
  iw: number
  ih: number
  className?: string
  style?: CSSProperties
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [x, y, w, h] = crop
  const key = crop.join()
  useEffect(() => {
    let live = true
    clean(src, crop).then(
      (u) => { if (live) setUrl(u) },
      () => { if (live) setFailed(true) },
    )
    return () => { live = false }
    // the crop is compared by value (key), not by the array passed in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, key])

  // nothing here is positioned, so the box can be placed however the page needs (absolute, in a grid, in a flow)
  const fill: CSSProperties = { display: 'block', maxWidth: 'none', userSelect: 'none', opacity: 0, transition: 'opacity .45s ease' }
  const show = (e: { currentTarget: HTMLImageElement }) => { e.currentTarget.style.opacity = '1' }
  return (
    <div
      className={className}
      role="img"
      aria-label={alt}
      style={{ overflow: 'hidden', aspectRatio: `${w * iw} / ${h * ih}`, ...style }}
    >
      {url ? (
        <img src={url} alt="" draggable={false} onLoad={show} style={{ ...fill, width: '100%', height: '100%' }} />
      ) : failed ? (
        // no canvas to clean it with: the picture as it is, cut to the crop
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={show}
          style={{ ...fill, width: `${100 / w}%`, height: `${100 / h}%`, transform: `translate(${-x * 100}%, ${-y * 100}%)` }}
        />
      ) : null}
    </div>
  )
}
