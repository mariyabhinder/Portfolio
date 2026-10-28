// The landing, drawn with p5 (the drawing half; land.ts has the numbers and the timeline, cloud.ts the cloud).
//
// The landing sprite (landing-girl.webp) is one flattened illustration, like the falling one, so her motion is built the same way:
//  - her whole body moves, squashes a little along her height at the press and tilts as the cloud pushes back (matrix transforms),
//  - her limbs swing about their joints and her loose fabric (hem, sleeves, hijab drape) answers later than her body, on a
//    wind-bent mesh (vertex shader), with loose fabric weighted by its distance from her body and none at her face,
//  - her expression changes by cross-fading to two further pictures of her (eyes closed, then eyes open: she settles into a resting pose
//    with her hand on her stomach), each laid on the landing sprite aligned on her face and scaled to match it.
// Ideal art would be layered (hijab, dress, each arm and leg, head with glasses) so each could move on its own. With one image,
// the swinging limbs and lagging fabric are the closest equivalent; they are small, controlled movements, not true cloth.

import landingGirlUrl from '@/assets/meadow/landing-girl.webp'
import eyesCloseUrl from '@/assets/meadow/girl landing eyes close.webp'
import eyesOpenUrl from '@/assets/meadow/girl landing eyes open.webp'
import startUrl from '@/assets/meadow/start.webp'
import middleUrl from '@/assets/meadow/middle.webp'
import endUrl from '@/assets/meadow/end.webp'
import { paintCloud } from './cloud'
import { gridGeometry } from './grid'
import type { CloudSprites } from './cloud'
import { LAND_CONFIG } from './land'
import type { LandFrame } from './land'
import { POSES, RISE_CONFIG, layerScale } from './rise'
import type { RiseFrame } from './rise'

/** The landing sprite's geometry, in the px of landing-girl.webp (364 x 427). */
export const LANDER = {
  w: 364,
  h: 427,
  /** the sprite's centre, and the point on her face used to line her up with the falling picture and to place her */
  centre: [182, 213.5] as [number, number],
  face: [126, 44] as [number, number],
  /** the same point on falling-girl.webp (354 x 427) and its centre */
  fallFace: [125, 80] as [number, number],
  fallCentre: [177, 213.5] as [number, number],
  /** her head is turned further on the landing picture than on the falling one: turn the landing picture by this (rad) while they overlap */
  alignRot: (11 * Math.PI) / 180,
  /** where on the sprite her body meets the cloud (squash pivot) */
  pivot: [185, 395] as [number, number],
  /** her body as a stick figure [x, y, radius]: fabric within the radius stays rigid, beyond it is free to move */
  skeleton: [
    [[122, 46, 52], [138, 112, 52]], // head and shoulders
    [[138, 112, 52], [178, 172, 66], [215, 240, 74], [190, 300, 66]], // torso, down the skirt
    [[188, 88, 20], [255, 55, 18]], // raised arm to the hand
    [[96, 172, 26], [28, 203, 26]], // other arm to the hand
    [[250, 268, 38], [336, 328, 44]], // upper leg to the big shoe
    [[208, 322, 36], [262, 394, 40]], // lower leg to the near shoe
  ],
  /** the later pictures of her, each in its own px: where her face point (the landing sprite's `face`) is on it, and px of the landing sprite per px of the picture */
  poses: {
    closed: { w: 380, h: 478, face: [120, 55.5] as [number, number], scale: 0.9 },
    open: { w: 570, h: 703, face: [177, 83] as [number, number], scale: 0.62 },
  },
  /** distance (px) over which fabric goes from rigid to fully loose */
  looseSpan: 60,
  /** limbs that swing about a joint: `from` the pivot, `to` the tip, rigid core `r` (same order as LAND_CONFIG.limbs) */
  limbs: [
    { from: [188, 90], to: [256, 52], r: 24 },
    { from: [98, 170], to: [26, 205], r: 30 },
    { from: [250, 268], to: [338, 330], r: 44 },
    { from: [206, 320], to: [264, 396], r: 40 },
  ],
}

const LAND_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uModelViewMatrix, uProjectionMatrix;
uniform vec4 uLimb0, uLimb1, uLimb2, uLimb3, uRad, uAng;
uniform vec4 uFabric;
uniform vec3 uAmp;
uniform vec2 uHead, uCore;
uniform float uHeadR, uPress;
varying vec2 vTexCoord;

// swing p about a limb's pivot by ang, weighted so it is 0 at the joint and full along the limb and its tip
vec2 swing(vec2 p, vec4 L, float rad, float ang) {
  vec2 a = L.xy, e = L.zw - L.xy;
  float s = dot(p - a, e) / dot(e, e);
  float d = length(p - a - e * clamp(s, 0.0, 1.0));
  float w = smoothstep(0.0, 0.5, s) * (1.0 - smoothstep(rad, rad * 1.9, d));
  float c = cos(ang * w), sn = sin(ang * w);
  vec2 q = p - a;
  return a + vec2(c * q.x - sn * q.y, sn * q.x + c * q.y);
}

void main() {
  vec2 p = aPosition.xy;
  p = swing(p, uLimb0, uRad.x, uAng.x);
  p = swing(p, uLimb1, uRad.y, uAng.y);
  p = swing(p, uLimb2, uRad.z, uAng.z);
  p = swing(p, uLimb3, uRad.w, uAng.w);
  float loose = smoothstep(0.0, 1.0, aPosition.z);
  // 1 around her head and hijab, 0 on the skirt
  float hj = 1.0 - smoothstep(uHeadR, uHeadR * 2.1, length(p - uHead));
  // loose fabric answers later than her body (uFabric is a delayed copy of the press: the difference to the body is what shows),
  // the further out the later: the hem trails the body, then swings past it
  float dress = (mix(uFabric.x, uFabric.y, loose) - uPress) * uAmp.x * loose * (1.0 - hj);
  float hijab = (mix(uFabric.z, uFabric.w, loose) - uPress) * uAmp.y * loose * hj;
  p.y += dress + hijab;
  // the skirt spreads out sideways as she presses in
  p.x += (p.x - uCore.x) * uAmp.z * uPress * loose * (1.0 - hj);
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(p, 0.0, 1.0);
  vTexCoord = aTexCoord;
}`

const LAND_FRAG = `
precision mediump float;
uniform sampler2D uSprite;
uniform float uAlpha;
uniform vec3 uCool;
varying vec2 vTexCoord;
void main() {
  vec4 c = texture2D(uSprite, vTexCoord);
  gl_FragColor = vec4(c.rgb * uCool * c.a, c.a) * uAlpha;
}`

// The rise's pictures (rise.ts): the same wind-bent mesh idea as the landing, with two additions: loose fabric is displaced by how far
// her body moved a moment ago (uDrag*, already in picture px),
// and each picture is warped onto the landmarks' in-between positions (uM0-7), so two pictures morph into each other.
const RISE_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uModelViewMatrix, uProjectionMatrix;
uniform vec2 uDragA, uDragB, uDragH, uHead;
uniform float uHeadR;
uniform vec4 uM0, uM1, uM2, uM3, uM4, uM5, uM6, uM7, uM8, uM9, uM10, uM11, uM12, uM13; // landmarks: xy where it is on this picture, zw where the morph wants it
varying vec2 vTexCoord;

// inverse-distance blend of the landmarks' displacements (exact at each landmark)
void pull(vec2 p, vec4 M, inout vec2 acc, inout float ws) {
  vec2 d = p - M.xy;
  float d2 = dot(d, d);
  float w = 1.0 / (d2 * d2 + 1.0);
  acc += (M.zw - M.xy) * w;
  ws += w;
}

void main() {
  vec2 p = aPosition.xy;
  vec2 acc = vec2(0.0);
  float ws = 0.0;
  pull(p, uM0, acc, ws); pull(p, uM1, acc, ws); pull(p, uM2, acc, ws); pull(p, uM3, acc, ws);
  pull(p, uM4, acc, ws); pull(p, uM5, acc, ws); pull(p, uM6, acc, ws); pull(p, uM7, acc, ws);
  pull(p, uM8, acc, ws); pull(p, uM9, acc, ws); pull(p, uM10, acc, ws); pull(p, uM11, acc, ws); pull(p, uM12, acc, ws); pull(p, uM13, acc, ws);
  p += acc / ws;
  float loose = smoothstep(0.0, 1.0, aPosition.z);
  // 1 around her head and hijab, 0 on the skirt
  float hj = 1.0 - smoothstep(uHeadR, uHeadR * 2.1, length(p - uHead));
  p += mix(uDragA, uDragB, loose) * loose * (1.0 - hj) + uDragH * loose * hj;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(p, 0.0, 1.0);
  vTexCoord = aTexCoord;
}`

const RISE_FRAG = `
precision mediump float;
uniform sampler2D uSprite;
uniform float uAlpha;
varying vec2 vTexCoord;
void main() {
  vec4 c = texture2D(uSprite, vTexCoord);
  gl_FragColor = vec4(c.rgb * c.a, c.a) * uAlpha;
}`

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function skeletonDistance(skeleton: number[][][], X: number, Y: number) {
  let d = Infinity
  for (const limb of skeleton) for (let i = 0; i < limb.length - 1; i++) {
    const [ax, ay, ar] = limb[i], [bx, by, br] = limb[i + 1]
    const ex = bx - ax, ey = by - ay
    const s = clamp(((X - ax) * ex + (Y - ay) * ey) / (ex * ex + ey * ey), 0, 1)
    d = Math.min(d, Math.hypot(X - ax - ex * s, Y - ay - ey * s) - lerp(ar, br, s))
  }
  return d
}

/** where the landing is placed this frame (viewport px) */
export interface LandPlace {
  /** the falling sprite's centre must be moved by this (the descent toward the cloud) */
  offset: [number, number]
  /** the landing sprite: where her face is, how it is turned and its scale (px per sprite px) */
  anchor: [number, number]
  rot: number
  scale: number
  /** the cloud's landing zone centre in the viewport (before its rise/scale), and px per cloud-sprite px at rest */
  zone: [number, number]
  cloudK: number
  /** her height in px (for effect distances) */
  height: number
}

export interface LandingInput {
  vw: number
  vh: number
  /** the falling picture this frame: its centre as drawn by the fall (before the landing's offset), scale and rotation */
  fall: { gx: number; gy: number; scale: number; rot: number }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLanding(p: any, reduceMotion: boolean) {
  const C = LAND_CONFIG
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sprite: any = null, shader: any = null, geom: any = null, shadowImg: any = null
  let cloud: CloudSprites | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cloudImgs: { body: any; front: any; hollow: any; wisps: any[] } | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let poseImgs: { closed: any; open: any } | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let riseImgs: { img: any; geom: any; shadow: any; pad: number }[] | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let riseShader: any = null
  let disposed = false
  const wispRand = mulberry(31)
  const wisps = Array.from({ length: C.wisps.count }, (_, i) => ({
    // thrown out around her sides and below, a little up
    ang: (i / C.wisps.count) * Math.PI * 2 + (wispRand() - 0.5) * 0.5,
    delay: wispRand() * 0.22,
    reach: 0.6 + wispRand() * 0.5,
    size: 0.6 + wispRand() * 0.7,
    sprite: Math.floor(wispRand() * 8),
    spin: (wispRand() - 0.5) * 0.8,
  }))

  const loadHtml = (url: string) => { const im = new Image(); im.src = url; return im.decode().then(() => im) }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageFromCanvas = (cv: HTMLCanvasElement): any => {
    const im = p.createImage(cv.width, cv.height)
    im.loadPixels()
    im.pixels.set(cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data)
    im.updatePixels()
    return im
  }

  // the contact shadow: her own silhouette, softened and tinted the cloud's shade of blue
  const makeShadow = (img: HTMLImageElement, w = img.naturalWidth, h = img.naturalHeight) => {
    const pad = 24
    const cv = document.createElement('canvas')
    cv.width = w + pad * 2
    cv.height = h + pad * 2
    const g = cv.getContext('2d')!
    if ('filter' in g) g.filter = 'blur(7px)'
    g.drawImage(img, pad, pad, w, h)
    g.filter = 'none'
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = 'rgb(112,142,204)'
    g.fillRect(0, 0, cv.width, cv.height)
    return { cv, pad }
  }
  let shadowPad = 24

  /** loads her picture and builds the mesh and shader: the quick part, done with the rest of the sky's setup */
  async function load() {
    const [spr, html, closed, open] = await Promise.all([p.loadImage(landingGirlUrl), loadHtml(landingGirlUrl), p.loadImage(eyesCloseUrl), p.loadImage(eyesOpenUrl)])
    if (disposed) return
    sprite = spr
    poseImgs = { closed, open }
    const step = 6, cols = Math.ceil(LANDER.w / step), rows = Math.ceil(LANDER.h / step), verts: number[][] = []
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const x = Math.min(i * step, LANDER.w), y = Math.min(j * step, LANDER.h)
      const d = skeletonDistance(LANDER.skeleton, x, y)
      verts.push([x, y, smooth(0, LANDER.looseSpan, d), x / LANDER.w, y / LANDER.h])
    }
    geom = gridGeometry(p, cols, rows, verts)
    shader = p.createShader(LAND_VERT, LAND_FRAG)
    const sh = makeShadow(html, LANDER.w, LANDER.h)
    shadowPad = sh.pad
    shadowImg = imageFromCanvas(sh.cv)
    // the rise's pictures: each a mesh (fabric looseness by distance from her body) with its own contact shadow
    const urls = [eyesOpenUrl, startUrl, middleUrl, endUrl]
    const [htmls, imgs] = await Promise.all([Promise.all(urls.map(loadHtml)), Promise.all(urls.map((u) => p.loadImage(u)))])
    if (disposed) return
    riseImgs = POSES.map((P, k) => {
      const st = 6, cols = Math.ceil(P.w / st), rows = Math.ceil(P.h / st), vs: number[][] = []
      const span = P.w * 0.11
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const x = Math.min(i * st, P.w), y = Math.min(j * st, P.h)
        vs.push([x, y, smooth(0, span, skeletonDistance(P.skeleton, x, y)), x / P.w, y / P.h])
      }
      const g = gridGeometry(p, cols, rows, vs)
      const sh = makeShadow(htmls[k])
      return { img: imgs[k], geom: g, shadow: imageFromCanvas(sh.cv), pad: sh.pad }
    })
    riseShader = p.createShader(RISE_VERT, RISE_FRAG)
    // the heavy part (the cloud) are done later, in slices, while she is still asleep in the meadow
    const later = (fn: () => void) => new Promise<void>((r) => setTimeout(() => { if (!disposed) fn(); r() }, 60))
    await later(() => {
      cloud = paintCloud({ width: C.cloud.px[0], height: C.cloud.px[1], seed: 11, zone: C.cloud.zone, spread: C.cloud.spread })
    })
    await later(() => {
      cloudImgs = { body: imageFromCanvas(cloud!.body), front: imageFromCanvas(cloud!.front), hollow: imageFromCanvas(cloud!.hollow), wisps: cloud!.wisps.map(imageFromCanvas) }
    })
  }

  /** the girl's placement for this frame; the falling picture is moved by `offset`, the landing picture goes at `anchor` */
  function place(f: LandFrame, input: LandingInput): LandPlace {
    const { vw, vh, fall } = input
    const sc = fall.scale
    const gh = LANDER.h * sc // her height in px
    // where she comes to rest: her centre, lower than the middle so the cloud shows above and below her
    const restCentre: [number, number] = [vw / 2, vh * 0.52]
    const restFace: [number, number] = [
      restCentre[0] + (LANDER.face[0] - LANDER.centre[0]) * sc,
      restCentre[1] + (LANDER.face[1] - LANDER.centre[1]) * sc,
    ]
    // the face of the falling picture as the fall left it (the start of the landing): the descent runs from here to the cloud
    const c = Math.cos(fall.rot), s = Math.sin(fall.rot)
    const fx = (LANDER.fallFace[0] - LANDER.fallCentre[0]) * sc, fy = (LANDER.fallFace[1] - LANDER.fallCentre[1]) * sc
    const faceOfFall = (cx: number, cy: number): [number, number] => [cx + fx * c - fy * s, cy + fx * s + fy * c]
    const f0 = faceOfFall(fall.gx, fall.gy)
    // she touches down a hair above where she finally rests (she sinks in the rest of the way)
    const contactFace: [number, number] = [restFace[0], restFace[1] - C.impact.restSink * gh]
    const d = f.descend
    const offset: [number, number] = [(contactFace[0] - f0[0]) * d, (contactFace[1] - f0[1]) * d]
    const sinkPx = f.sink * gh
    const anchor: [number, number] = [faceOfFall(fall.gx + offset[0], fall.gy + offset[1])[0], faceOfFall(fall.gx + offset[0], fall.gy + offset[1])[1] + sinkPx]
    // turn from the falling picture's attitude (plus the head-turn difference) to her resting one as the descent ends
    const rot = lerp(fall.rot + LANDER.alignRot, 0, smooth(0, 1, f.settle)) + f.roll
    // the cloud's landing zone sits under her body at contact
    const zone: [number, number] = [restCentre[0], restCentre[1] + 0.12 * gh - C.impact.restSink * gh]
    const cloudK = (C.cloud.width * LANDER.w * sc) / C.cloud.px[0]
    return { offset, anchor, rot, scale: sc, zone, cloudK, height: gh }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const img = (im: any, x: number, y: number, w: number, h: number) => p.image(im, x, y, w, h)

  // the cloud's transform: its landing zone at `zone` (shifted up by the rise and by `lift`), `k * scale` px per cloud px
  function cloudTransform(f: LandFrame, pl: LandPlace, input: LandingInput, lift = 0, grow = 1) {
    const rise = f.cloudRise * input.vh
    p.translate(pl.zone[0], pl.zone[1] + rise - lift * pl.height)
    p.scale(pl.cloudK * f.cloudScale * grow)
    p.translate(-cloud!.zone.x, -cloud!.zone.y)
  }

  /** the cloud, its dent, her contact shadow and the wisps behind her (drawn before her) */
  function drawBehind(f: LandFrame, pl: LandPlace, input: LandingInput, hollowK = 1) {
    if (!cloud || !cloudImgs || !sprite || f.cloudAlpha <= 0) return
    const c = clamp(f.compress, -0.4, 1.2)
    const cmax = Math.max(0, c)
    p.push()
    p.noStroke()
    p.tint(255, 255 * f.cloudAlpha)
    p.push()
    cloudTransform(f, pl, input, 0, 1)
    img(cloudImgs.body, 0, 0, C.cloud.px[0], C.cloud.px[1])
    p.pop()
    // the dent under her deepens as she presses in, and the cloud widens round it
    {
      const zw = C.cloud.zone * C.cloud.px[0] * 1.5
      p.push()
      p.translate(pl.zone[0], pl.zone[1] + f.cloudRise * input.vh)
      p.scale(pl.cloudK * f.cloudScale * (1 + C.cloud.hollowGrow * cmax))
      p.tint(255, 255 * f.cloudAlpha * clamp(0.22 + 0.9 * cmax + 0.4 * f.closeness * (f.tau > 0 ? 1 : 0), 0, 1) * hollowK)
      img(cloudImgs.hollow, -zw / 2, -zw * 0.33, zw, zw * 0.66)
      p.pop()
    }
    // her shadow on the cloud: faint and far while she is high, close and dark when she touches
    if (f.shadow > 0.001) {
      const o = C.shadow.offset, far = 1 + (1 - f.closeness) * 3.2
      p.push()
      p.translate(pl.anchor[0], pl.anchor[1])
      p.rotate(pl.rot)
      p.scale(pl.scale * (1 + (1 - f.closeness) * 0.06))
      p.translate(-LANDER.face[0] + o[0] * LANDER.h * far, -LANDER.face[1] + o[1] * LANDER.h * far)
      p.tint(255, 255 * clamp(f.shadow, 0, 1) * f.cloudAlpha)
      img(shadowImg, -shadowPad, -shadowPad, LANDER.w + shadowPad * 2, LANDER.h + shadowPad * 2)
      p.pop()
    }
    drawWisps(f, pl, false)
    p.noTint()
    p.pop()
  }

  /** the near lobes of the cloud and the wisps in front of her (drawn after her) */
  function drawFront(f: LandFrame, pl: LandPlace, input: LandingInput) {
    if (!cloud || !cloudImgs || f.cloudAlpha <= 0) return
    const cmax = Math.max(0, f.compress)
    p.push()
    p.noStroke()
    p.tint(255, 255 * f.cloudAlpha)
    p.push()
    // the lobes round her lift and swell as she presses in (the cloud giving way), settling as it recovers
    cloudTransform(f, pl, input, C.cloud.lipLift * clamp(f.compress, -0.5, 1.1), 1 + 0.025 * cmax)
    img(cloudImgs.front, 0, 0, C.cloud.px[0], C.cloud.px[1])
    p.pop()
    drawWisps(f, pl, true)
    p.noTint()
    p.pop()
  }

  // little feathery wisps blown out of the cloud at the moment of contact: a pure function of the seconds since contact
  function drawWisps(f: LandFrame, pl: LandPlace, front: boolean) {
    if (reduceMotion || !cloudImgs || f.tau <= 0) return
    const W = C.wisps
    for (const w of wisps) {
      const nearSide = Math.sin(w.ang) > -0.2
      if (nearSide !== front) continue
      const age = f.tau - w.delay
      if (age <= 0 || age > W.life) continue
      const k = age / W.life
      const out = 1 - Math.exp(-age / 0.55)
      const a = Math.min(smooth(0, 0.1, k), 1) * (1 - smooth(0.2, 1, k)) * 0.6
      if (a <= 0.01) continue
      const r = W.reach * pl.height * w.reach * out
      // from round the cloud's edge of her body, along the cloud's surface (a flattened ring: it is seen from above)
      const ox = Math.cos(w.ang) * (0.3 * LANDER.w * pl.scale + r), oy = Math.sin(w.ang) * (0.12 * pl.height + r * 0.45) - r * 0.18
      const cx = pl.zone[0] + ox, cy = pl.zone[1] + 0.05 * pl.height + oy - 0.05 * pl.height * out
      const size = W.size * pl.height * w.size * (0.55 + 0.9 * out)
      // never over her head and face
      if (front && cy - size * 0.35 < pl.anchor[1] + 0.45 * pl.height) continue
      p.push()
      p.translate(cx, cy)
      p.rotate(w.spin * age)
      p.tint(255, 255 * a)
      img(cloudImgs.wisps[w.sprite], -size / 2, -size * 0.35, size, size * 0.7)
      p.pop()
    }
  }

  /** her landing picture, cross-fading to her eyes-closed and then her eyes-open pictures (drawn between the cloud's back and front) */
  function drawGirl(f: LandFrame, pl: LandPlace, alpha: number) {
    if (!sprite || !shader || !geom || alpha <= 0) return
    p.push()
    p.translate(pl.anchor[0], pl.anchor[1])
    p.rotate(pl.rot)
    p.scale(pl.scale)
    p.translate(-LANDER.face[0], -LANDER.face[1])
    // she compresses along her height at the press (about where she meets the cloud) and her skirt spreads
    const [px, py] = LANDER.pivot
    p.translate(px, py)
    p.scale(1 + f.squash * 0.5, 1 - f.squash)
    p.translate(-px, -py)
    p.noStroke()
    p.shader(shader)
    const L = LANDER.limbs
    shader.setUniform('uLimb0', [...L[0].from, ...L[0].to])
    shader.setUniform('uLimb1', [...L[1].from, ...L[1].to])
    shader.setUniform('uLimb2', [...L[2].from, ...L[2].to])
    shader.setUniform('uLimb3', [...L[3].from, ...L[3].to])
    shader.setUniform('uRad', L.map((l) => l.r))
    shader.setUniform('uAng', f.limbs)
    shader.setUniform('uFabric', f.fabric)
    shader.setUniform('uAmp', [C.cloth.dress, C.cloth.hijab, C.impact.spread])
    shader.setUniform('uHead', [122, 56])
    shader.setUniform('uCore', [182, 220])
    shader.setUniform('uHeadR', 58)
    shader.setUniform('uPress', clamp(f.compress, -0.5, 1.2))
    shader.setUniform('uSprite', sprite)
    shader.setUniform('uAlpha', alpha * (1 - f.closed))
    // a little of the cloud's blue ambient on her as she nears it
    const cool = 0.045 * f.closeness
    shader.setUniform('uCool', [1 - cool, 1 - cool * 0.5, 1])
    p.model(geom)
    p.resetShader()
    // the later pictures: eyes closed fades in over the startled one, then eyes open over that (same transform, aligned on her face)
    if (poseImgs && f.closed > 0.001) {
      const [fx, fy] = LANDER.face
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layer = (im: any, d: { w: number; h: number; face: [number, number]; scale: number }, a: number) => {
        if (a <= 0.003) return
        p.tint(255, 255 * a * alpha)
        img(im, fx - d.face[0] * d.scale, fy - d.face[1] * d.scale, d.w * d.scale, d.h * d.scale)
      }
      layer(poseImgs.closed, LANDER.poses.closed, f.closed * (1 - f.open))
      layer(poseImgs.open, LANDER.poses.open, f.open)
      p.noTint()
    }
    p.pop()
  }

  // a point of the landing sprite's frame (where the girl is drawn) in the viewport
  const landToView = (pl: LandPlace, x: number, y: number): [number, number] => {
    const c = Math.cos(pl.rot), s = Math.sin(pl.rot)
    const dx = (x - LANDER.face[0]) * pl.scale, dy = (y - LANDER.face[1]) * pl.scale
    return [pl.anchor[0] + dx * c - dy * s, pl.anchor[1] + dx * s + dy * c]
  }
  // a point of picture k (its own px) in the landing sprite's frame, for the rise's placement
  const poseToLand = (rf: RiseFrame, pt: number[], k: number): [number, number] => {
    const P = POSES[k], c = Math.cos(rf.place.rot), s = Math.sin(rf.place.rot), sc = layerScale(rf, k)
    const dx = (pt[0] - P.face[0]) * sc, dy = (pt[1] - P.face[1]) * sc
    return [rf.place.head[0] + dx * c - dy * s, rf.place.head[1] + dx * s + dy * c]
  }

  /** the dents the rise makes in the cloud (her hand, her feet) and her contact shadow (drawn after the cloud's back, before her) */
  function drawRiseBehind(f: LandFrame, rf: RiseFrame, pl: LandPlace, input: LandingInput) {
    if (!cloudImgs || !riseImgs) return
    p.push()
    p.noStroke()
    // her shadow: the pictures she is between, each fading with its own picture
    const o = C.shadow.offset
    const shadow = (k: number, a: number) => {
      if (a <= 0.003) return
      const R = riseImgs![k], P = POSES[k]
      p.push()
      p.translate(pl.anchor[0], pl.anchor[1])
      p.rotate(pl.rot)
      p.scale(pl.scale)
      p.translate(-LANDER.face[0] + o[0] * LANDER.h, -LANDER.face[1] + o[1] * LANDER.h)
      p.translate(rf.place.head[0], rf.place.head[1])
      p.rotate(rf.place.rot)
      p.scale(layerScale(rf, k))
      p.translate(-P.face[0], -P.face[1])
      p.tint(255, 255 * clamp(f.shadow * rf.shadow * a, 0, 1) * f.cloudAlpha)
      img(R.shadow, -R.pad, -R.pad, P.w + R.pad * 2, P.h + R.pad * 2)
      p.pop()
    }
    shadow(rf.from, 1 - rf.mix)
    shadow(rf.to, rf.mix)
    // the dents: the cloud's hollow sprite, small, under the hand and under the feet
    const zw = C.cloud.zone * C.cloud.px[0] * 1.5
    const dent = (pt: [number, number], press: number, size: number) => {
      if (press <= 0.003) return
      const [vx, vy] = landToView(pl, pt[0], pt[1])
      p.push()
      p.translate(vx, vy + f.cloudRise * input.vh)
      p.scale(pl.cloudK * f.cloudScale * (1 + C.cloud.hollowGrow * press))
      p.tint(255, 255 * f.cloudAlpha * clamp(0.15 + 0.85 * press, 0, 1))
      img(cloudImgs!.hollow, (-zw * size) / 2, (-zw * size * 0.66) / 2, zw * size, zw * size * 0.66)
      p.pop()
    }
    // the supporting hand (where it is in the picture she is mostly in), and the feet (between the two pictures' shoes)
    const hk = POSES[rf.to].hand ? rf.to : rf.from
    const hand = POSES[hk].hand
    if (hand) dent(poseToLand(rf, hand, hk), rf.hand, 0.3)
    const f0 = poseToLand(rf, POSES[rf.from].feet, rf.from)
    const f1 = poseToLand(rf, POSES[rf.to].feet, rf.to)
    dent([lerp(f0[0], f1[0], rf.mix), lerp(f0[1], f1[1], rf.mix) - 8], rf.feet, 0.5)
    p.noTint()
    p.pop()
  }

  /**
   * her rising, in the frame the landing draws her in: the picture she is leaving (all of it until the next has covered it) and
   * the next, the two morphed onto each other's landmarks and cross-dissolved. Both sit on the same face point and tilt, each at its own scale.
   */
  function drawRiseGirl(rf: RiseFrame, pl: LandPlace, alpha: number) {
    if (!riseImgs || !riseShader || alpha <= 0) return
    const MO = RISE_CONFIG.morph
    // where each landmark is between the two pictures, relative to her face, in landing px (each picture at its own scale)
    const A = POSES[rf.from], B = POSES[rf.to]
    const sA = RISE_CONFIG.keys[rf.from].scale, sB = RISE_CONFIG.keys[rf.to].scale
    const n = Math.min(A.marks.length, B.marks.length)
    const mid = A.marks.slice(0, n).map((a, i) => [
      lerp((a[0] - A.face[0]) * sA, (B.marks[i][0] - B.face[0]) * sB, rf.mix),
      lerp((a[1] - A.face[1]) * sA, (B.marks[i][1] - B.face[1]) * sB, rf.mix),
    ])
    // loose fabric: a displacement in landing px -> picture px (undo her tilt and scale)
    const c = Math.cos(-rf.place.rot), s = Math.sin(-rf.place.rot)
    const toPic = (d: number[], k: number) => [(d[0] * c - d[1] * s) / layerScale(rf, k), (d[0] * s + d[1] * c) / layerScale(rf, k)]
    const layer = (k: number, a: number) => {
      const dA = toPic(rf.drag[0], k), dB = toPic(rf.drag[1], k), dH = toPic(rf.drag[2], k)
      const P = POSES[k], M = riseImgs![k]
      p.push()
      p.translate(pl.anchor[0], pl.anchor[1])
      p.rotate(pl.rot)
      p.scale(pl.scale)
      p.translate(-LANDER.face[0], -LANDER.face[1])
      p.translate(rf.place.head[0], rf.place.head[1])
      p.rotate(rf.place.rot)
      p.scale(layerScale(rf, k))
      p.translate(-P.face[0], -P.face[1])
      p.noStroke()
      p.shader(riseShader)
      riseShader.setUniform('uSprite', M.img)
      riseShader.setUniform('uAlpha', alpha * a)
      const sk = RISE_CONFIG.keys[k].scale
      // landmarks this transition does not use sit far off the picture, where they pull on nothing
      for (let i = 0; i < 14; i++) {
        const m = i < n ? P.marks[i] : null
        riseShader.setUniform(`uM${i}`, m ? [m[0], m[1], P.face[0] + mid[i][0] / sk, P.face[1] + mid[i][1] / sk] : [-1e4, -1e4, -1e4, -1e4])
      }
      riseShader.setUniform('uDragA', dA)
      riseShader.setUniform('uDragB', dB)
      riseShader.setUniform('uDragH', dH)
      riseShader.setUniform('uHead', [P.face[0], P.face[1] - 4])
      riseShader.setUniform('uHeadR', P.w * 0.1)
      p.model(M.geom)
      p.resetShader()
      p.pop()
    }
    // the old picture stays whole under the next one as it fades in (no see-through gap), then fades out so none of it is left hanging
    if (rf.mix < 0.999) layer(rf.from, 1 - smooth(MO.fadeOut[0], MO.fadeOut[1], rf.mix))
    if (rf.mix > 0.001) layer(rf.to, smooth(MO.fadeIn[0], MO.fadeIn[1], rf.mix))
  }

  /** where her feet stand once she is up (viewport px, before the recede) and the standing picture's size (px per picture px) */
  function standingSpot(rf: RiseFrame, pl: LandPlace): { feet: [number, number]; scale: number } {
    const [lx, ly] = poseToLand(rf, POSES[3].feet, 3)
    return { feet: landToView(pl, lx, ly), scale: layerScale(rf, 3) * pl.scale }
  }

  return {
    load,
    standingSpot,
    drawRiseBehind,
    drawRiseGirl,
    /** true once the rise's pictures are ready */
    get riseReady() { return !!(riseImgs && riseShader) },
    place,
    drawBehind,
    drawGirl,
    drawFront,
    /** true once her picture, the shader and the cloud are ready to be drawn */
    get ready() { return !!(sprite && shader && geom && cloudImgs) },
    dispose() { disposed = true },
  }
}

export type Landing = ReturnType<typeof createLanding>
