// The hand-drawn meadow (ported from the handdrawn-meadow project's baked mode), drawn live with p5 in WEBGL:
// the watercolour ground, every grass blade and flower bending from its root in the gusts, the girl on a
// wind-bent mesh (her hijab, sleeves and hems ripple), petals blowing past and clouds drifting
// over with their shadows on the grass.
// As the page scrolls the camera closes in on her face, then a warm wave of light breaks the picture into
// dust (the dream): the frame is drawn into a framebuffer and sent through the wave shader.
// The sprites were painted by the meadow's sketch.js (pencil and watercolour on canvas)
// and saved as images, so nothing has to be painted while the page loads.
// Her glasses, hat, phone and bag lie on the grass around her (props.ts prepares them while the meadow loads).
// She starts awake (blinking now and then); once the camera has closed in, her eyes grow heavy and shut
// before the dream begins. The open and drowsy eyes are small patches laid over the closed-eyed picture.
// The dream wave carries the picture away into a dawn sky (it is revealed behind the wavefront), and she falls
// through it asleep: the same girl on the same mesh, her clothes blown up around her, clouds and petals rushing past.
// Once she has landed on a cloud (land.ts), a second wave through the same shader breaks the cloud scene into dust and reveals
// the plain About Me background (leave.ts), where she falls the rest of the way and sits down, dazed (touch.ts).

import p5 from 'p5'
import groundUrl from '@/assets/meadow/meadow.jpg'
import girlUrl from '@/assets/meadow/girl.webp'
import bagUrl from '@/assets/meadow/bag.webp'
import phoneUrl from '@/assets/meadow/phone.webp'
import wallpaperUrl from '@/assets/meadow/phone-wallpaper.webp'
import girlShadowUrl from '@/assets/meadow/girl-shadow.webp'
import eyesOpenUrl from '@/assets/meadow/girl-eyes-open.webp'
import eyesDrowsyUrl from '@/assets/meadow/girl-eyes-drowsy.webp'
import cloud0Url from '@/assets/meadow/cloud-0.webp'
import cloud1Url from '@/assets/meadow/cloud-1.webp'
import cloud2Url from '@/assets/meadow/cloud-2.webp'
import cloud0ShadowUrl from '@/assets/meadow/cloud-0-shadow.webp'
import cloud1ShadowUrl from '@/assets/meadow/cloud-1-shadow.webp'
import cloud2ShadowUrl from '@/assets/meadow/cloud-2-shadow.webp'
import bladesUrl from '@/assets/meadow/blades.json?url'
import { paintProps, paintPicture } from './props'
import { BAG_ITEMS, bagCamera, itemPose, type BagReveal } from './bagItems'
import { createLanding, LANDER } from './landing'
import type { LandPlace } from './landing'
import { landAt } from './land'
import { createDrop, ABOUT_BG } from './drop'
import { leaveFrame } from './leave'
import { createTouch, touchAt, TOUCH_CONFIG } from './touch'
import { createTris } from './tris'
import { gridGeometry } from './grid'
import type { FallFrame } from './fall'
import { DEPTH, FALL_ASSETS, FALL_CONFIG, FALLER, PATH, SKY_FRAG, SKY_FRAG_SHARP, SKY_LAYERS, SKY_VERT, createFallDynamics } from './fall'

export interface MeadowState {
  /** 0 = the whole meadow, 1 = closed in on her face. */
  zoom: number
  /** 0 = no effect, 0→1 = the dream wave crossing the frame. */
  dream: number
  /** 0→1 = falling through the sky, once the dream wave has passed. */
  fall: number
  /** 0→1 = the landing on the cloud, once the fall is over (land.ts). */
  land: number
  /** 0→1 = a second dream wave carries the cloud scene away into the About Me background, once the landing is over (LEAVE_CONFIG). */
  leave: number
  /** 0→1 = the rest of the way down onto the About Me surface, the landing and the seated, confused pose (touch.ts). */
  touch: number
  /** the bag reveal (bagItems.ts): the camera on the bag, the pointer over it, and how far out of it each item is */
  bag: BagReveal
}

/** where her head is on screen (viewport px) once she has landed, for the DOM effects around it (GirlFx.tsx); null while she is not on the surface */
export interface GirlAnchor {
  face: [number, number]
  headTop: number
  headW: number
  landed: number
  seated: number
}

export interface MeadowHandle {
  setVisible(visible: boolean): void
  dispose(): void
}

// The painting is a 736 x 920 scene; it covers the viewport, centred.
const W = 736
const H = 920
const SCENE_BG = [23, 55, 25]

// the girl, lying in the middle of the meadow (h in scene px, rot in radians)
const GIRL = { cx: W / 2, cy: H / 2 + 10, h: 370, rot: -0.1 }
const GIRL_PAD = 12
// her size in scene px, as placeGirl works it out in the meadow project
const GIRL_SIZE = { w: 223, h: 376 }
// her picture is laid on at this many px per scene px, so her face stays sharp when the camera closes in
const GIRL_DENSITY = 4
// her face, in scene px, and how wide it is
const FACE = { x: 388, y: 305, w: 40 }
// the face should end up about this large (fraction of the smaller viewport side)
const FACE_TARGET = 0.55
// where the eye patches sit on girl.webp (px)
const EYES_AT = { x: 698, y: 122 }
// she closes her eyes once the camera is this far in
const SLEEP_AT = 0.85
// falling asleep, in seconds: lids drop to drowsy, linger, then shut
const SLEEP = { drop: 0.3, hold: 0.55, shut: 0.45 }
// seconds into the animation at which poster.webp (shown while the meadow loads) was taken
const POSTER_T = 1.4

// Overall drift multiplier for the per-cloud speeds below
const CLOUD_SPEED = 1.6
// clouds (and their shadows) thin out to nothing as they reach her face, so it is never hidden:
// fully gone within FACE_CLEAR scene px of it, fully back FACE_FADE px further out
const FACE_CLEAR = 28
const FACE_FADE = 90
const CLOUD_SHADOW_OFFSET = { x: 22, y: 30 }

// cloud 1 starts just past her face (drifting away) rather than heading straight for it
const CLOUDS = [
  { x: 436, y: 19, w: 300, h: 261, speed: 7.531513089779764, bob: 3.2024422106333077, period: 25.963951760903, phase: 5.75885148010249, spr: cloud0Url, shadow: cloud0ShadowUrl },
  { x: 420, y: 94, w: 326, h: 296, speed: 5.457440826576203, bob: 3.14887864748016, period: 26.51416429504752, phase: 1.0580216181843394, spr: cloud1Url, shadow: cloud1ShadowUrl },
  { x: 366, y: 632, w: 370, h: 288, speed: 7.764432516414672, bob: 3.2858899985440075, period: 20.60981204919517, phase: 6.133561502907562, spr: cloud2Url, shadow: cloud2ShadowUrl },
]

// the fall: her width (fraction of the viewport, held to `h` of its height), hem travel (px on her picture) and
// tempo of the updraft in her clothes; how much deeper the blue looks by the end of the fall; the trail of mist
// above her (width as a fraction of the viewport, held to `trailH` of its height); and the bubbles round her
// (how many, and how far up they rise before they fade, in viewport heights). Her clothes only stream while the
// page is scrolling: `rush` is the scroll speed (dream + fall per second) at which they stream fully, and they catch
// the air in `rise` seconds and settle in `settle` seconds
// (the landing on the cloud is in land.ts, landing.ts, cloud.ts and face.ts)
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x))
// (the falling pose, path, sky layers and physics are in fall.ts)
const FALL = { rush: 0.25, rise: 0.12, settle: 0.7, w: 0.9, h: 0.64, deepen: 0.06, idle: 0.6 }
const WIND = { a: 0.22, amp: 10, k: 0.035, w: 2.6, pace: 0.35 } // direction (radians, blowing right), hem travel in px, ripple wavenumber, ripple speed, overall tempo (lower = slower, gentler breeze)
const windDir = [Math.cos(WIND.a), Math.sin(WIND.a)]

// her body as a stick figure in the 855 x 1461 pose space: [x, y, radius]; cloth beyond the radius is free to move
const SKELETON = [
  [[565, 92, 68], [560, 195, 30], [545, 330, 55], [500, 560, 50], [470, 700, 55], [380, 950, 42], [250, 1300, 30], [215, 1400, 50]],
  [[470, 250, 22], [150, 480, 18], [40, 535, 42]], // her left arm, out to the hand
  [[650, 270, 22], [775, 650, 22], [815, 735, 45]], // her right arm, the watch and hand
]

const GRASS = { amp: 6, hz: 0.3, seg: 5 } // tip travel in px for a 45 px blade in a full gust, natural sway frequency of a 40 px blade, segments per blade

const TWO_PI = Math.PI * 2
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
// deterministic pseudo-randoms: a hash of a number (0..1), and a seeded generator
const hash = (x: number) => { const v = Math.sin(x * 127.1) * 43758.5453; return v - Math.floor(v) }
const mulberry = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function easeStep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

// gust strength 0..1; gusts roll across the meadow along the wind, so far-downwind spots feel them later
// (the same formula runs in GUST_GLSL, keep the two in step)
function gust(t: number, x = 0, y = 0) {
  const tt = t - (x * windDir[0] + y * windDir[1]) / 260
  const n = 0.5 + 0.5 * (0.55 * Math.sin(tt * 0.53 + 1.3) + 0.3 * Math.sin(tt * 1.17 + 0.4) + 0.15 * Math.sin(tt * 2.31 + 2.1))
  return 0.3 + 0.7 * easeStep(0.32, 0.72, n) + 0.02 * Math.sin(tt * 5.1)
}

// girl-space point (scene px, unrotated) -> scene position
function girlToScene(u: number, v: number) {
  const c = Math.cos(GIRL.rot), s = Math.sin(GIRL.rot), x = u - GIRL_SIZE.w / 2, y = v - GIRL_SIZE.h / 2
  return [GIRL.cx + x * c - y * s, GIRL.cy + x * s + y * c]
}

// scene -> girl space, the inverse of girlToScene
function sceneToGirl(x: number, y: number) {
  const c = Math.cos(GIRL.rot), s = Math.sin(GIRL.rot), dx = x - GIRL.cx, dy = y - GIRL.cy
  return [dx * c + dy * s + GIRL_SIZE.w / 2, -dx * s + dy * c + GIRL_SIZE.h / 2]
}

// how loose the fabric is at girl-space (u, v): 0 on her body, face, hands and shoes, 1 at the far edge of a hem or sleeve
function looseness(u: number, v: number) {
  const X = (u / GIRL_SIZE.w) * (855 + 2 * GIRL_PAD) - GIRL_PAD, Y = (v / GIRL_SIZE.h) * (1461 + 2 * GIRL_PAD) - GIRL_PAD
  return easeStep(0, 90, skeletonDistance(SKELETON, X, Y))
}

// how far (X, Y) lies outside a stick figure's limbs
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

// her sprite's box in the scene (with an 18 px margin round her, clipped to the scene)
function girlBox() {
  const M = 18
  const corners = [[-M, -M], [GIRL_SIZE.w + M, -M], [-M, GIRL_SIZE.h + M], [GIRL_SIZE.w + M, GIRL_SIZE.h + M]].map(([u, v]) => girlToScene(u, v))
  const x0 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0])))), y0 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))))
  const x1 = Math.min(W, Math.ceil(Math.max(...corners.map((c) => c[0])))), y1 = Math.min(H, Math.ceil(Math.max(...corners.map((c) => c[1]))))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

// her picture (girl.webp, the same illustration at 0.867 scale shifted by (-107, -50) onto the 855 x 1461 pose space,
// with a GIRL_PAD margin) turned to lie in the meadow, as RGBA pixels at d px per scene px
// (with `eyes` laid over her face, and only the `crop` rect of the result, in sprite px, if given)
function girlPixels(
  gimg: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
  d: number,
  eyes?: HTMLImageElement,
  crop?: { x: number; y: number; w: number; h: number },
) {
  const SW = 855 + 2 * GIRL_PAD, SH = 1461 + 2 * GIRL_PAD
  const paint = document.createElement('canvas')
  paint.width = SW
  paint.height = SH
  const pctx = paint.getContext('2d')!
  pctx.imageSmoothingQuality = 'high'
  pctx.drawImage(gimg, GIRL_PAD - 107, GIRL_PAD - 50, gimg.naturalWidth * 0.867, gimg.naturalHeight * 0.867)
  if (eyes) pctx.drawImage(eyes, GIRL_PAD - 107 + EYES_AT.x * 0.867, GIRL_PAD - 50 + EYES_AT.y * 0.867, eyes.naturalWidth * 0.867, eyes.naturalHeight * 0.867)

  const cv = document.createElement('canvas')
  cv.width = box.w * d
  cv.height = box.h * d
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.scale(d, d)
  ctx.translate(GIRL.cx - box.x, GIRL.cy - box.y)
  ctx.rotate(GIRL.rot)
  ctx.drawImage(paint, -GIRL_SIZE.w / 2, -GIRL_SIZE.h / 2, GIRL_SIZE.w, GIRL_SIZE.h)
  const r = crop ?? { x: 0, y: 0, w: cv.width, h: cv.height }
  return ctx.getImageData(r.x, r.y, r.w, r.h).data
}

// the eye patches' rect in her sprite (px at density d), from where they sit on girl.webp
function eyeRect(eyes: HTMLImageElement, box: { x: number; y: number; w: number; h: number }, d: number) {
  const SW = 855 + 2 * GIRL_PAD, SH = 1461 + 2 * GIRL_PAD
  const toGirl = (x: number, y: number) => [((GIRL_PAD - 107 + x * 0.867) / SW) * GIRL_SIZE.w, ((GIRL_PAD - 50 + y * 0.867) / SH) * GIRL_SIZE.h]
  const { x, y } = EYES_AT, w = eyes.naturalWidth, h = eyes.naturalHeight
  const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b]) => girlToScene(...(toGirl(a, b) as [number, number])))
  const x0 = Math.floor((Math.min(...pts.map((q) => q[0])) - box.x) * d) - 2, y0 = Math.floor((Math.min(...pts.map((q) => q[1])) - box.y) * d) - 2
  const x1 = Math.ceil((Math.max(...pts.map((q) => q[0])) - box.x) * d) + 2, y1 = Math.ceil((Math.max(...pts.map((q) => q[1])) - box.y) * d) + 2
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

// how open her eyes are, from how long she has been falling asleep (0 = wide awake, 1 = fast asleep);
// 1 = open, 0.5 = drowsy, 0 = shut
function eyesAfter(s: number) {
  const { drop, hold, shut } = SLEEP
  if (s <= drop) return 1 - 0.5 * easeStep(0, drop, s)
  if (s <= drop + hold) return 0.5
  return 0.5 - 0.5 * easeStep(drop + hold, drop + hold + shut, s)
}

function loadHtmlImage(url: string) {
  const img = new Image()
  img.src = url
  return img.decode().then(() => img)
}

// gust() for the shaders (needs uniform vec2 uWind)
const GUST_GLSL = `
float gust(float t, vec2 p) {
  float tt = t - dot(p, uWind) / 260.0;
  float n = 0.5 + 0.5 * (0.55 * sin(tt * 0.53 + 1.3) + 0.3 * sin(tt * 1.17 + 0.4) + 0.15 * sin(tt * 2.31 + 2.1));
  return 0.3 + 0.7 * smoothstep(0.32, 0.72, n) + 0.02 * sin(tt * 5.1);
}`

// The wind's push, per vertex on the GPU: a steady lean downwind plus ripples running along the fabric
const CLOTH_VERT = `
precision highp float;
attribute vec3 aPosition;
attribute vec2 aTexCoord;
uniform mat4 uModelViewMatrix, uProjectionMatrix;
uniform float uTime, uAmp, uK, uW, uRipple, uPose;
uniform vec2 uWind, uOffset;
uniform vec4 uLimb0, uLimb1, uLimb2, uLimb3, uRad, uAng;
varying vec2 vTexCoord;

${GUST_GLSL}

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
  if (uPose > 0.5) {
    p = swing(p, uLimb0, uRad.x, uAng.x);
    p = swing(p, uLimb1, uRad.y, uAng.y);
    p = swing(p, uLimb2, uRad.z, uAng.z);
    p = swing(p, uLimb3, uRad.w, uAng.w);
  }
  float g = gust(uTime, p), A = uAmp * g * aPosition.z;
  float ph = dot(p, uWind) * uK - uTime * uW * (0.7 + 0.5 * g);
  float flutter = 0.5 * sin(p.x * 0.031 + uTime * 0.9) * sin(p.y * 0.027 - uTime * 0.7);
  // uRipple = 0 (falling): a steady lean with no waves running through the fabric
  float push = A * (0.55 + uRipple * (0.35 * sin(ph) + 0.25 * flutter));
  float side = A * uRipple * (0.3 * sin(ph * 1.4 + 1.3) + 0.5 * flutter);
  vec2 q = p + uWind * push + vec2(-uWind.y, uWind.x) * side + uOffset;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(q, 0.0, 1.0);
  vTexCoord = aTexCoord;
}`

const CLOTH_FRAG = `
precision mediump float;
uniform sampler2D uSprite, uShadow, uEyesOpen, uEyesDrowsy;
uniform vec4 uEyeRect;
uniform float uIsShadow, uEyes, uAlpha;
varying vec2 vTexCoord;
void main() {
  vec4 c = uIsShadow > 0.5 ? vec4(0.133, 0.22, 0.07, 0.47 * texture2D(uShadow, vTexCoord).a) : texture2D(uSprite, vTexCoord);
  // her eyes: shut (the sprite itself) -> drowsy -> open; falling, the other way: open -> half shut -> shut
  vec2 q = (vTexCoord - uEyeRect.xy) / uEyeRect.zw;
  if (uIsShadow < 0.5 && uEyes > 0.0 && q.x > 0.0 && q.y > 0.0 && q.x < 1.0 && q.y < 1.0) {
    vec4 drowsy = texture2D(uEyesDrowsy, q);
    c = uEyes < 0.5 ? mix(c, drowsy, uEyes * 2.0) : mix(drowsy, texture2D(uEyesOpen, q), uEyes * 2.0 - 1.0);
  }
  gl_FragColor = vec4(c.rgb * c.a, c.a) * uAlpha;
}`

const NOISE_GLSL = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}`

// Every grass stroke is a blade, a tapered ribbon along its painted curve. Its root is pinned (the upwind end) and
// it bends like a little cantilever, following the wind smoothed over the last second or so; gusts arrive in
// patches carried downwind (the same fronts that ripple her clothes), and bent blades show their paler sides.
const GRASS_VERT = `
precision highp float;
attribute vec3 aPosition, aNormal;
attribute vec2 aTexCoord;
attribute vec4 aVertexColor;
uniform mat4 uModelViewMatrix, uProjectionMatrix;
uniform float uTime, uSecs, uPace, uAmp, uHz;
uniform vec2 uWind;
varying vec4 vColor;
varying vec2 vUV;
varying float vAlong, vBend;
${GUST_GLSL}
${NOISE_GLSL}

// the wind on the meadow at p: the shared gust front, broken into patches that ride downwind with it
float windAt(vec2 p, float t) {
  vec2 side = vec2(-uWind.y, uWind.x);
  float along = dot(p, uWind) - t * 260.0, across = dot(p, side);
  float patch = 0.6 * vnoise(vec2(along / 210.0, across / 110.0)) + 0.4 * vnoise(vec2(along / 90.0, across / 60.0) + 7.3);
  return gust(t, p) * (0.45 + 1.1 * patch);
}

void main() {
  vec2 root = aNormal.xy;
  float len = aNormal.z, t = aPosition.z, seed = aTexCoord.y, h = aVertexColor.a;
  // the wind it feels, low-passed: a decaying memory of the last ~1.5 s
  float t0 = uTime - 0.1 * seed * uPace;
  float w = 0.4 * windAt(root, t0) + 0.3 * windAt(root, t0 - 0.5 * uPace) + 0.2 * windAt(root, t0 - 1.0 * uPace) + 0.1 * windAt(root, t0 - 1.5 * uPace);
  float hz = uHz * pow(40.0 / len, 0.3);
  float ph = 1.5 * vnoise(root / 70.0) + 0.15 * seed;
  float sway = (0.2 + 0.8 * w) * sin(6.2832 * (uSecs * hz + ph));
  float twist = (0.2 + 0.8 * w) * sin(6.2832 * (uSecs * hz * 0.7 + ph + 0.3));
  float give = uAmp * (len / 45.0) * mix(0.35, 1.0, h);
  // the painting already leans with an average breeze, so lean relative to that
  vec2 tip = give * (uWind * ((w - 0.6) + 0.12 * sway) + vec2(-uWind.y, uWind.x) * 0.06 * twist);
  vec2 q = aPosition.xy + tip * t * t;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(q, 0.0, 1.0);
  vColor = aVertexColor;
  vUV = aTexCoord;
  vAlong = t * len;
  vBend = clamp(w - 0.55, 0.0, 1.0) * mix(0.3, 1.0, h) * t;
}`

const GRASS_FRAG = `
precision highp float;
uniform float uKind;
varying vec4 vColor;
varying vec2 vUV;
varying float vAlong, vBend;
${NOISE_GLSL}
void main() {
  float a;
  vec3 c = vColor.rgb;
  if (uKind < 0.5) {
    // a pencil line: soft edges, and the paper's tooth breaking it up along its length
    float grain = 0.55 + 0.45 * vnoise(vec2(vAlong * 0.9, vUV.x * 1.5 + vUV.y * 50.0));
    a = 0.85 * (1.0 - smoothstep(0.45, 1.0, abs(vUV.x))) * grain;
    c = mix(c, c * 1.06 + vec3(0.035, 0.04, 0.02), vBend);
  } else {
    a = 0.92 * (1.0 - smoothstep(0.6, 1.0, vUV.x));
  }
  gl_FragColor = vec4(c * a, a);
}`

const POST_VERT = `
precision highp float;
attribute vec3 aPosition;
uniform mat4 uModelViewMatrix, uProjectionMatrix;
void main() { gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0); }`

// The dream: a warm wave of light runs out from the centre; the picture bends before it as if behind a lens,
// splits into its channels, and thins into scattered dust where the light bites hardest. Behind the front
// the sky shows through (tSky), so the dust settles into it.
const POST_FRAG = `
precision highp float;
uniform vec2 uRes;       // viewport, CSS px
uniform sampler2D tScene, tSky;
uniform vec2 uCentre;
uniform float uWave;     // wavefront radius, CSS px
uniform float uAmp;      // 0..1, bell over the whole transition
uniform float uRim;      // 0..1, the light's own curve
uniform float uDpr;
uniform float uSpan;     // viewport diagonal; every width below is a fraction of it

// how far the sky has replaced the meadow at this pixel (set in main)
float reveal;

// p5 framebuffers are stored top row first, so p (y down) maps straight onto the texture
vec3 scene(vec2 p) {
  return mix(texture2D(tScene, p / uRes).rgb, texture2D(tSky, p / uRes).rgb, reveal);
}

float hash(vec2 v) {
  return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453);
}

float sq(float x) { return x * x; }

void main() {
  vec2 p = vec2(gl_FragCoord.x / uDpr, uRes.y - gl_FragCoord.y / uDpr);
  vec2 d = p - uCentre;
  float r = length(d);
  vec2 out_ = r > 1.0 ? d / r : vec2(0.0, -1.0);
  reveal = smoothstep(uWave, uWave - uSpan * 0.2, r);

  // Where the wave is doing work: the soft front, plus the dust it leaves behind it.
  float ring = exp(-sq((r - uWave) / (uSpan * 0.24)));
  float wake = clamp((uWave - r) / (uSpan * 0.78), 0.0, 1.0);
  float settle = pow(1.0 - wake, 1.7);
  float band = clamp(uAmp * (ring * 0.80 + settle * 0.40 + 0.12), 0.0, 1.0);
  band = band * band * (3.0 - 2.0 * band);

  // Refraction: the picture bends before it breaks, as if the light carried a lens.
  float lens = ring * (1.0 - ring) * 4.0;
  float wob = sin(r / uSpan * 24.0) * 0.6 + sin(r / uSpan * 57.0 + 1.7) * 0.3;
  vec2 warp = out_ * (lens * 0.5 + ring * wob * 0.55) * uAmp * uSpan * 0.030;
  vec2 pw = p + warp;

  // Grains, not a mosaic: small cells thrown mostly in their own hashed direction.
  float px = mix(1.0, 6.5, band);
  vec2 blk = floor(pw / px);
  vec2 q = (blk + 0.5) * px;
  float a = hash(blk) * 6.2831853;
  vec2 dir = normalize(mix(vec2(cos(a), sin(a)), out_, 0.30));
  q += dir * (0.3 + hash(blk + 3.7)) * band * band * 15.0;
  vec2 sp = mix(pw, q, smoothstep(0.015, 0.5, band));

  // Grains drop out where the light bites hardest: they are read from further along their own
  // throw, so the picture thins into scattered dust instead of just blurring.
  float bite = smoothstep(0.22, 1.0, band) * 0.62;
  float gone = smoothstep(0.0, 0.35, bite - hash(blk + 5.5) * 0.9);
  sp += dir * gone * px * 3.0;

  // The picture splits slightly into its channels across the front.
  float ca = ring * uAmp * uSpan * 0.005;
  vec3 c = vec3(scene(sp + out_ * ca).r, scene(sp).g, scene(sp - out_ * ca).b);

  // Fine film grain and a whisper of dot screen.
  c += (hash(floor(p / 2.0) + 21.3) - 0.5) * band * 0.14;
  c += (smoothstep(0.42, 0.14, length(fract(p / 4.0) - 0.5)) - 0.35) * band * 0.045;

  // Sparse warm motes catching the light.
  vec2 mc = p / 6.0;
  float mote = smoothstep(0.992, 1.0, hash(floor(mc) + 41.0)) * ring
             * smoothstep(0.5, 0.18, length(fract(mc) - 0.5));
  c += vec3(1.0, 0.90, 0.68) * mote * uAmp * 1.1;

  // The light itself: a broad warm bloom.
  float bloom = exp(-sq((r - uWave) / (uSpan * 0.115)));
  float wash = smoothstep(uWave + uSpan * 0.10, uWave - uSpan * 0.30, r);
  c += vec3(1.0, 0.91, 0.74) * (bloom * 0.52 + wash * 0.10) * uRim;

  gl_FragColor = vec4(c, 1.0);
}`

interface Blade { x: number; y: number; a: number; len: number; bend: number; w: number; col: number[]; h: number }
interface Flower { x: number; y: number; r: number }

function unpackBlades(data: { blades: number[]; flowers: number[] }) {
  const blades: Blade[] = []
  const flowers: Flower[] = []
  for (let i = 0; i < data.blades.length; i += 10) {
    const [x, y, a, len, bend, w, cr, cg, cb, h] = data.blades.slice(i, i + 10)
    blades.push({ x, y, a, len, bend, w, col: [cr, cg, cb], h })
  }
  for (let i = 0; i < data.flowers.length; i += 3) {
    const [x, y, r] = data.flowers.slice(i, i + 3)
    flowers.push({ x, y, r })
  }
  return { blades, flowers }
}

// The blade's curve, as it was painted: a quadratic through its middle, pressure 0.6 -> 1.1 -> 0.36.
// Points run from the root (whichever end is upwind) to the tip.
function bladeCurve(b: Blade) {
  const dx = Math.cos(b.a), dy = Math.sin(b.a)
  const p0 = [b.x - dx * b.len / 2, b.y - dy * b.len / 2], p2 = [b.x + dx * b.len / 2, b.y + dy * b.len / 2]
  const m = [b.x - dy * b.bend, b.y + dx * b.bend]
  const c = [2 * m[0] - (p0[0] + p2[0]) / 2, 2 * m[1] - (p0[1] + p2[1]) / 2]
  const pts = []
  for (let k = 0; k <= GRASS.seg; k++) {
    const s = k / GRASS.seg, u = 1 - s
    const x = u * u * p0[0] + 2 * s * u * c[0] + s * s * p2[0], y = u * u * p0[1] + 2 * s * u * c[1] + s * s * p2[1]
    const tx = 2 * u * (c[0] - p0[0]) + 2 * s * (p2[0] - c[0]), ty = 2 * u * (c[1] - p0[1]) + 2 * s * (p2[1] - c[1])
    const tl = Math.hypot(tx, ty) || 1
    const pressure = 0.6 * u * (1 - 2 * s) + 1.1 * 4 * s * u + 0.36 * s * (2 * s - 1)
    pts.push({ x, y, nx: -ty / tl, ny: tx / tl, hw: Math.max(0.45, b.w * 0.75 * pressure) })
  }
  if (dx * windDir[0] + dy * windDir[1] < 0) pts.reverse()
  return pts
}

export function createMeadow(parent: HTMLElement, state: MeadowState, onReady?: () => void, onAnchor?: (a: GirlAnchor | null) => void): MeadowHandle {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let disposed = false
  let visible = true
  let ready = false
  let disposeLanding: (() => void) | null = null
  let dropper: ReturnType<typeof createDrop> | null = null
  let toucher: ReturnType<typeof createTouch> | null = null
  let anchored = false

  // p5 ships without type definitions, so the instance is untyped
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sketch = (p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let groundImg: any, cloth: any, faller: any, clouds: any[] = [], petals: any[] = []
    let blades: Blade[] = [], flowers: Flower[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let clothShader: any, grassShader: any, grassGeom: any, flowerGeom: any, postShader: any, fb: any, fbSky: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let skyImg: any, skyShader: any, skySharpShader: any, landing: ReturnType<typeof createLanding>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let props: { id?: string; x: number; y: number; rot: number; w: number; h: number; lift: number; spr: any; shadow: any }[] = []
    // the things in her bag (painted once, like the props), and how far the little lift under the pointer has come
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let bagItems: { w: number; h: number; spr: any; shadow: any }[] = []
    let bagHover = 0
    let animStart = 0, lastT = 0, shown = false
    // what the last still frame was drawn from (see p.draw)
    let stillKey = ''
    // seconds she has spent falling asleep (runs back when the camera pulls away), her next blink, and how open
    // her eyes are in it (1 = open), which she keeps on doing as she falls
    let sleepS = 0, lastMs = 0, nextBlink = 2, blinkAt = -1, blinkOpen = 1
    const dynamics = createFallDynamics()
    // the wind streaks' ribbons, rebuilt each frame (made once the renderer is up)
    let streakTris: ReturnType<typeof createTris> | null = null
    // wind streaks: seeded angles and phases, so their positions are a pure function of the distance fallen
    const streaks = makeStreaks()

    const imageFromPixels = (data: Uint8ClampedArray, w: number, h: number) => {
      const im = p.createImage(w, h)
      im.loadPixels()
      im.pixels.set(data)
      im.updatePixels()
      return im
    }

    // a grid over her sprite; each vertex carries how loose the fabric under it is in z, for CLOTH_VERT
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeCloth = (c: any) => {
      const step = 5, cols = Math.ceil(c.w / step), rows = Math.ceil(c.h / step), verts = []
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const x = c.x + Math.min(i * step, c.w), y = c.y + Math.min(j * step, c.h)
        verts.push([x, y, looseness(...(sceneToGirl(x, y) as [number, number])), (x - c.x) / c.w, (y - c.y) / c.h])
      }
      return { ...c, cols, rows, verts }
    }

    // the same for her falling picture, in its own px
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const makeFaller = (imgs: any) => {
      const step = 6, cols = Math.ceil(FALLER.w / step), rows = Math.ceil(FALLER.h / step), verts = []
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const x = Math.min(i * step, FALLER.w), y = Math.min(j * step, FALLER.h)
        verts.push([x, y, easeStep(0, FALLER.looseSpan, skeletonDistance(FALLER.skeleton, x, y)), x / FALLER.w, y / FALLER.h])
      }
      return { ...imgs, cols, rows, verts, eyeRect: [0, 0, 1, 1] }
    }

    // The baked cloud sprites and shadows are cut off at their boxes; fade their alpha out over the last
    // `edge` px on every side, so no straight edge shows when one drifts over her and the camera is close
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featherEdges = (im: any, edge: number) => {
      im.loadPixels()
      const w = im.pixels.length / 4 / im.height, h = im.height, px = im.pixels
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = Math.min(x, y, w - 1 - x, h - 1 - y)
        if (d < edge) px[(y * w + x) * 4 + 3] *= easeStep(0, edge, d)
      }
      im.updatePixels()
      return im
    }

    p.setup = async () => {
      p.createCanvas(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight, p.WEBGL)
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2))
      p.noLoop()

      const [ground, girlImg, eyesOpenImg, eyesDrowsyImg, girlShadow, fallingImg, skyPhoto, bladeData, bagImg, phoneImg, wallpaperImg, itemImgs, ...sprites] = await Promise.all([
        p.loadImage(groundUrl),
        loadHtmlImage(girlUrl),
        loadHtmlImage(eyesOpenUrl),
        loadHtmlImage(eyesDrowsyUrl),
        p.loadImage(girlShadowUrl),
        p.loadImage(FALL_ASSETS.girl),
        p.loadImage(FALL_ASSETS.sky),
        fetch(bladesUrl).then((r) => r.json()),
        loadHtmlImage(bagUrl),
        loadHtmlImage(phoneUrl),
        loadHtmlImage(wallpaperUrl),
        Promise.all(BAG_ITEMS.map((it) => loadHtmlImage(it.image))),
        ...CLOUDS.flatMap((c) => [p.loadImage(c.spr), p.loadImage(c.shadow)]),
      ])
      // the poster is on screen meanwhile; let the browser breathe between the heavier steps
      const breathe = () => new Promise((r) => setTimeout(r, 0))
      if (disposed) return
      groundImg = ground
      const cloudImgs = sprites
      clouds = CLOUDS.map((c, i) => ({ ...c, spr: featherEdges(cloudImgs[i * 2], 24), shadow: featherEdges(cloudImgs[i * 2 + 1], 16) }))
      const box = girlBox()
      const spr = imageFromPixels(girlPixels(girlImg, box, GIRL_DENSITY), box.w * GIRL_DENSITY, box.h * GIRL_DENSITY)
      const er = eyeRect(eyesOpenImg, box, GIRL_DENSITY)
      const sw = box.w * GIRL_DENSITY, sh = box.h * GIRL_DENSITY
      cloth = makeCloth({
        ...box,
        spr,
        shadow: girlShadow,
        eyesOpen: imageFromPixels(girlPixels(girlImg, box, GIRL_DENSITY, eyesOpenImg, er), er.w, er.h),
        eyesDrowsy: imageFromPixels(girlPixels(girlImg, box, GIRL_DENSITY, eyesDrowsyImg, er), er.w, er.h),
        eyeRect: [er.x / sw, er.y / sh, er.w / sw, er.h / sh],
      })
      faller = makeFaller({ spr: fallingImg })
      skyImg = skyPhoto
      await breathe()
      if (disposed) return
      const fromCanvas = (cv: HTMLCanvasElement) => imageFromPixels(cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height)
      props = paintProps({ bag: bagImg, phone: phoneImg, wallpaper: wallpaperImg }).map(({ sprite, shadow, ...rest }) => ({ ...rest, spr: fromCanvas(sprite), shadow: fromCanvas(shadow) }))
      bagItems = itemImgs.map((img, i) => {
        const { sprite, shadow, w, h } = paintPicture(img, BAG_ITEMS[i].height, 1, 0)
        return { w, h, spr: fromCanvas(sprite), shadow: fromCanvas(shadow) }
      })
      await breathe()
      if (disposed) return
      ;({ blades, flowers } = unpackBlades(bladeData))
      startDrift()
      buildGrass()
      await breathe()
      if (disposed) return
      clothShader = p.createShader(CLOTH_VERT, CLOTH_FRAG)
      skyShader = p.createShader(SKY_VERT, SKY_FRAG)
      skySharpShader = p.createShader(SKY_VERT, SKY_FRAG_SHARP)
      postShader = p.createShader(POST_VERT, POST_FRAG)
      fb = p.createFramebuffer({ depth: false })
      fbSky = p.createFramebuffer({ depth: false })
      // start the clock where the poster frame was taken, so the live meadow picks up from it
      animStart = p.millis() - POSTER_T * 1000
      ready = true
      if (visible) p.loop()
      // her landing picture, the cloud and the face painter load after the meadow is up (the cloud and face in slices, ~1 s of work)
      landing = createLanding(p, reduceMotion)
      disposeLanding = landing.dispose
      // the drop's wind lines are drawn past her as she falls onto the About Me surface (they need no pictures of their own)
      dropper = createDrop(p)
      toucher = createTouch(p)
      landing.load().then(() => toucher?.load())
    }

    p.windowResized = () => {
      stillKey = ''
      p.resizeCanvas(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight)
    }

    function startDrift() {
      animStart = p.millis()
      lastT = 0
      p.randomSeed(7)
      petals = Array.from({ length: 30 }, () => ({
        x: p.random(W), y: p.random(H), r: p.random(1.6, 3.2), k: p.random(0.6, 1.3), spin: p.random(0.5, 1.4), ph: p.random(TWO_PI),
      }))
    }

    p.draw = () => {
      if (!ready) return
      const dream = clamp(state.dream, 0, 1)
      // Once the dream wave has passed, the frame is a pure function of the scroll and of what has loaded (only the meadow runs on
      // the clock): while none of that changes the canvas keeps the last frame (p5 preserves its drawing buffer) and nothing is redrawn
      if (dream >= 1 && shown) {
        const key = [state.fall, state.land, state.leave, state.touch, p.width, p.height, !!landing?.ready, !!toucher?.ready].join()
        if (key === stillKey) return
        stillKey = key
      } else stillKey = ''
      const t = (p.millis() - animStart) / 1000
      const eyes = eyesNow()

      const meadowFrame = () => {
        p.background(SCENE_BG[0], SCENE_BG[1], SCENE_BG[2])
        p.push()
        p.translate(-p.width / 2, -p.height / 2)
        applyCamera()
        drawDrift(t, eyes)
        p.pop()
      }
      const skyFrame = () => {
        p.push()
        p.translate(-p.width / 2, -p.height / 2)
        drawSky(t, 1)
        p.pop()
      }

      const leave = clamp(state.leave, 0, 1)
      let touching = false
      const aboutFrame = () => {
        p.push()
        p.translate(-p.width / 2, -p.height / 2)
        touching = drawAbout(leave)
        p.pop()
      }

      if (leave >= 1) aboutFrame()
      else if (leave > 0) {
        // the second wave carries the cloud scene away into the About Me background, through the same two buffers
        fb.begin()
        p.clear()
        skyFrame()
        fb.end()
        fbSky.begin()
        p.clear()
        aboutFrame()
        fbSky.end()
        drawDream(leave)
      } else if (dream <= 0) meadowFrame()
      else if (dream >= 1) skyFrame()
      else {
        // the wave carries the meadow away into the sky: both are drawn, and mixed behind the front
        fb.begin()
        p.clear()
        meadowFrame()
        fb.end()
        fbSky.begin()
        p.clear()
        skyFrame()
        fbSky.end()
        drawDream(dream)
      }
      if (anchored && !touching) {
        anchored = false
        onAnchor?.(null)
      }

      if (!shown) {
        shown = true
        // reveal the canvas only once its first frame is on screen, so nothing flashes
        requestAnimationFrame(() => !disposed && onReady?.())
      }
    }

    // The scene covers the viewport, centred; then the camera zooms around her face and slides it to the centre.
    function applyCamera() {
      const vw = p.width, vh = p.height
      const s0 = Math.max(vw / W, vh / H)
      const ox = (vw - W * s0) / 2, oy = (vh - H * s0) / 2
      // clicked: the camera closes in on her bag instead (the page does not scroll meanwhile)
      if (state.bag.cam > 0) {
        const c = bagCamera(vw, vh, state.bag.cam, { w: W, h: H }, s0, ox, oy)
        p.translate(c.tx, c.ty)
        p.scale(c.s)
        return
      }
      const fx = ox + FACE.x * s0, fy = oy + FACE.y * s0
      const k = clamp(state.zoom, 0, 1)
      const maxZoom = clamp((FACE_TARGET * Math.min(vw, vh)) / (FACE.w * s0), 3, 6)
      p.translate(fx + (vw / 2 - fx) * k, fy + (vh / 2 - fy) * k)
      p.scale(1 + (maxZoom - 1) * k)
      p.translate(-fx, -fy)
      p.translate(ox, oy)
      p.scale(s0)
    }

    function drawDream(t: number) {
      const vw = p.width, vh = p.height, span = Math.hypot(vw, vh)
      p.push()
      p.noStroke()
      p.shader(postShader)
      postShader.setUniform('tScene', fb)
      postShader.setUniform('tSky', fbSky)
      postShader.setUniform('uRes', [vw, vh])
      postShader.setUniform('uCentre', [vw / 2, vh / 2])
      postShader.setUniform('uWave', t * (span / 2) * 1.62)
      postShader.setUniform('uAmp', Math.pow(Math.sin(Math.PI * t), 1.15))
      postShader.setUniform('uRim', Math.pow(Math.sin(Math.PI * clamp(t / 0.9, 0, 1)), 0.55))
      postShader.setUniform('uDpr', p.pixelDensity())
      postShader.setUniform('uSpan', span)
      p.rect(-vw / 2, -vh / 2, vw, vh)
      p.resetShader()
      p.pop()
    }

    function drawDrift(t: number, eyes: number) {
      if (reduceMotion) t = 0
      const dt = Math.min(t - lastT, 0.1)
      lastT = t
      p.image(groundImg, 0, 0, W, H)
      drawGrass(t)
      drawProps()
      drawCloth(t, eyes)
      drawPetals(t, dt)
      for (const c of clouds) {
        // wrap so a cloud leaves fully on the right before re-entering from the left
        const span = W + c.w
        const x = ((c.x + c.speed * CLOUD_SPEED * t + c.w) % span) - c.w
        const y = c.y + c.bob * (Math.sin((t / c.period) * TWO_PI + c.phase) - Math.sin(c.phase))
        // distance from her face to the cloud-plus-shadow box
        const dx = Math.max(x - FACE.x, 0, FACE.x - (x + c.w + CLOUD_SHADOW_OFFSET.x))
        const dy = Math.max(y - FACE.y, 0, FACE.y - (y + c.h + CLOUD_SHADOW_OFFSET.y))
        const a = easeStep(FACE_CLEAR, FACE_CLEAR + FACE_FADE, Math.hypot(dx, dy))
        if (a <= 0) continue
        p.tint(40, 70, 20, 60 * a)
        p.image(c.shadow, x + CLOUD_SHADOW_OFFSET.x, y + CLOUD_SHADOW_OFFSET.y, c.w, c.h)
        p.tint(255, 255 * a)
        p.image(c.spr, x, y, c.w, c.h)
        p.noTint()
      }
    }

    // ---------- the girl in the wind ----------

    // Awake she blinks every few seconds; once the camera is in close she drifts off, and wakes again
    // (twice as fast) if it pulls back out. Real time, not scroll, so the lids never move mechanically.
    function eyesNow() {
      const ms = p.millis(), dt = Math.min((ms - lastMs) / 1000, 0.1), now = ms / 1000
      lastMs = ms
      const asleep = state.zoom >= SLEEP_AT || state.dream > 0
      const total = SLEEP.drop + SLEEP.hold + SLEEP.shut
      if (reduceMotion) sleepS = asleep ? total : 0
      else sleepS = clamp(sleepS + (asleep ? dt : -2 * dt), 0, total)
      blinkOpen = 1
      if (!reduceMotion) {
        if (blinkAt < 0 && (nextBlink -= dt) <= 0) blinkAt = now
        if (blinkAt >= 0) {
          // falling, she is frightened: quick, frequent blinks, often a rapid flutter of two or three, her eyes
          // snapping wide in between
          const scared = state.dream > 0
          const b = (now - blinkAt) / (scared ? 0.15 : 0.24)
          if (b >= 1) {
            blinkAt = -1
            if (scared) nextBlink = Math.random() < 0.5 ? 0.06 : 0.5 + Math.random() * 1.1
            else nextBlink = Math.random() < 0.2 ? 0.15 : 2.5 + Math.random() * 3 // now and then a double blink
          } else blinkOpen = Math.abs(1 - 2 * b) ** 0.8
        }
      }
      const eyes = eyesAfter(sleepS)
      return sleepS === 0 ? Math.min(eyes, blinkOpen) : eyes
    }

    // In the meadow the breeze blows along windDir and she has her shadow on the grass; falling (her falling
    // picture, `faller`), the updraft blows along `wind` (in its own frame) at the FALL strength, with no ground
    // to shade, its own lids blinking over her open eyes, and the updraft at `gust` (0..1) of its strength
    function drawCloth(t: number, eyes: number, wind?: number[], gust = 1, alpha = 1, limbs?: number[]) {
      const falling = !!wind, body = falling ? faller : cloth
      if (!body.geom) body.geom = gridGeometry(p, body.cols, body.rows, body.verts)
      p.noStroke()
      p.shader(clothShader)
      const cl = FALL_CONFIG.cloth
      clothShader.setUniform('uTime', t * (falling ? FALL_CONFIG.clothPace : WIND.pace))
      clothShader.setUniform('uAmp', reduceMotion ? 0 : falling ? cl.amp * gust : WIND.amp)
      clothShader.setUniform('uRipple', falling ? cl.ripple : 1)
      clothShader.setUniform('uAlpha', alpha)
      clothShader.setUniform('uK', falling ? cl.k : WIND.k)
      clothShader.setUniform('uW', falling ? cl.w : WIND.w)
      clothShader.setUniform('uPose', falling ? 1 : 0)
      const L = FALLER.limbs, lim = (i: number) => [...L[i].from, ...L[i].to]
      clothShader.setUniform('uLimb0', lim(0))
      clothShader.setUniform('uLimb1', lim(1))
      clothShader.setUniform('uLimb2', lim(2))
      clothShader.setUniform('uLimb3', lim(3))
      clothShader.setUniform('uRad', L.map((l) => l.r))
      clothShader.setUniform('uAng', limbs ?? [0, 0, 0, 0])
      clothShader.setUniform('uWind', wind ?? windDir)
      clothShader.setUniform('uSprite', body.spr)
      clothShader.setUniform('uShadow', cloth.shadow)
      clothShader.setUniform('uEyesOpen', falling ? faller.spr : cloth.eyesOpen)
      clothShader.setUniform('uEyesDrowsy', falling ? faller.spr : cloth.eyesDrowsy)
      clothShader.setUniform('uEyeRect', body.eyeRect)
      clothShader.setUniform('uEyes', falling ? 0 : eyes)
      // the shadow first, a little down and to the right, in dark green
      const passes = [[1, [5, 7]], [0, [0, 0]]] as const
      for (const [isShadow, off] of falling ? passes.slice(1) : passes) {
        clothShader.setUniform('uIsShadow', isShadow)
        clothShader.setUniform('uOffset', off)
        p.model(body.geom)
      }
      p.resetShader()
    }

    // ---------- the fall ----------

    // In viewport px. The dream clears onto a photographic sky; she hangs unstable for a moment, then gravity takes
    // over (fall.ts: a drag-limited acceleration), the cloud layers stream past at their own speeds, her limbs, fabric
    // and body react to the speed, and the camera shakes, tracks and rolls with her.
    function drawSky(t: number, eyes: number) {
      const vw = p.width, vh = p.height, fall = clamp(state.fall, 0, 1)
      const gw = Math.min(FALL.w * vw, (FALL.h * vh * FALLER.w) / FALLER.h), sc = gw / FALLER.w
      const gh = (gw * FALLER.h) / FALLER.w
      // she is there as soon as the dream has cleared a little; the path keyframes advance with the page scroll
      const enter = easeStep(0.15, 0.85, state.dream)
      const cyc = PATH.start * enter + (1 - PATH.start) * fall
      let k = 0
      while (k < PATH.keys.length - 2 && cyc >= PATH.keys[k + 1].at) k++
      const k0 = PATH.keys[k], k1 = PATH.keys[k + 1]
      const u = easeInOut(clamp((cyc - k0.at) / (k1.at - k0.at), 0, 1))
      // the whole fall is a pure function of the scroll: the same fall progress always gives the same frame.
      // Once the fall is over the landing (land.ts) takes the same clock on: the sky runs on at the speed the fall left it,
      // then slows to a stop as she meets the cloud
      const lf = state.land > 0 ? landAt(clamp(state.land, 0, 1), reduceMotion) : null
      const fr = dynamics.at(lf ? 1 + lf.skyExtra : fall)
      if (lf) {
        fr.u *= lf.skySpeed
        fr.air *= lf.skySpeed
        fr.shake = [fr.shake[0] * lf.skySpeed, fr.shake[1] * lf.skySpeed]
      }
      if (reduceMotion) fr.shake = [0, 0]
      const rot =lerp(k0.r, k1.r, u) * (Math.PI / 180) + fr.roll
      const gx = vw / 2 + lerp(k0.x, k1.x, u)
      const gy = vh / 2 + lerp(k0.y, k1.y, u) * gh
      const sc2 = sc * lerp(k0.s, k1.s, u)

      p.push()
      p.translate(fr.shake[0] * vh, fr.shake[1] * vh)
      // the sky layers behind her (a deeper blue as she goes down)
      const girl = [gx, gy, gw * (sc2 / sc) * 0.5, gh * (sc2 / sc) * 0.55]
      p.clearDepth()
      const vp = vanishPoint(fr)
      skyBackdrop(fr, vp, 1 + FALL.deepen * fall)
      for (const L of SKY_LAYERS) if (!L.front) skyLayer(L, fr, vp, girl)
      drawStreaks(fr, vp, gx, gy, gh * sc2, false)

      // The landing: the cloud swells up under her, she eases down onto it (the falling picture turns into the landing
      // one, aligned on her face), presses in, rebounds and settles; the camera knocks and pulls back. The cloud and her
      // landing picture are drawn in one camera (zoomed about the middle); the sky is far away and stays out of it.
      let pl: LandPlace | null = null
      if (lf && landing?.ready) pl = landing.place(lf, { vw, vh, fall: { gx, gy, scale: sc2, rot } })
      const fa = enter * (pl && lf ? 1 - easeStep(0.35, 1, lf.cross) : 1)
      p.push()
      if (lf && pl) {
        p.translate(vw / 2, vh / 2 + lf.camDy * vh)
        p.scale(lf.camZoom)
        p.translate(-vw / 2, -vh / 2)
        p.clearDepth()
        const li = { vw, vh, fall: { gx, gy, scale: sc2, rot } }
        landing.drawBehind(lf, pl, li)
        landing.drawGirl(lf, pl, easeStep(0, 0.65, lf.cross))
      }
      if (fa > 0.003) {
        const settle = lf ? lf.settle : 0
        p.clearDepth()
        p.push()
        p.translate(gx + (pl ? pl.offset[0] : 0), gy + (pl ? pl.offset[1] : 0))
        // turning in 3D gives the foreshortening; it relaxes as she lands
        p.rotateX(fr.pitch * (1 - settle))
        p.rotateY(fr.yaw * (1 - settle))
        p.scale(sc2)
        p.rotate(rot)
        p.translate(-FALLER.w / 2, -FALLER.h / 2)
        drawCloth(fr.clothT, eyes, [-Math.sin(rot), -Math.cos(rot)], fr.air, fa, fr.limbs.map((a) => a * (1 - settle)))
        p.pop()
      }
      if (lf && pl) landing.drawFront(lf, pl, { vw, vh, fall: { gx, gy, scale: sc2, rot } })
      p.pop()
      // the nearest wisps rush past the edges of the frame, in front of her but faded out over her body
      p.clearDepth()
      // while she lands the clear space is over her landing place (not where the fall left her), and the near wisps fade out
      let girlNow = girl
      if (pl) {
        const lw = LANDER.w * pl.scale, lh = LANDER.h * pl.scale
        girlNow = [pl.anchor[0] + (LANDER.centre[0] - LANDER.face[0]) * pl.scale, pl.anchor[1] + (LANDER.centre[1] - LANDER.face[1]) * pl.scale, lw * 0.95, lh * 0.95]
      }
      frontFade = lf ? 1 - 0.9 * lf.closeness : 1
      for (const L of SKY_LAYERS) if (L.front) skyLayer(L, fr, vp, girlNow)
      drawStreaks(fr, vp, gx, gy, gh * sc2, true)
      p.pop()
    }

    // ---------- the About Me surface ----------

    // In viewport px. The plain About Me background the second wave reveals, with her already falling into it on the right (the lines
    // flow past her as the wave crosses); then the touchdown (touch.ts) carries her down onto the surface. Returns whether she is on it,
    // having reported where her head is for the DOM effects around it.
    function drawAbout(leave: number) {
      const vw = p.width, vh = p.height
      p.background(ABOUT_BG[0], ABOUT_BG[1], ABOUT_BG[2])
      if (!toucher?.ready || !dropper) return false
      const df = leaveFrame(vw, vh)
      df.travel = 1.5 * leave
      const tf = touchAt(clamp(state.touch, 0, 1), df, TOUCH_CONFIG.surface * vh, vw * 0.97, vh, reduceMotion)
      p.clearDepth()
      toucher.drawSurface(tf, vw, vh)
      toucher.drawShadow(tf, vh)
      dropper.drawLines({ ...df, face: tf.fallFace, speed: tf.speed, travel: tf.travel }, df.base)
      p.clearDepth()
      toucher.draw(tf)
      if (state.touch <= 0) return false
      onAnchor?.({ face: tf.face, headTop: tf.headTop, headW: tf.headW, landed: tf.landed, seated: tf.seated })
      anchored = true
      return true
    }

    // Where the sky radiates from: a point above her centre that the camera sways around a little as she falls
    function vanishPoint(fr: FallFrame): [number, number] {
      const vw = p.width, vh = p.height
      return [vw / 2 + Math.sin(fr.s * 0.45) * DEPTH.sway * vw, vh * DEPTH.vanishY + Math.cos(fr.s * 0.31) * vh * 0.015]
    }

    // One draw of the sky shader: the photo magnified `zoom` times about the vanishing point `vp`, offset by `off` (px of tile)
    function skyQuad(vp: number[], tileH: number, zoom: number, off: number[], rot: number, blur: number, alpha: number, mask: boolean, hole: number, girl: number[]) {
      const vw = p.width, vh = p.height
      // unblurred (the backdrop, and the whole sky once it has stopped) needs one texture read, not six
      const sh = blur > 0 ? skyShader : skySharpShader
      p.noStroke()
      p.shader(sh)
      sh.setUniform('uTex', skyImg)
      sh.setUniform('uRes', [vw, vh])
      sh.setUniform('uCentre', vp)
      sh.setUniform('uTile', [(tileH * skyImg.width) / skyImg.height, tileH])
      sh.setUniform('uOff', off)
      sh.setUniform('uZoom', zoom)
      sh.setUniform('uRot', rot)
      sh.setUniform('uBlur', blur)
      sh.setUniform('uAlpha', alpha)
      sh.setUniform('uMask', mask ? 1 : 0)
      sh.setUniform('uHole', hole)
      sh.setUniform('uGirl', girl)
      p.rect(0, 0, vw, vh)
      p.resetShader()
    }

    // The far sky and haze: the photo itself, swelling slowly as she falls (a distant horizon barely moves)
    function skyBackdrop(fr: FallFrame, vp: number[], deepen: number) {
      const vw = p.width, vh = p.height
      const tileH = Math.max(vh, (vw * skyImg.height) / skyImg.width) * 1.15
      const zoom = deepen * fr.zoom * (1 + DEPTH.backdropGrow * (1 - Math.exp(-fr.travel * 0.12)))
      skyQuad(vp, tileH, zoom, [0, 0], fr.camRoll, 0, 1, false, 0, [0, 0, 1, 1])
    }

    // One cloud layer: `slices` copies of the photo flying toward the camera. Each slice's distance z runs far -> near
    // as the distance fallen grows, so its size (1/z) grows faster and faster as it nears the lens; it fades in at the far
    // end and out at the near end, and the next slice (with its own offset and angle, from a hash of its index) takes over,
    // so nothing pops or visibly repeats. Everything is computed from `fr.travel` alone, so it rewinds exactly.
    let frontFade = 1
    function skyLayer(L: (typeof SKY_LAYERS)[number], fr: FallFrame, vp: number[], girl: number[]) {
      const vw = p.width, vh = p.height
      const tileH = Math.max(vh, (vw * skyImg.height) / skyImg.width) * 1.15 * L.scale
      const tileW = (tileH * skyImg.width) / skyImg.height
      const ramp = 0.35 + 0.65 * Math.min(1, fr.u * 1.6)
      const blur = clamp(FALL_CONFIG.blur * L.speed * fr.u * (L.front ? 1.6 : 1), 0, 0.3)
      for (let i = 0; i < L.slices; i++) {
        const raw = fr.travel * L.speed * DEPTH.rate + L.phase + i / L.slices
        const n = Math.floor(raw), ph = raw - n
        const env = easeStep(0, 0.22, ph) * (1 - easeStep(0.72, 1, ph))
        const alpha = L.alpha * env * ramp * (L.front ? frontFade : 1)
        if (alpha < 0.01) continue
        const key = n * 7.31 + i * 13.7 + L.scale * 3.3
        const off = [(hash(key) - 0.5) * tileW * 2, (hash(key + 1) - 0.5) * tileH * 2]
        const zoom = 1 / lerp(L.zFar, L.zNear, ph)
        skyQuad(vp, tileH, zoom, off, hash(key + 2) * TWO_PI + fr.camRoll, blur, alpha, true, L.hole, girl)
      }
    }

    function makeStreaks() {
      const rand = mulberry(2024)
      const mk = (near: boolean) => ({ ang: rand() * TWO_PI, seed: rand(), v: 0.7 + rand() * 0.6, len: 0.5 + rand(), w: 0.6 + rand(), a: 0.4 + rand() * 0.6, near })
      return [
        ...Array.from({ length: DEPTH.streaks.back }, () => mk(false)),
        ...Array.from({ length: DEPTH.streaks.front }, () => mk(true)),
      ]
    }

    // Wind streaks: fine lines that fly out from the vanishing point toward the edges of the frame, accelerating and growing
    // longer and thicker as they near the lens (radius ~ rho^2), and strengthening as the fall speeds up. The back set is
    // faint behind her; the front set is brighter and fades out over her body. Positions come from the distance fallen only.
    function drawStreaks(fr: FallFrame, vp: number[], cx: number, cy: number, bodyH: number, front: boolean) {
      const rush = fr.u
      if (reduceMotion || rush < 0.02) return
      const vw = p.width, vh = p.height
      const rMax = Math.hypot(vw, vh) * 0.8, depth = fr.travel * DEPTH.streaks.rate
      p.noStroke()
      streakTris ??= createTris(p)
      streakTris.begin()
      for (const s of streaks) {
        if (s.near !== front) continue
        const raw = s.seed + depth * s.v, rho = raw - Math.floor(raw)
        const tail = Math.max(0, rho - (0.05 + 0.2 * rush) * s.len)
        const r1 = rho * rho * rMax, r0 = tail * tail * rMax
        const dx = Math.cos(s.ang + fr.camRoll), dy = Math.sin(s.ang + fr.camRoll)
        const hw = (front ? 1.8 : 1.1) * s.w * (0.3 + rho * 1.6)
        const hx = vp[0] + dx * r1, hy = vp[1] + dy * r1, tx = vp[0] + dx * r0, ty = vp[1] + dy * r0
        let a = s.a * rush * (front ? 0.55 : 0.32) * DEPTH.streaks.alpha * easeStep(0.08, 0.35, rho) * (1 - easeStep(0.9, 1, rho))
        if (front) {
          const d = Math.hypot(((hx + tx) / 2 - cx) / (bodyH * 0.35), ((hy + ty) / 2 - cy) / (bodyH * 0.5))
          a *= easeStep(0.7, 1.4, d)
        }
        if (a < 0.01) continue
        const px = -dy * hw, py = dx * hw, qx = px * 0.25, qy = py * 0.25
        const hi = [235, 245, 255, 255 * a], lo = [235, 245, 255, 0]
        const quad = [[hx - px, hy - py, hi], [hx + px, hy + py, hi], [tx - qx, ty - qy, lo], [hx + px, hy + py, hi], [tx + qx, ty + qy, lo], [tx - qx, ty - qy, lo]] as const
        for (const [x, y, c] of quad) streakTris.vertex(x, y, c[0], c[1], c[2], c[3])
      }
      streakTris.end()
    }

    // an image covering the viewport, centred, `zoom` times closer than just covering it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function coverImage(im: any, zoom: number) {
      const vw = p.width, vh = p.height, s = Math.max(vw / im.width, vh / im.height) * zoom
      p.image(im, (vw - im.width * s) / 2, (vh - im.height * s) / 2, im.width * s, im.height * s)
    }

    // ---------- her things on the grass ----------

    function drawProps() {
      // the pointer over the bag lifts it a little (its shadow slips further away)
      bagHover += (state.bag.hover - bagHover) * 0.18
      const hover = reduceMotion ? 0 : bagHover
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const draw = (im: any, q: (typeof props)[number], dx: number, dy: number, size = 1) => {
        p.push()
        p.translate(q.x + dx, q.y + dy)
        p.rotate(q.rot)
        p.image(im, (-q.w * size) / 2, (-q.h * size) / 2, q.w * size, q.h * size)
        p.pop()
      }
      const lift = (q: (typeof props)[number]) => (q.id === 'bag' ? hover : 0)
      p.tint(22, 42, 10, 120)
      for (const q of props) draw(q.shadow, q, q.lift * 0.7 + lift(q) * 2, q.lift + lift(q) * 4, 1 + lift(q) * 0.03)
      p.noTint()
      drawBagItems()
      for (const q of props) draw(q.spr, q, 0, -lift(q) * 3, 1 + lift(q) * 0.03)
    }

    // what is in her bag, floating out of it: drawn before the bag itself, so that the bag is in front while an item is still inside
    function drawBagItems() {
      const bag = props.find((q) => q.id === 'bag')
      if (!bag || !bagItems.length) return
      const poses = BAG_ITEMS.map((it, i) => ({ it, im: bagItems[i], u: state.bag.items[i] ?? 0 })).filter((o) => o.im && o.u > 0.001)
      const place = (o: (typeof poses)[number]) => ({ o, ...itemPose(o.it, o.u, reduceMotion) })
      const drawn = poses.map(place)
      const at = (im: any, x: number, y: number, rot: number, w: number, h: number) => {
        p.push()
        p.translate(x, y)
        p.rotate(rot)
        p.image(im, -w / 2, -h / 2, w, h)
        p.pop()
      }
      // each throws a shadow on the grass that slips away as it rises
      for (const d of drawn) {
        p.tint(22, 42, 10, 110 * d.alpha)
        at(d.o.im.shadow, bag.x + d.x + 5 * d.float, bag.y + d.y + 12 * d.float, d.rot, d.o.im.w * d.scale, d.o.im.h * d.scale)
      }
      for (const d of drawn) {
        p.tint(255, 255 * d.alpha)
        at(d.o.im.spr, bag.x + d.x, bag.y + d.y, d.rot, d.o.im.w * d.scale, d.o.im.h * d.scale)
      }
      p.noTint()
    }

    // ---------- grass in the wind ----------

    // A geometry filled in directly (one shared vertex per point, no shape pipeline): each vertex is
    // [x, y, z, nx, ny, nz, u, v, r, g, b, a] with the colour in 0..1, and faces index into the list
    const rawGeometry = (verts: number[][], faces: number[][], gid: string) => {
      const g = new p5.Geometry(undefined, undefined, undefined, p._renderer)
      g.gid = gid
      for (const v of verts) {
        g.vertices.push(p.createVector(v[0], v[1], v[2]))
        g.vertexNormals.push(p.createVector(v[3], v[4], v[5]))
        g.uvs.push(v[6], v[7])
        g.vertexColors.push(v[8], v[9], v[10], v[11])
      }
      g.faces = faces
      return g
    }

    // Per vertex: position = where it was painted, z = how far along the blade (0 root .. 1 tip),
    // normal = (root x, root y, blade length), uv = (across the blade -1..1, the blade's own random seed),
    // colour = its pencil colour, alpha = how high it stands (0 shaded stem .. 1 sunlit tip)
    function buildGrass() {
      const verts: number[][] = [], faces: number[][] = []
      for (const b of blades) {
        const pts = bladeCurve(b), root = pts[0], seed = p.random(), base = verts.length
        const [r, g, bl] = b.col.map((c) => c / 255)
        for (let k = 0; k <= GRASS.seg; k++) {
          const q = pts[k]
          for (const u of [1, -1]) verts.push([q.x + q.nx * q.hw * u, q.y + q.ny * q.hw * u, k / GRASS.seg, root.x, root.y, b.len, u, seed, r, g, bl, b.h])
        }
        // two triangles per segment, between points k (vertices 2k, 2k+1) and k+1
        for (let k = 0; k < GRASS.seg; k++) {
          const a = base + 2 * k
          faces.push([a, a + 1, a + 2], [a + 1, a + 3, a + 2])
        }
      }
      grassGeom = rawGeometry(verts, faces, 'meadow-grass')

      const fverts: number[][] = [], ffaces: number[][] = []
      const W8 = 251 / 255, W2 = 242 / 255
      for (const f of flowers) {
        const seed = p.random(), n = 8, base = fverts.length, R = f.r + 0.6
        fverts.push([f.x, f.y, 1, f.x, f.y, 30, 0, seed, W8, W8, W2, 1])
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TWO_PI
          fverts.push([f.x + Math.cos(a) * R, f.y + Math.sin(a) * R, 1, f.x, f.y, 30, 1, seed, W8, W8, W2, 1])
        }
        for (let k = 0; k < n; k++) ffaces.push([base, base + 1 + k, base + 1 + ((k + 1) % n)])
      }
      flowerGeom = rawGeometry(fverts, ffaces, 'meadow-flowers')
      grassShader = p.createShader(GRASS_VERT, GRASS_FRAG)
    }

    function drawGrass(t: number) {
      p.noStroke()
      p.shader(grassShader)
      grassShader.setUniform('uWind', windDir)
      grassShader.setUniform('uTime', t * WIND.pace)
      grassShader.setUniform('uPace', WIND.pace)
      grassShader.setUniform('uSecs', t)
      grassShader.setUniform('uAmp', reduceMotion ? 0 : GRASS.amp)
      grassShader.setUniform('uHz', GRASS.hz)
      grassShader.setUniform('uKind', 0)
      p.model(grassGeom)
      grassShader.setUniform('uKind', 1)
      p.model(flowerGeom)
      p.resetShader()
    }

    // little white petals torn off the meadow flowers, tumbling downwind faster in the gusts
    function drawPetals(t: number, dt: number) {
      if (reduceMotion) return
      p.noStroke()
      for (const q of petals) {
        const g = gust(t * WIND.pace, q.x, q.y), sp = (10 + 50 * g * g) * q.k
        q.x += (windDir[0] * sp + Math.sin(t * 0.6 + q.ph) * 7) * dt
        q.y += (windDir[1] * sp + Math.cos(t * 0.45 + q.ph) * 8) * dt
        if (q.x > W + 10) { q.x = -10; q.y = p.random(-60, H) }
        if (q.y > H + 10) { q.y = -10; q.x = p.random(-60, W) }
        p.push()
        p.translate(q.x, q.y)
        p.rotate(t * q.spin + q.ph)
        p.fill(70, 90, 40, 60)
        p.ellipse(1.5, 2.5, q.r * 2, q.r * 2 * Math.abs(Math.sin(t * q.spin + q.ph)) + 0.6)
        p.fill(252, 252, 244, 235)
        p.ellipse(0, 0, q.r * 2, q.r * 2 * Math.abs(Math.sin(t * q.spin + q.ph)) + 0.6)
        p.pop()
      }
    }

  }

  p5.disableFriendlyErrors = true
  const instance = new p5(sketch, parent)

  return {
    setVisible(v: boolean) {
      visible = v
      // the draw loop starts once setup has finished loading
      if (!ready) return
      if (v) instance.loop()
      else instance.noLoop()
    },
    dispose() {
      disposed = true
      disposeLanding?.()
      dropper?.dispose()
      toucher?.dispose()
      instance.remove()
    },
  }
}
