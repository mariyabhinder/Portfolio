// WebGL "light wave" dust transition for the dream landing.
//
// The garden, girl, cloud shadows and clouds are composited in one WebGL pass (reading the live
// CSS animations so the drift stays in sync), then a post pass sends a warm wave of glow,
// refraction and pixel dust across the frame. While the canvas is live the DOM scene is hidden.

const VERT_LAYER = `#version 300 es
in vec2 aPos;
uniform vec4 uRect;     // x, y, w, h in unscaled scene px (y down)
uniform vec4 uUv;       // u0, v0, du, dv
uniform vec2 uRes;      // viewport, CSS px
uniform vec2 uOrigin;   // zoom origin
uniform float uZoom;
uniform vec2 uMove;
out vec2 vUv;
void main() {
  vec2 p = uRect.xy + aPos * uRect.zw;
  p = uOrigin + (p - uOrigin) * uZoom + uMove;
  vUv = uUv.xy + aPos * uUv.zw;
  gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}
`

const FRAG_LAYER = `#version 300 es
precision highp float;
uniform sampler2D tTex;
uniform float uOpacity;
in vec2 vUv;
out vec4 outColor;
void main() { outColor = texture(tTex, vUv) * uOpacity; }  // premultiplied
`

const VERT_POST = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAG_POST = `#version 300 es
precision highp float;

uniform vec2 uRes;       // viewport, CSS px
uniform sampler2D tScene;
uniform vec2 uCentre;
uniform float uWave;     // wavefront radius, CSS px
uniform float uAmp;      // 0..1, bell over the whole transition
uniform float uRim;      // 0..1, the light's own curve
uniform float uDpr;
uniform float uSpan;     // viewport diagonal; every width below is a fraction of it
out vec4 outColor;

vec3 scene(vec2 p) {
  return texture(tScene, vec2(p.x / uRes.x, 1.0 - p.y / uRes.y)).rgb;
}

float hash(vec2 v) {
  return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x / uDpr, uRes.y - gl_FragCoord.y / uDpr);
  vec2 d = p - uCentre;
  float r = length(d);
  vec2 out_ = r > 1.0 ? d / r : vec2(0.0, -1.0);

  // Where the wave is doing work: the soft front, plus the dust it leaves behind it.
  float ring = exp(-pow((r - uWave) / (uSpan * 0.24), 2.0));
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
  float bloom = exp(-pow((r - uWave) / (uSpan * 0.115), 2.0));
  float wash = smoothstep(uWave + uSpan * 0.10, uWave - uSpan * 0.30, r);
  c += vec3(1.0, 0.91, 0.74) * (bloom * 0.52 + wash * 0.10) * uRim;

  outColor = vec4(c, 1.0);
}
`

export interface DustState {
  /** Camera zoom around (originX, originY), then translated by (moveX, moveY). */
  zoom: number
  moveX: number
  moveY: number
  originX: number
  originY: number
  /** 0 = no effect, 0→1 = the wave crossing the frame. */
  t: number
}

export interface DustHandle {
  /** True while the canvas is showing the scene (the DOM scene is hidden). */
  readonly active: boolean
  setVisible(visible: boolean): void
  /** Re-read layout after the page or the layers changed size. */
  measure(): void
  dispose(): void
}

interface Layer {
  kind: 'garden' | 'girl' | 'cloud' | 'shadow'
  img: HTMLImageElement
  /** Element carrying the CSS animation. */
  anim: Animation | null
  /** Resting box in scene px. */
  box: { x: number; y: number; w: number; h: number }
  uv: [number, number, number, number]
  maxOpacity: number
  tex: WebGLTexture | null
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** cubic-bezier(0.42, 0, 0.58, 1), the CSS "ease-in-out" curve. */
function easeInOut(x: number) {
  const x1 = 0.42
  const x2 = 0.58
  const bez = (t: number, a: number, b: number) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (bez(mid, x1, x2) < x) lo = mid
    else hi = mid
  }
  const t = (lo + hi) / 2
  return bez(t, 0, 1)
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'shader')
  return shader
}

function program(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const p = gl.createProgram()
  if (!p) throw new Error('program')
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vert))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag))
  gl.bindAttribLocation(p, 0, 'aPos')
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link')
  return p
}

function toTexture(gl: WebGL2RenderingContext, img: HTMLImageElement) {
  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

function cssAnimation(el: Element) {
  return el.getAnimations().find((a) => 'animationName' in a) ?? null
}

function progressOf(anim: Animation | null) {
  const p = anim?.effect?.getComputedTiming().progress
  return typeof p === 'number' ? p : 0
}

export function createDreamDust(
  canvas: HTMLCanvasElement,
  camera: HTMLElement,
  image: HTMLElement,
  state: DustState,
): DustHandle | null {
  const ctx = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' })
  if (!ctx) return null
  const gl: WebGL2RenderingContext = ctx

  let layerProg: WebGLProgram
  let postProg: WebGLProgram
  try {
    layerProg = program(gl, VERT_LAYER, FRAG_LAYER)
    postProg = program(gl, VERT_POST, FRAG_POST)
  } catch {
    return null
  }

  const quad = gl.createVertexArray()
  gl.bindVertexArray(quad)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  // Unit quad for layers (two triangles) — the post pass reuses the first three as a fullscreen triangle.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const tri = gl.createVertexArray()
  gl.bindVertexArray(tri)
  const triBuf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  const uL = (n: string) => gl.getUniformLocation(layerProg, n)
  const uP = (n: string) => gl.getUniformLocation(postProg, n)
  const L = {
    rect: uL('uRect'), uv: uL('uUv'), res: uL('uRes'), origin: uL('uOrigin'),
    zoom: uL('uZoom'), move: uL('uMove'), opacity: uL('uOpacity'), tex: uL('tTex'),
  }
  const P = {
    res: uP('uRes'), scene: uP('tScene'), centre: uP('uCentre'), wave: uP('uWave'),
    amp: uP('uAmp'), rim: uP('uRim'), dpr: uP('uDpr'), span: uP('uSpan'),
  }

  // Offscreen scene target
  let sceneTex: WebGLTexture | null = null
  let fbo: WebGLFramebuffer | null = null
  let width = 0
  let height = 0
  let dpr = 1

  const layers: Layer[] = []
  let alive = true
  let ready = false
  let visible = true
  let active = false
  let raf = 0

  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    const d = Math.min(window.devicePixelRatio || 1, 2)
    if (w === width && h === height && d === dpr && sceneTex) return
    width = w
    height = h
    dpr = d
    canvas.width = Math.round(w * d)
    canvas.height = Math.round(h * d)
    if (sceneTex) gl.deleteTexture(sceneTex)
    if (fbo) gl.deleteFramebuffer(fbo)
    sceneTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, sceneTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    fbo = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0)
  }

  function collect() {
    const found: { kind: Layer['kind']; img: HTMLImageElement; animEl: Element; boxEl: HTMLElement; maxOpacity: number }[] = []
    const garden = image.querySelector<HTMLElement>('.dg-garden')
    const girl = image.querySelector<HTMLElement>('.dg-girl')
    const girlImg = girl?.querySelector<HTMLImageElement>('img:not(.face-layer)')
    const gardenImg = new Image()
    const bg = garden ? getComputedStyle(garden).backgroundImage : ''
    const url = /url\(["']?(.*?)["']?\)/.exec(bg)?.[1]
    if (!garden || !girl || !girlImg || !url) return null
    gardenImg.src = url
    found.push({ kind: 'garden', img: gardenImg, animEl: garden, boxEl: garden, maxOpacity: 1 })
    image.querySelectorAll<HTMLImageElement>('.dg-ground-shadows img').forEach((img) =>
      found.push({ kind: 'shadow', img, animEl: img, boxEl: img, maxOpacity: 0.24 }))
    found.push({ kind: 'girl', img: girlImg, animEl: girl, boxEl: girl, maxOpacity: 1 })
    image.querySelectorAll<HTMLImageElement>('.dg-girl-shadows img').forEach((img) =>
      found.push({ kind: 'shadow', img, animEl: img, boxEl: img, maxOpacity: 0.24 }))
    image.querySelectorAll<HTMLImageElement>('.dg-cloud-layer img').forEach((img) =>
      found.push({ kind: 'cloud', img, animEl: img, boxEl: img, maxOpacity: 0.96 }))
    return found
  }

  const found = collect()
  if (!found) return null

  function measure() {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i]
      const el = found![i].boxEl
      const box = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight }
      const ia = layer.img.naturalWidth / layer.img.naturalHeight
      layer.uv = [0, 0, 1, 1]
      if (layer.kind === 'garden') {
        // background-size: cover, centred
        if (box.w / box.h > ia) {
          const k = box.h / (box.w / ia)
          layer.uv = [0, (1 - k) / 2, 1, k]
        } else {
          const k = box.w / (box.h * ia)
          layer.uv = [(1 - k) / 2, 0, k, 1]
        }
      } else if (layer.kind === 'girl') {
        // object-fit: contain, centred
        const boxAspect = box.w / box.h
        if (ia > boxAspect) {
          const h = box.w / ia
          box.y += (box.h - h) / 2
          box.h = h
        } else {
          const w = box.h * ia
          box.x += (box.w - w) / 2
          box.w = w
        }
      }
      layer.box = box
    }
  }

  Promise.all(
    found.map((f) => f.img.decode().then(() => true, () => f.img.complete && f.img.naturalWidth > 0)),
  ).then((oks) => {
    if (!alive || gl.isContextLost() || !oks.every(Boolean)) return
    for (const f of found) {
      layers.push({
        kind: f.kind,
        img: f.img,
        anim: cssAnimation(f.animEl),
        box: { x: 0, y: 0, w: 0, h: 0 },
        uv: [0, 0, 1, 1],
        maxOpacity: f.maxOpacity,
        tex: toTexture(gl, f.img),
      })
    }
    resize()
    measure()
    ready = true
    schedule()
  })

  function frame() {
    raf = 0
    if (!alive || !ready || gl.isContextLost()) return
    resize()
    const vw = width
    const vh = height

    // 1. Scene into the offscreen target, with the camera zoom applied in the vertex stage.
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.09, 0.216, 0.098, 1) // #173719, the camera's own background
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(layerProg)
    gl.bindVertexArray(quad)
    gl.uniform2f(L.res, vw, vh)
    gl.uniform2f(L.origin, state.originX, state.originY)
    gl.uniform1f(L.zoom, state.zoom)
    gl.uniform2f(L.move, state.moveX, state.moveY)
    gl.uniform1i(L.tex, 0)
    gl.activeTexture(gl.TEXTURE0)

    for (const layer of layers) {
      let { x, y, w, h } = layer.box
      let opacity = 1
      const p = progressOf(layer.anim)
      if (layer.kind === 'garden') {
        // dgGrassBreeze: scale(1)→scale(1.035) translate(0.3%, -0.2%), ease-in-out, alternate
        const e = easeInOut(p)
        const s = lerp(1, 1.035, e)
        const cx = x + w / 2
        const cy = y + h / 2
        const tx = 0.003 * e * w
        const ty = -0.002 * e * h
        x = cx + s * (x - cx) + s * tx
        y = cy + s * (y - cy) + s * ty
        w *= s
        h *= s
      } else if (layer.kind === 'girl') {
        // dgGirlBreeze: translateY 0 → -5px → 0, ease-in-out each way
        y += -5 * easeInOut(1 - Math.abs(2 * p - 1))
      } else {
        // dgCloudDrift: translateX(-40vw → 145vw), fading in over the first 8% and out over the last 8%
        x += lerp(-0.4 * vw, 1.45 * vw, p)
        opacity = layer.maxOpacity * (p < 0.08 ? p / 0.08 : p > 0.92 ? (1 - p) / 0.08 : 1)
        if (opacity <= 0.001) continue
      }
      gl.bindTexture(gl.TEXTURE_2D, layer.tex)
      gl.uniform4f(L.rect, x, y, w, h)
      gl.uniform4f(L.uv, layer.uv[0], layer.uv[1], layer.uv[2], layer.uv[3])
      gl.uniform1f(L.opacity, opacity)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    // 2. Post pass to the canvas: the wave.
    gl.disable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(postProg)
    gl.bindVertexArray(tri)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, sceneTex)
    const span = Math.hypot(vw, vh)
    const t = clamp(state.t, 0, 1)
    gl.uniform2f(P.res, vw, vh)
    gl.uniform1i(P.scene, 0)
    gl.uniform2f(P.centre, vw / 2, vh / 2)
    gl.uniform1f(P.wave, t * (span / 2) * 1.62)
    gl.uniform1f(P.amp, Math.pow(Math.sin(Math.PI * t), 1.15))
    gl.uniform1f(P.rim, Math.pow(Math.sin(Math.PI * clamp(t / 0.9, 0, 1)), 0.55))
    gl.uniform1f(P.dpr, dpr)
    gl.uniform1f(P.span, span)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    if (!active) {
      // Hand over to the canvas only after its first frame is on screen, so nothing flashes.
      active = true
      requestAnimationFrame(() => {
        if (alive && active) camera.classList.add('dust-on')
      })
    }
    if (visible) schedule()
  }

  function schedule() {
    if (!raf && alive) raf = requestAnimationFrame(frame)
  }

  const onLost = (e: Event) => {
    e.preventDefault()
    ready = false
    active = false
    camera.classList.remove('dust-on')
  }
  canvas.addEventListener('webglcontextlost', onLost)

  return {
    get active() {
      return active
    },
    setVisible(v: boolean) {
      visible = v
      if (v) schedule()
    },
    measure() {
      if (ready) {
        measure()
        schedule()
      }
    },
    dispose() {
      alive = false
      cancelAnimationFrame(raf)
      canvas.removeEventListener('webglcontextlost', onLost)
      camera.classList.remove('dust-on')
    },
  }
}
