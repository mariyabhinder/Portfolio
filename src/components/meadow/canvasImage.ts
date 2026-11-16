// A p5.Image is a <canvas> with a 2D context. A picture painted in code into a canvas of its own becomes a p5.Image by handing
// that canvas over, rather than reading every pixel back (getImageData) and writing it into a second canvas (putImageData):
// two full copies, each with an alpha round trip, for the same picture. The texture WebGL makes from it is uploaded from the
// canvas either way. (Only for pictures whose pixels are never read back through p5's loadPixels.)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function canvasImage(p: any, cv: HTMLCanvasElement): any {
  const im = p.createImage(1, 1)
  im.canvas = cv
  im.drawingContext = cv.getContext('2d')
  im.width = cv.width
  im.height = cv.height
  im.setModified(true)
  return im
}

// One download and one decode per picture, however many places ask for it. The scenes used to fetch the same file through both
// an <img> (for reading its pixels) and p5's loadImage (a fetch()), and the two are never shared by the browser: each of the
// landing's pictures, and a few others, came down two or three times.
const decoded = new Map<string, Promise<HTMLImageElement>>()

/** the picture at `url`, decoded (shared: draw from it, never change it) */
export function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  let pr = decoded.get(url)
  if (!pr) {
    const img = new Image()
    // the same request mode as p5's fetch (cors), so a picture from another origin can still go to the GPU
    img.crossOrigin = 'anonymous'
    img.src = url
    pr = img.decode().then(() => img)
    // a failed download is not kept, so a later call tries again
    pr.catch(() => decoded.delete(url))
    decoded.set(url, pr)
  }
  return pr
}

/** a new p5.Image of the picture at `url`: made the way p5's own loadImage makes it (the decoded picture drawn into the image's
 *  canvas at its natural size), from the shared download. Each call gets its own copy, so changing its pixels touches no other. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadImage(p: any, url: string): Promise<any> {
  const img = await loadHtmlImage(url)
  const im = p.createImage(1, 1)
  im.width = im.canvas.width = img.naturalWidth
  im.height = im.canvas.height = img.naturalHeight
  im.drawingContext.drawImage(img, 0, 0)
  im.setModified(true)
  return im
}
