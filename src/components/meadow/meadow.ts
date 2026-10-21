// The hand-drawn meadow (ported from the handdrawn-meadow project's baked mode), drawn live with p5 in WEBGL:
// the watercolour ground, every grass blade and flower bending from its root in the gusts, the girl on a
// wind-bent mesh (her hijab, sleeves and hems ripple), petals blowing past and clouds drifting
// over with their shadows on the grass.
// As the page scrolls the camera closes in on her face, then a warm wave of light breaks the picture into
// dust (the dream): the frame is drawn into a framebuffer and sent through the wave shader.
// The sprites were painted by the meadow's sketch.js (pencil and watercolour on canvas)
// and saved as images, so nothing has to be painted while the page loads.
// Her glasses, hat and shoes lie on the grass beside her (props.ts paints them while the meadow loads).
// She starts awake (blinking now and then); once the camera has closed in, her eyes grow heavy and shut
// before the dream begins. The open and drowsy eyes are small patches laid over the closed-eyed picture.
// The dream wave carries the picture away into a dawn sky (it is revealed behind the wavefront), and she falls
// through it asleep: the same girl on the same mesh, her clothes blown up around her, clouds and petals rushing past.

import p5 from 'p5'
import groundUrl from '@/assets/meadow/meadow.jpg'
import girlUrl from '@/assets/meadow/girl.webp'
import girlShadowUrl from '@/assets/meadow/girl-shadow.webp'
import girlFallingUrl from '@/assets/meadow/girl-falling.webp'
import fallingWatchUrl from '@/assets/meadow/falling-watch.webp'
import fallingShoe0Url from '@/assets/meadow/falling-shoe-0.webp'
import fallingShoe1Url from '@/assets/meadow/falling-shoe-1.webp'
import fallingEyesHalfUrl from '@/assets/meadow/girl-falling-eyes-half.webp'
import fallingEyesShutUrl from '@/assets/meadow/girl-falling-eyes-shut.webp'
import eyesOpenUrl from '@/assets/meadow/girl-eyes-open.webp'
import eyesDrowsyUrl from '@/assets/meadow/girl-eyes-drowsy.webp'
import cloud0Url from '@/assets/meadow/cloud-0.webp'
import cloud1Url from '@/assets/meadow/cloud-1.webp'
import cloud2Url from '@/assets/meadow/cloud-2.webp'
import cloud0ShadowUrl from '@/assets/meadow/cloud-0-shadow.webp'
import cloud1ShadowUrl from '@/assets/meadow/cloud-1-shadow.webp'
import cloud2ShadowUrl from '@/assets/meadow/cloud-2-shadow.webp'
import bladesUrl from '@/assets/meadow/blades.json?url'
import { paintFallingGlasses, paintFallingRing, paintProps } from './props'
import { paintSky } from './sky'

export interface MeadowState {
  /** 0 = the whole meadow, 1 = closed in on her face. */
  zoom: number
  /** 0 = no effect, 0→1 = the dream wave crossing the frame. */
  dream: number
  /** 0→1 = falling through the sky, once the dream wave has passed. */
  fall: number
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
const FALL = { rush: 0.25, rise: 0.12, settle: 0.7, w: 0.9, h: 0.68, amp: 26, pace: 0.9, deepen: 0.06, trailW: 0.75, trailH: 0.85, bubbles: 46, bubbleRise: 0.4 }
// her falling picture (girl-falling.webp, px): its size, and her body as a stick figure ([x, y, radius]);
// her hijab, sleeves and skirt beyond it are free to blow.
// Her glasses, watch and shoes were painted out of it (scripts/falling-props.py); they start where they were (the
// glasses between the two lens centres, turned along them; the watch's and shoes' sprite boxes) and slip away from
// her as she falls. `eyes` is where the patches with her lids half down and shut sit, for her to blink with
const FALLER = {
  w: 1303,
  h: 940,
  glasses: { left: [128.9, 588.8], right: [172.5, 553.5] },
  watch: { x: 642, y: 536, w: 51, h: 54 },
  ring: { x: 749, y: 497, rot: -0.3 }, // on the ring finger of her hand at her hip
  shoes: [
    { x: 707, y: 85, w: 166, h: 141 },
    { x: 1119, y: 6, w: 124, h: 205 },
  ],
  eyes: { x: 98, y: 528, w: 90, h: 90 },
  skeleton: [
    [[150, 590, 95], [240, 640, 50], [420, 650, 80], [620, 640, 80], [800, 560, 90]],
    [[800, 560, 60], [820, 300, 40], [790, 150, 60]], // her legs, out to her shoes
    [[860, 520, 60], [1080, 300, 40], [1180, 110, 60]],
    [[420, 600, 30], [490, 420, 30], [540, 300, 50]], // her arms, out to her hands
    [[330, 620, 30], [370, 500, 25], [350, 430, 40]],
    [[600, 620, 30], [670, 560, 30], [730, 500, 45]],
  ],
}

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
uniform float uTime, uAmp, uK, uW;
uniform vec2 uWind, uOffset;
varying vec2 vTexCoord;

${GUST_GLSL}

void main() {
  vec2 p = aPosition.xy;
  float g = gust(uTime, p), A = uAmp * g * aPosition.z;
  float ph = dot(p, uWind) * uK - uTime * uW * (0.7 + 0.5 * g);
  float flutter = 0.5 * sin(p.x * 0.031 + uTime * 0.9) * sin(p.y * 0.027 - uTime * 0.7);
  float push = A * (0.55 + 0.35 * sin(ph) + 0.25 * flutter);
  float side = A * (0.3 * sin(ph * 1.4 + 1.3) + 0.5 * flutter);
  vec2 q = p + uWind * push + vec2(-uWind.y, uWind.x) * side + uOffset;
  gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(q, 0.0, 1.0);
  vTexCoord = aTexCoord;
}`

const CLOTH_FRAG = `
precision mediump float;
uniform sampler2D uSprite, uShadow, uEyesOpen, uEyesDrowsy;
uniform vec4 uEyeRect;
uniform float uIsShadow, uEyes;
varying vec2 vTexCoord;
void main() {
  vec4 c = uIsShadow > 0.5 ? vec4(0.133, 0.22, 0.07, 0.47 * texture2D(uShadow, vTexCoord).a) : texture2D(uSprite, vTexCoord);
  // her eyes: shut (the sprite itself) -> drowsy -> open; falling, the other way: open -> half shut -> shut
  vec2 q = (vTexCoord - uEyeRect.xy) / uEyeRect.zw;
  if (uIsShadow < 0.5 && uEyes > 0.0 && q.x > 0.0 && q.y > 0.0 && q.x < 1.0 && q.y < 1.0) {
    vec4 drowsy = texture2D(uEyesDrowsy, q);
    c = uEyes < 0.5 ? mix(c, drowsy, uEyes * 2.0) : mix(drowsy, texture2D(uEyesOpen, q), uEyes * 2.0 - 1.0);
  }
  gl_FragColor = vec4(c.rgb * c.a, c.a);
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

export function createMeadow(parent: HTMLElement, state: MeadowState, onReady?: () => void): MeadowHandle {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
  let disposed = false
  let visible = true
  let ready = false

  // p5 ships without type definitions, so the instance is untyped
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sketch = (p: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let groundImg: any, cloth: any, faller: any, clouds: any[] = [], petals: any[] = []
    let blades: Blade[] = [], flowers: Flower[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let clothShader: any, grassShader: any, grassGeom: any, flowerGeom: any, postShader: any, fb: any, fbSky: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let skyWater: any, skyTrail: any
    // bubbles round her: where they start (fractions of her size, from her middle), size, pace, and phase
    let bubbles: { u: number; v: number; r: number; k: number; ph: number }[] = []
    // her glasses, watch and shoes, in her falling picture's px (centre, size, turn), and how they drift off her: up
    // (viewport heights), sideways (viewport widths), and turning over (radians) by the end of the fall
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let slipping: { spr: any; x: number; y: number; w: number; h: number; rot: number; lift: number; drift: number; spin: number; ph: number; grow?: number }[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let props: { x: number; y: number; rot: number; w: number; h: number; lift: number; spr: any; shadow: any }[] = []
    let animStart = 0, lastT = 0, shown = false
    // seconds she has spent falling asleep (runs back when the camera pulls away), her next blink, and how open
    // her eyes are in it (1 = open), which she keeps on doing as she falls
    let sleepS = 0, lastMs = 0, nextBlink = 2, blinkAt = -1, blinkOpen = 1
    // falling: how hard the air is pulling at her clothes (0..1, from the scroll speed), the time their flutter has
    // run (it only runs while they stream), and how far through the dream and fall the last frame was
    let updraft = 0, updraftT = 0, lastDrop = -1

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
      const step = 12, cols = Math.ceil(FALLER.w / step), rows = Math.ceil(FALLER.h / step), verts = []
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
        const x = Math.min(i * step, FALLER.w), y = Math.min(j * step, FALLER.h)
        verts.push([x, y, easeStep(0, 120, skeletonDistance(FALLER.skeleton, x, y)), x / FALLER.w, y / FALLER.h])
      }
      const { x, y, w, h } = FALLER.eyes
      return { ...imgs, cols, rows, verts, eyeRect: [x / FALLER.w, y / FALLER.h, w / FALLER.w, h / FALLER.h] }
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

      const [ground, girlImg, eyesOpenImg, eyesDrowsyImg, girlShadow, fallingImg, watchImg, shoe0Img, shoe1Img, eyesHalfImg, eyesShutImg, bladeData, ...sprites] = await Promise.all([
        p.loadImage(groundUrl),
        loadHtmlImage(girlUrl),
        loadHtmlImage(eyesOpenUrl),
        loadHtmlImage(eyesDrowsyUrl),
        p.loadImage(girlShadowUrl),
        p.loadImage(girlFallingUrl),
        p.loadImage(fallingWatchUrl),
        p.loadImage(fallingShoe0Url),
        p.loadImage(fallingShoe1Url),
        p.loadImage(fallingEyesHalfUrl),
        p.loadImage(fallingEyesShutUrl),
        fetch(bladesUrl).then((r) => r.json()),
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
      faller = makeFaller({ spr: fallingImg, eyesHalf: eyesHalfImg, eyesShut: eyesShutImg })
      await breathe()
      if (disposed) return
      const fromCanvas = (cv: HTMLCanvasElement) => imageFromPixels(cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height)
      props = paintProps().map(({ sprite, shadow, ...rest }) => ({ ...rest, spr: fromCanvas(sprite), shadow: fromCanvas(shadow) }))
      const ring = paintFallingRing(), rg = FALLER.ring
      const glasses = paintFallingGlasses(), { left: gl, right: gr } = FALLER.glasses, wt = FALLER.watch
      const k = Math.hypot(gr[0] - gl[0], gr[1] - gl[1]) / glasses.lensGap
      slipping = [
        {
          spr: fromCanvas(glasses.sprite), x: (gl[0] + gr[0]) / 2, y: (gl[1] + gr[1]) / 2, w: glasses.w * k, h: glasses.h * k,
          rot: Math.atan2(gr[1] - gl[1], gr[0] - gl[0]), lift: 0.8, drift: -0.12, spin: 2.6, ph: 0.4,
        },
        { spr: watchImg, x: wt.x + wt.w / 2, y: wt.y + wt.h / 2, w: wt.w, h: wt.h, rot: 0, lift: 0.65, drift: 0.14, spin: -3.4, ph: 2.1 },
        // her ring, tiny on her finger, grows as it floats off so it can be seen
        { spr: fromCanvas(ring.sprite), x: rg.x, y: rg.y, w: ring.w, h: ring.h, rot: rg.rot, lift: 0.72, drift: 0.06, spin: 4.2, ph: 4.1, grow: 2 },
        // her shoes, heavier, rise least and kick out to either side
        ...[shoe0Img, shoe1Img].map((spr, i) => {
          const b = FALLER.shoes[i]
          return { spr, x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h, rot: 0, lift: [0.5, 0.42][i], drift: [-0.1, 0.12][i], spin: [-2.2, 1.9][i], ph: [3.3, 5.0][i] }
        }),
      ]
      await breathe()
      if (disposed) return
      const sky = paintSky()
      skyWater = fromCanvas(sky.water)
      skyTrail = fromCanvas(sky.trail)
      await breathe()
      if (disposed) return
      ;({ blades, flowers } = unpackBlades(bladeData))
      startDrift()
      buildGrass()
      await breathe()
      if (disposed) return
      clothShader = p.createShader(CLOTH_VERT, CLOTH_FRAG)
      postShader = p.createShader(POST_VERT, POST_FRAG)
      fb = p.createFramebuffer({ depth: false })
      fbSky = p.createFramebuffer({ depth: false })
      // start the clock where the poster frame was taken, so the live meadow picks up from it
      animStart = p.millis() - POSTER_T * 1000
      ready = true
      if (visible) p.loop()
    }

    p.windowResized = () => {
      p.resizeCanvas(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight)
    }

    function startDrift() {
      animStart = p.millis()
      lastT = 0
      p.randomSeed(7)
      petals = Array.from({ length: 30 }, () => ({
        x: p.random(W), y: p.random(H), r: p.random(1.6, 3.2), k: p.random(0.6, 1.3), spin: p.random(0.5, 1.4), ph: p.random(TWO_PI),
      }))
      bubbles = Array.from({ length: FALL.bubbles }, () => ({
        u: p.random(-1, 1), v: p.random(-1, 1), r: p.random(0.8, 3.2), k: p.random(0.6, 1.4), ph: p.random(),
      }))
    }

    p.draw = () => {
      if (!ready) return
      const dream = clamp(state.dream, 0, 1)
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
        drawSky(t, blinkOpen)
        p.pop()
      }

      if (dream <= 0) meadowFrame()
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
    function drawCloth(t: number, eyes: number, wind?: number[], gust = 1) {
      const falling = !!wind, body = falling ? faller : cloth
      if (!body.geom) {
        const { cols, rows, verts } = body
        body.geom = p.buildGeometry(() => {
          p.beginShape(p.TRIANGLES)
          for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
            const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1
            for (const k of [a, b, c, b, d, c]) p.vertex(...verts[k])
          }
          p.endShape()
        })
      }
      p.noStroke()
      p.shader(clothShader)
      clothShader.setUniform('uTime', t * (falling ? FALL.pace : WIND.pace))
      clothShader.setUniform('uAmp', reduceMotion ? 0 : falling ? FALL.amp * gust : WIND.amp)
      clothShader.setUniform('uK', WIND.k)
      clothShader.setUniform('uW', WIND.w)
      clothShader.setUniform('uWind', wind ?? windDir)
      clothShader.setUniform('uSprite', body.spr)
      clothShader.setUniform('uShadow', cloth.shadow)
      clothShader.setUniform('uEyesOpen', falling ? faller.eyesShut : cloth.eyesOpen)
      clothShader.setUniform('uEyesDrowsy', falling ? faller.eyesHalf : cloth.eyesDrowsy)
      clothShader.setUniform('uEyeRect', body.eyeRect)
      clothShader.setUniform('uEyes', falling ? 1 - eyes : eyes)
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

    // In viewport px. She drops into view as the dream clears, then falls on with the scroll, swaying,
    // slowly turning, deeper into the blue, the trail of mist she leaves billowing down behind her.
    function drawSky(t: number, eyes: number) {
      if (reduceMotion) t = 0
      const vw = p.width, vh = p.height, fall = clamp(state.fall, 0, 1)
      const gw = Math.min(FALL.w * vw, (FALL.h * vh * FALLER.w) / FALLER.h), sc = gw / FALLER.w
      const gx = vw / 2 + Math.sin(t * 0.37) * vw * 0.02
      const gy = lerp(-0.6 * gw, vh * 0.52, easeStep(0.2, 1, state.dream)) + fall * vh * 0.04 + Math.sin(t * 0.61) * vh * 0.012
      // she turns over a little as she falls; the updraft is straight up on screen, so her clothes billow up
      const rot = 0.08 - 0.16 * fall + Math.sin(t * 0.29) * 0.05
      // the air only pulls at her clothes while the page scrolls her down; still, they settle
      const dt = Math.min(p.deltaTime / 1000, 0.1), drop = state.dream + state.fall
      const pull = lastDrop < 0 || dt <= 0 ? 0 : clamp(Math.abs(drop - lastDrop) / dt / FALL.rush, 0, 1)
      lastDrop = drop
      updraft += (pull - updraft) * (1 - Math.exp(-dt / (pull > updraft ? FALL.rise : FALL.settle)))
      updraftT += dt * updraft

      coverImage(skyWater, 1 + FALL.deepen * fall + 0.01 * Math.sin(t * 0.2))
      drawTrail(t, gx, gy)
      p.push()
      p.translate(gx, gy)
      p.scale(sc)
      p.rotate(rot)
      p.translate(-FALLER.w / 2, -FALLER.h / 2)
      drawCloth(updraftT, eyes, [-Math.sin(rot), -Math.cos(rot)], updraft)
      p.pop()
      // a point on her picture, on screen
      const onScreen = (x: number, y: number) => {
        const u = (x - FALLER.w / 2) * sc, v = (y - FALLER.h / 2) * sc
        return [gx + u * Math.cos(rot) - v * Math.sin(rot), gy + u * Math.sin(rot) + v * Math.cos(rot)]
      }
      drawSlipping(t, fall, rot, sc, onScreen)
      drawBubbles(t, gx, gy, gw)
    }

    // an image covering the viewport, centred, `zoom` times closer than just covering it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function coverImage(im: any, zoom: number) {
      const vw = p.width, vh = p.height, s = Math.max(vw / im.width, vh / im.height) * zoom
      p.image(im, (vw - im.width * s) / 2, (vh - im.height * s) / 2, im.width * s, im.height * s)
    }

    // Her glasses, watch, ring and shoes slip off as she falls and float up away from her (light things fall slower than she
    // does), drifting apart and tumbling, until the end of the scroll carries them off the top of the sky
    function drawSlipping(t: number, fall: number, rot: number, sc: number, onScreen: (x: number, y: number) => number[]) {
      const vw = p.width, vh = p.height
      const off = easeStep(0.03, 1, fall)
      for (const q of slipping) {
        const [ax, ay] = onScreen(q.x, q.y)
        // just loose, they bob about in the air; further off, they turn over
        const loose = easeStep(0, 0.12, off)
        p.push()
        p.translate(ax + q.drift * vw * off + Math.sin(t * 0.9 + q.ph) * 10 * loose, ay - q.lift * vh * off + Math.cos(t * 0.7 + q.ph) * 6 * loose)
        p.rotate(rot + q.rot + q.spin * off + Math.sin(t * 1.3 + q.ph) * 0.3 * loose)
        const s = sc * (1 + (q.grow ?? 0.25) * off)
        p.image(q.spr, (-q.w * s) / 2, (-q.h * s) / 2, q.w * s, q.h * s)
        p.pop()
      }
    }

    // the trail of mist she leaves, coming down from above the view and ending at her, billowing a little
    // (in its own proportions where that runs its top off the top of the view, stretched taller where it would not)
    function drawTrail(t: number, gx: number, gy: number) {
      const tw = Math.min(FALL.trailW * p.width, FALL.trailH * p.height)
      const th = Math.max((tw * skyTrail.height) / skyTrail.width, gy + 0.1 * p.height)
      if (gy < 0) return
      // two passes, a little out of step, so it seems to stir
      for (const [k, a] of [[0, 235], [1, 90]]) {
        const sway = Math.sin(t * (0.23 + 0.11 * k) + k * 2) * tw * 0.03, grow = 1 + 0.03 * k * Math.sin(t * 0.31)
        p.tint(255, a)
        p.image(skyTrail, gx - (tw * grow) / 2 + sway, gy - th * grow, tw * grow, th * grow)
      }
      p.noTint()
    }

    // little bubbles round her, rising into the trail and fading as they go
    function drawBubbles(t: number, gx: number, gy: number, gw: number) {
      const vh = p.height, k = gw / 700
      for (const b of bubbles) {
        const age = (t * 0.12 * b.k + b.ph) % 1
        const x = gx + b.u * gw * 0.32 + Math.sin(age * 7 + b.ph * 9) * 6 * k, y = gy + b.v * gw * 0.18 - age * vh * FALL.bubbleRise
        const a = 220 * easeStep(0, 0.1, age) * (1 - easeStep(0.55, 1, age)), r = b.r * k * (1 + 0.6 * age)
        if (r < 2) {
          p.noStroke()
          p.fill(255, 255, 255, a)
          p.circle(x, y, r * 2)
        } else {
          p.noFill()
          p.stroke(255, 255, 255, a)
          p.strokeWeight(Math.max(1, r * 0.22))
          p.circle(x, y, r * 2)
          p.noStroke()
          p.fill(255, 255, 255, a)
          p.circle(x - r * 0.35, y - r * 0.35, r * 0.5)
        }
      }
      p.noStroke()
    }

    // ---------- her things on the grass ----------

    function drawProps() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const draw = (im: any, q: (typeof props)[number], dx: number, dy: number) => {
        p.push()
        p.translate(q.x + dx, q.y + dy)
        p.rotate(q.rot)
        p.image(im, -q.w / 2, -q.h / 2, q.w, q.h)
        p.pop()
      }
      p.tint(22, 42, 10, 120)
      for (const q of props) draw(q.shadow, q, q.lift * 0.7, q.lift)
      p.noTint()
      for (const q of props) draw(q.spr, q, 0, 0)
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
      instance.remove()
    },
  }
}
