// Ported from the id-component project (src/components/id-card/lanyard.tsx). Changes: the strap colour is a prop, and
// `onMiss` reports a click that lands off the card (the meadow uses it to put the card down).

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* Lanyard badge: a hand-rolled position-based physics rope (anchor + 3 free nodes + card hang point)
   rendered with three.js. Tuned to the observed source: gravity 1, damping .5, elasticity .5, breeze .5,
   size .6, strapLength .5, strap #111, silver clip, glossy card, intro swing. */

const CARD = { width: 1.6, height: 2.25 };
const SIZE = 0.6;
const STRAP_LENGTH = 0.5;
const STRAP_WIDTH = 0.65;
const CORNER = 0.3;
const SUB = 1 / 960;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedRect(s: THREE.Shape | THREE.Path, x: number, y: number, w: number, h: number, r: number) {
  const k = r * 0.4477;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.bezierCurveTo(x + w - k, y, x + w, y + k, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.bezierCurveTo(x + w, y + h - k, x + w - k, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.bezierCurveTo(x + k, y + h, x, y + h - k, x, y + h - r);
  s.lineTo(x, y + r);
  s.bezierCurveTo(x, y + k, x + k, y, x + r, y);
}

function layout() {
  const { width, height } = CARD;
  const radius = lerp(0.03, 0.2 * Math.min(width, height), CORNER);
  const ringY = height / 2 - 0.055;
  return {
    width,
    height,
    radius,
    slot: { width: 0.34, height: 0.07, y: height / 2 - 0.13 },
    ringY,
    hangY: ringY + 0.095,
  };
}
type Layout = ReturnType<typeof layout>;

function cardGeometry(z: Layout) {
  const { width, height, radius, slot } = z;
  const shape = new THREE.Shape();
  roundedRect(shape, -width / 2 + 0.007, -height / 2 + 0.007, width - 0.014, height - 0.014, Math.max(radius - 0.007, 0.005));
  const hole = new THREE.Path();
  roundedRect(hole, -slot.width / 2 - 0.007, slot.y - slot.height / 2 - 0.007, slot.width + 0.014, slot.height + 0.014, slot.height / 2 + 0.007);
  shape.holes.push(hole);
  const body = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.007, bevelSegments: 5, curveSegments: 24 });
  body.translate(0, 0, -0.009);
  const face = new THREE.ShapeGeometry(shape, 24);
  const pos = face.getAttribute("position");
  const uv = face.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + width / 2) / width, (pos.getY(i) + height / 2) / height);
  uv.needsUpdate = true;
  return { body, face };
}

function clipGeometry(scale: number) {
  const shape = new THREE.Shape();
  const w = 1.16 * scale;
  roundedRect(shape, -w / 2 + 0.014, -0.061, w - 0.028, 0.122, 0.024);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 6, curveSegments: 10 });
  g.translate(0, 0, -0.01);
  return g;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawFace(canvas: HTMLCanvasElement, img: HTMLImageElement | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!img) return;
  const s = Math.max(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * s;
  const h = img.height * s;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
}

/** Procedural environment: bright soft-boxes on a dark backdrop, baked to a PMREM for reflections. */
function makeEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.035, 0.035, 0.04);
  const plane = new THREE.PlaneGeometry(1, 1);
  const mats: THREE.Material[] = [];
  const box = (v: number, pos: [number, number, number], scale: [number, number], rotZ = 0) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v), side: THREE.DoubleSide });
    mats.push(m);
    const mesh = new THREE.Mesh(plane, m);
    mesh.position.set(...pos);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    mesh.rotateZ(rotZ);
    scene.add(mesh);
  };
  box(2.6, [0, 4.5, 8], [9, 4]);
  box(6, [-5.5, 0.5, 7], [0.9, 14]);
  box(4, [5, -0.5, 8], [0.6, 14]);
  box(3.5, [0, -1, 9], [24, 0.35], Math.PI / 3);
  box(2.5, [1, 2.5, 9], [24, 0.2], Math.PI / 3);
  box(1.4, [0, 6, -6], [12, 4]);
  box(0.5, [0, -7, 1], [16, 6]);
  box(0.9, [8, 0, -2], [4, 10]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  plane.dispose();
  mats.forEach((m) => m.dispose());
  return target;
}

function strapNormalMap() {
  const rnd = mulberry(19);
  const noise = Float32Array.from({ length: 128 * 128 }, () => rnd());
  const bump = (x: number, y: number) => {
    const cx = ((x % 128) + 128) % 128;
    const cy = ((y % 128) + 128) % 128;
    const u = (cx / 128) * 8;
    const v = (cy / 128) * 8;
    const iu = Math.floor(u);
    const iv = Math.floor(v);
    const a = u - iu - 0.5;
    const b = v - iv - 0.5;
    const even = (iu + iv) % 2 === 0;
    const dome = (t: number) => Math.sqrt(Math.max(0, 1 - 4 * t * t));
    const p = dome(a) * (0.55 + 0.45 * Math.cos(b * Math.PI * (even ? 1 : 0.6)));
    const q = dome(b) * (0.55 + 0.45 * Math.cos(a * Math.PI * (even ? 0.6 : 1)));
    return (even ? Math.max(p, 0.7 * q) : Math.max(q, 0.7 * p)) + 0.08 * noise[128 * cy + cx];
  };
  const data = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const dx = (bump(x - 1, y) - bump(x + 1, y)) * 1.6;
      const dy = (bump(x, y - 1) - bump(x, y + 1)) * 1.6;
      const len = Math.hypot(dx, dy, 1);
      const o = (128 * y + x) * 4;
      data[o] = (dx / len * 0.5 + 0.5) * 255;
      data[o + 1] = (dy / len * 0.5 + 0.5) * 255;
      data[o + 2] = (1 / len * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, 128, 128);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

function cardNormalMap() {
  const rnd = mulberry(7);
  const noise = Float32Array.from({ length: 128 * 128 }, () => rnd());
  const avg = (x: number, y: number) => {
    let s = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) s += noise[(((y + j + 128) % 128) * 128) + ((x + i + 128) % 128)];
    return (s / 9) * 1.6;
  };
  const data = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const dx = avg((x - 1 + 128) % 128, y) - avg((x + 1) % 128, y);
      const dy = avg(x, (y - 1 + 128) % 128) - avg(x, (y + 1) % 128);
      const len = Math.hypot(dx, dy, 1);
      const o = (128 * y + x) * 4;
      data[o] = (dx / len * 0.5 + 0.5) * 255;
      data[o + 1] = (dy / len * 0.5 + 0.5) * 255;
      data[o + 2] = (1 / len * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, 128, 128);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 7);
  tex.needsUpdate = true;
  return tex;
}

/* ---------------- physics ---------------- */

type Body = {
  position: THREE.Vector3;
  previous: THREE.Vector3;
  velocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  previousQuaternion: THREE.Quaternion;
  angular: THREE.Vector3;
  mass: number;
  inverseInertia: THREE.Vector3;
  hang: THREE.Vector3;
};
type Grab = {
  local: THREE.Vector3;
  rotation: THREE.Quaternion;
  reach: number;
  from: THREE.Vector3;
  target: THREE.Vector3;
};
type Rope = {
  nodes: THREE.Vector3[];
  previous: THREE.Vector3[];
  velocities: THREE.Vector3[];
  lengths: Float64Array;
  impulses: Float64Array;
  rest: number;
  anchor: THREE.Vector3;
  body: Body;
  grab: Grab | null;
  turn: number;
  twist: number;
  twistRaw: number;
  calm: number;
};

const V = () => new THREE.Vector3();
const tmp = { a: V(), b: V(), c: V(), d: V(), e: V(), f: V(), g: V(), pin: V(), q: new THREE.Quaternion(), r: new THREE.Quaternion() };

/** World-space inverse-inertia applied to `vec`. */
function invInertia(body: Body, vec: THREE.Vector3, out: THREE.Vector3) {
  tmp.r.copy(body.quaternion).invert();
  out.copy(vec).applyQuaternion(tmp.r);
  out.set(out.x * body.inverseInertia.x, out.y * body.inverseInertia.y, out.z * body.inverseInertia.z);
  return out.applyQuaternion(body.quaternion);
}

function integrateQuat(q: THREE.Quaternion, w: THREE.Vector3) {
  const { x, y, z, w: s } = q;
  q.x += 0.5 * (w.x * s + w.y * z - w.z * y);
  q.y += 0.5 * (w.y * s + w.z * x - w.x * z);
  q.z += 0.5 * (w.z * s + w.x * y - w.y * x);
  q.w += 0.5 * (-w.x * x - w.y * y - w.z * z);
  q.normalize();
}

function effectiveInverseMass(body: Body, r: THREE.Vector3, n: THREE.Vector3) {
  const c = tmp.c.crossVectors(r, n);
  return 1 / body.mass + c.dot(invInertia(body, c, tmp.d));
}

function applyImpulse(body: Body, r: THREE.Vector3, impulse: THREE.Vector3) {
  body.position.addScaledVector(impulse, 1 / body.mass);
  integrateQuat(body.quaternion, invInertia(body, tmp.e.crossVectors(r, impulse), tmp.f));
}

function resetRope(rope: Rope, z: Layout, sideways: boolean) {
  const { nodes, previous, velocities, body, anchor } = rope;
  nodes[0].copy(anchor);
  for (let i = 1; i <= 4; i++) {
    nodes[i].copy(nodes[i - 1]);
    if (sideways) nodes[i].x += rope.rest;
    else nodes[i].y -= rope.rest;
  }
  body.quaternion.identity();
  if (sideways) body.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  body.hang.set(0, z.hangY, 0);
  const off = tmp.a.copy(body.hang).applyQuaternion(body.quaternion);
  body.position.copy(nodes[4]).sub(off);
  body.previous.copy(body.position);
  body.previousQuaternion.copy(body.quaternion);
  body.velocity.set(0, 0, 0);
  body.angular.set(0, 0, 0);
  for (let i = 0; i <= 4; i++) {
    previous[i].copy(nodes[i]);
    velocities[i].set(0, 0, 0);
  }
  rope.lengths.fill(rope.rest);
  rope.turn = rope.twist = rope.twistRaw = rope.calm = 0;
}

type Params = ReturnType<typeof makeParams>;
function makeParams(breeze: number) {
  const gravity = 40 * 1;
  const hold = Math.max(gravity, 20);
  const elasticity = 0.5;
  const damping = 0.5;
  return {
    gravity,
    hold: hold * lerp(2.2, 5.5, elasticity),
    stiffness: 10 * hold * 4,
    spring: hold * lerp(0.1, 0.4, elasticity) * 4,
    bandDamping: hold * lerp(0.3, 0.08, elasticity) * 4,
    linearDrag: 0.25 * 16 ** damping,
    angularDrag: 0.5 * 12 ** damping,
    air: 0.15,
    broadside: 0.5,
    spinAir: 0.03,
    nodeDrag: 2,
    nodeAir: 0.2,
    twist: 30,
    twistDamping: 3,
    grip: 40,
    gripDamping: 6,
    breeze,
  };
}

function solveLink(rope: Rope, i: number, dt: number, p: Params) {
  const { nodes, body } = rope;
  const s = nodes[i];
  const invS = i === 0 ? 0 : 20;
  const last = i === 3;
  const h = tmp.g;
  let c = nodes[i + 1];
  if (last) {
    h.copy(body.hang).applyQuaternion(body.quaternion);
    c = tmp.b.copy(body.position).add(h);
  }
  const u = tmp.a.subVectors(c, s);
  const d = u.length();
  const stretch = d - rope.rest;
  if (stretch <= 0 || d < 1e-9) return;
  const dir = u.divideScalar(d);
  const invC = last ? effectiveInverseMass(body, h, dir) : 20;
  const rate = (d - rope.lengths[i]) / dt;
  const limit =
    (p.hold * Math.tanh((p.stiffness * stretch) / p.hold) + p.spring * stretch + p.bandDamping * Math.max(0, rate)) * dt * dt -
    rope.impulses[i];
  if (limit <= 0) return;
  const j = Math.min(stretch / (invS + invC), limit);
  rope.impulses[i] += j;
  if (invS) s.addScaledVector(dir, j * invS);
  if (last) applyImpulse(body, h, dir.multiplyScalar(-j));
  else c.addScaledVector(dir, -j * invC);
}

function solveGrab(body: Body, grab: Grab, pin: THREE.Vector3) {
  const n = tmp.g.copy(grab.local).applyQuaternion(body.quaternion);
  const r = tmp.a.copy(pin).sub(body.position).sub(n);
  const len = r.length();
  if (len < 1e-9) return;
  const dir = r.divideScalar(len);
  const j = len / effectiveInverseMass(body, n, dir);
  applyImpulse(body, n, dir.multiplyScalar(j));
}

function simulate(rope: Rope, dt: number, p: Params, time: number) {
  const steps = Math.max(1, Math.ceil(dt / SUB - 1e-6));
  const h = dt / steps;
  const { nodes, previous, velocities, body } = rope;
  const windX = p.breeze * (0.7 * Math.sin(0.53 * time) + 0.3 * Math.sin(1.31 * time + 1.7)) * 3;
  const windZ = p.breeze * Math.sin(0.37 * time + 0.6) * 2;
  const grab = rope.grab;
  const pin = tmp.pin;
  const nodeDecay = Math.exp(-p.nodeDrag * h);
  const linDecay = Math.exp(-p.linearDrag * h);
  const angDecay = Math.exp(-p.angularDrag * h);

  for (let s = 0; s < steps; s++) {
    for (let i = 1; i < 4; i++) {
      const v = velocities[i];
      v.y -= p.gravity * h;
      v.x += windX * h;
      v.z += windZ * h;
      previous[i].copy(nodes[i]);
      nodes[i].addScaledVector(v, h);
    }
    body.previous.copy(body.position);
    body.previousQuaternion.copy(body.quaternion);
    const q = body.quaternion;

    if (grab) {
      const e = tmp.q.copy(grab.rotation).multiply(tmp.r.copy(q).invert());
      if (e.w < 0) e.set(-e.x, -e.y, -e.z, -e.w);
      const torque = tmp.a.set(e.x, e.y, e.z).multiplyScalar(2 * p.grip);
      torque.addScaledVector(body.angular, -p.gripDamping);
      body.angular.addScaledVector(invInertia(body, torque, tmp.b), h);
    }

    // twist of the card about the strap axis
    const up = tmp.a.set(0, 1, 0).applyQuaternion(q);
    const ref = tmp.b.set(-up.x * up.z, -up.y * up.z, 1 - up.z * up.z);
    if (ref.lengthSq() > 0.001) {
      const fwd = tmp.d.set(0, 0, 1).applyQuaternion(q);
      const ang = Math.atan2(tmp.e.crossVectors(ref, fwd).dot(up), ref.dot(fwd));
      let d = ang - rope.twistRaw;
      if (d > Math.PI) d -= 2 * Math.PI;
      else if (d < -Math.PI) d += 2 * Math.PI;
      rope.twist += d;
      rope.twistRaw = ang;
    }
    if (!grab) {
      const spin = body.angular.dot(up);
      body.angular.addScaledVector(up, (p.twist * (rope.turn - rope.twist) - p.twistDamping * spin) * h);
    }

    body.velocity.y -= p.gravity * h;
    body.velocity.x += 0.35 * windX * h;
    body.velocity.z += 0.35 * windZ * h;
    body.position.addScaledVector(body.velocity, h);
    integrateQuat(body.quaternion, tmp.f.copy(body.angular).multiplyScalar(h));

    rope.impulses.fill(0);
    if (grab) pin.lerpVectors(grab.from, grab.target, (s + 1) / steps);
    for (let it = 0; it < 2; it++) {
      for (let i = 0; i < 4; i++) solveLink(rope, i, h, p);
      if (grab) solveGrab(body, grab, pin);
    }

    for (let i = 1; i < 4; i++) {
      const v = velocities[i].subVectors(nodes[i], previous[i]).divideScalar(h).multiplyScalar(nodeDecay);
      v.multiplyScalar(1 / (1 + p.nodeAir * v.length() * h));
    }
    body.velocity.subVectors(body.position, body.previous).divideScalar(h);
    const dq = tmp.q.copy(body.previousQuaternion).invert().premultiply(body.quaternion);
    body.angular.set(dq.x, dq.y, dq.z).multiplyScalar((2 / h) * (dq.w < 0 ? -1 : 1));

    const normal = tmp.a.set(0, 0, 1).applyQuaternion(body.quaternion);
    const vn = body.velocity.dot(normal);
    const inPlane = tmp.b.copy(body.velocity).addScaledVector(normal, -vn);
    inPlane.multiplyScalar(1 / (1 + p.air * inPlane.length() * h));
    body.velocity.copy(inPlane).addScaledVector(normal, vn / (1 + p.broadside * Math.abs(vn) * h)).multiplyScalar(linDecay);
    body.angular.multiplyScalar(angDecay / (1 + p.spinAir * body.angular.length() * h));
    if (body.velocity.lengthSq() > 3600) body.velocity.setLength(60);
    if (body.angular.lengthSq() > 1600) body.angular.setLength(40);

    nodes[4].copy(body.hang).applyQuaternion(body.quaternion).add(body.position);
    for (let i = 0; i < 4; i++) rope.lengths[i] = nodes[i].distanceTo(nodes[i + 1]);
  }

  if (grab) grab.from.copy(grab.target);
  let energy = body.velocity.lengthSq() + 0.3 * body.angular.lengthSq();
  for (let i = 1; i < 4; i++) energy += 0.05 * velocities[i].lengthSq();
  rope.calm = energy < 2e-4 ? rope.calm + dt : 0;
}

/* ---------------- component ---------------- */

const STRAP_PROFILE = [0, 0.04, 0.12, 0.24, 0.38, 0.5, 0.62, 0.76, 0.88, 0.96, 1].map((v) => v);
const RING_SEGMENTS = 72;

export default function Lanyard({ frontImage, backImage, strapColor = "#111111", onMiss }: { frontImage: string; backImage: string; strapColor?: string; onMiss?: () => void }) {
  const missRef = useRef(onMiss);
  missRef.current = onMiss;
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    const canvas = renderer.domElement;
    canvas.className = "pointer-events-none absolute top-0 left-0 w-full";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const scene = new THREE.Scene();
    const env = makeEnvironment(renderer);
    scene.environment = env.texture;
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-2.5, 4, 6);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(3, -1, 4);
    scene.add(key, fill);

    const z = layout();

    // textures
    const mkTex = (c: HTMLCanvasElement) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = aniso;
      return t;
    };
    const frontCanvas = document.createElement("canvas");
    const backCanvas = document.createElement("canvas");
    const strapCanvas = document.createElement("canvas");
    const frontTex = mkTex(frontCanvas);
    const backTex = mkTex(backCanvas);
    const strapTex = mkTex(strapCanvas);
    strapTex.wrapS = THREE.RepeatWrapping;
    strapTex.wrapT = THREE.ClampToEdgeWrapping;
    const cardNormal = cardNormalMap();
    const strapNormal = strapNormalMap();

    const finish = { roughness: 0.28, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 };
    const faceMat = (map: THREE.Texture) =>
      new THREE.MeshPhysicalMaterial({ map, normalMap: cardNormal, normalScale: new THREE.Vector2(0.06, 0.06), ...finish });
    const frontMat = faceMat(frontTex);
    const backMat = faceMat(backTex);
    const edgeMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setRGB(0.92, 0.92, 0.92, THREE.SRGBColorSpace),
      roughness: 0.28,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
    });
    const metalMat = new THREE.MeshStandardMaterial({ metalness: 1, color: new THREE.Color("#c9ccd1"), roughness: 0.28 });
    const strapMat = new THREE.MeshPhysicalMaterial({
      map: strapTex,
      normalMap: strapNormal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughness: 0.68,
      sheen: 1,
      sheenRoughness: 0.42,
      sheenColor: new THREE.Color(0.32, 0.32, 0.34),
      side: THREE.DoubleSide,
    });

    // card
    const card = new THREE.Group();
    const geo = cardGeometry(z);
    const bodyMesh = new THREE.Mesh(geo.body, edgeMat);
    const frontMesh = new THREE.Mesh(geo.face, frontMat);
    const backMesh = new THREE.Mesh(geo.face.clone(), backMat);
    frontMesh.position.z = 0.0166;
    backMesh.rotation.y = Math.PI;
    backMesh.position.z = -0.0166;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.0135, 18, 72), metalMat);
    ring.rotation.y = Math.PI / 2 - 0.7;
    ring.position.set(0, z.ringY, 0);
    card.add(bodyMesh, frontMesh, backMesh, ring);
    scene.add(card);

    // strap ribbon
    const profile = STRAP_PROFILE;
    const pc = profile.length;
    const ribbon = new THREE.BufferGeometry();
    ribbon.setAttribute("position", new THREE.BufferAttribute(new Float32Array(RING_SEGMENTS * pc * 3), 3));
    ribbon.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(RING_SEGMENTS * pc * 3), 3));
    ribbon.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(RING_SEGMENTS * pc * 2), 2));
    const idx: number[] = [];
    for (let r = 0; r < RING_SEGMENTS - 1; r++)
      for (let c = 0; c < pc - 1; c++) {
        const a = r * pc + c;
        idx.push(a, a + pc, a + 1, a + 1, a + pc, a + pc + 1);
      }
    ribbon.setIndex(idx);
    const strap = new THREE.Mesh(ribbon, strapMat);
    strap.frustumCulled = false;
    scene.add(strap);

    // clip
    const clip = new THREE.Group();
    const clipScale = 0.36 * clamp(STRAP_WIDTH, 0.4, 2);
    const clipBody = new THREE.Mesh(clipGeometry(clipScale), metalMat);
    clipBody.position.y = 0.107;
    const clipRing = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0105, 14, 40), metalMat);
    clip.add(clipBody, clipRing);
    scene.add(clip);

    // rope state
    const arr = () => Array.from({ length: 5 }, V);
    const rope: Rope = {
      nodes: arr(),
      previous: arr(),
      velocities: arr(),
      lengths: new Float64Array(4),
      impulses: new Float64Array(4),
      rest: 1,
      anchor: V(),
      body: {
        position: V(),
        previous: V(),
        velocity: V(),
        quaternion: new THREE.Quaternion(),
        previousQuaternion: new THREE.Quaternion(),
        angular: V(),
        mass: 1,
        inverseInertia: new THREE.Vector3(1, 1, 1),
        hang: V(),
      },
      grab: null,
      turn: 0,
      twist: 0,
      twistRaw: 0,
      calm: 0,
    };
    const curvePts: THREE.Vector3[] = [];
    const curve = new THREE.CatmullRomCurve3(curvePts, false, "centripetal");
    const samples = Array.from({ length: RING_SEGMENTS }, V);
    const frames = Array.from({ length: RING_SEGMENTS }, V);
    const endA = V();
    const endB = V();
    const sc = {
      tangent: V(), toCamera: V(), across: V(), facing: V(), up: V(), fallback: new THREE.Vector3(1, 0, 0), end: V(),
      basis: new THREE.Matrix4(),
    };

    let stripeRepeat = 2;
    let viewW = 1;
    let viewH = 1;
    let layoutReady = false;
    let raf = 0;
    let alive = true;
    let visible = true;
    let last = performance.now();
    let clock = 60 * Math.random();
    const params = makeParams(reduced ? 0 : 0.5);

    const redrawStrap = () => {
      const lenRatio = 384 / 192;
      strapCanvas.width = 192;
      strapCanvas.height = 384;
      const ctx = strapCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = strapColor;
        ctx.fillRect(0, 0, 192, 384);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let y = 0; y < 384; y += 4) ctx.fillRect(0, y, 192, 1);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        for (let y = 0; y < 384; y += 14) {
          ctx.fillRect(14.4, y, 2, 8);
          ctx.fillRect(177.6 - 2, y, 2, 8);
        }
      }
      stripeRepeat = lenRatio;
      strapNormal.repeat.set(2, 2 * stripeRepeat);
      strapTex.needsUpdate = true;
    };

    const redrawFaces = (front: HTMLImageElement | null, back: HTMLImageElement | null) => {
      const h = Math.round((1024 * z.height) / z.width);
      frontCanvas.width = backCanvas.width = 1024;
      frontCanvas.height = backCanvas.height = h;
      drawFace(frontCanvas, front);
      drawFace(backCanvas, back ?? front);
      frontTex.needsUpdate = true;
      backTex.needsUpdate = true;
      wake();
    };

    const applyLayout = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(viewW, viewH, false);
      canvas.style.height = "100%";
      const aspect = viewW / viewH;
      let visH = z.height / SIZE;
      const minW = z.width / 0.72;
      if (visH * aspect < minW) visH = minW / aspect;
      camera.aspect = aspect;
      camera.position.set(0, 0, visH / 2 / Math.tan((24 * Math.PI) / 360));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      const anchorY = visH / 2 + 0.2;
      const hangPointY = visH / 2 - visH * lerp(0.12, 0.42, STRAP_LENGTH) + (z.hangY - z.height / 2);
      rope.rest = (anchorY - hangPointY) / 4;
      const b = rope.body;
      b.mass = 1;
      b.inverseInertia.set(12 / (z.height * z.height + 0.001024), 12 / (z.width * z.width + 0.001024), 12 / (z.width * z.width + z.height * z.height));
      b.hang.set(0, z.hangY, 0);
      rope.anchor.set(0, anchorY, 0);
      rope.nodes[0].copy(rope.anchor);
      rope.previous[0].copy(rope.anchor);
      if (!layoutReady) {
        resetRope(rope, z, !reduced);
        layoutReady = true;
      }
      wake();
    };

    const poseVisuals = () => {
      const b = rope.body;
      card.position.copy(b.position);
      card.quaternion.copy(b.quaternion);
      card.updateMatrixWorld();

      const end = rope.nodes[4];
      let k = 3;
      while (k > 0 && rope.nodes[k].distanceTo(end) < 0.2596) k--;
      const up = sc.up.subVectors(rope.nodes[k], end);
      if (up.lengthSq() < 1e-8) up.set(0, 1, 0).applyQuaternion(b.quaternion);
      up.normalize();
      endA.copy(end).addScaledVector(up, 0.236);
      endB.copy(end).addScaledVector(up, 0.0885);
      curvePts.length = 0;
      for (let i = 0; i <= k; i++) curvePts.push(rope.nodes[i]);
      curvePts.push(endA, endB);
      curve.points = curvePts;
      curve.updateArcLengths();
      for (let i = 0; i < RING_SEGMENTS; i++) curve.getPointAt(i / (RING_SEGMENTS - 1), samples[i]);

      const total = curve.getLength();
      const slack = 1 - endA.distanceTo(endB) / Math.max(total, 0.001);
      const pos = ribbon.getAttribute("position") as THREE.BufferAttribute;
      const nor = ribbon.getAttribute("normal") as THREE.BufferAttribute;
      const uvA = ribbon.getAttribute("uv") as THREE.BufferAttribute;
      const full = 4 * rope.rest;
      const vRepeat = full / (clipScale * stripeRepeat);
      const width = clipScale / Math.max(1, total / Math.max(full, 0.001)) ** 0.35;
      const { tangent, toCamera, across, facing } = sc;

      for (let i = 0; i < RING_SEGMENTS; i++) {
        tangent.subVectors(samples[Math.min(RING_SEGMENTS - 1, i + 1)], samples[Math.max(0, i - 1)]);
        if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
        tangent.normalize();
        toCamera.subVectors(camera.position, samples[i]).normalize();
        const side = frames[i].crossVectors(toCamera, tangent);
        if (side.lengthSq() < 1e-10) side.copy(i > 0 ? frames[i - 1] : sc.fallback);
        side.normalize();
        if (i > 0 && side.dot(frames[i - 1]) < 0) side.negate();
        const twist = -rope.twist * Math.min(1, i / (RING_SEGMENTS - 1) / Math.max(slack, 1e-3)) ** 1.3;
        facing.crossVectors(tangent, side);
        across.copy(side).multiplyScalar(Math.cos(twist)).addScaledVector(facing, Math.sin(twist));
        facing.crossVectors(tangent, across);
        const p = samples[i];
        const v = (1 - i / (RING_SEGMENTS - 1)) * vRepeat;
        for (let c = 0; c < pc; c++) {
          const o = i * pc + c;
          const t = (STRAP_PROFILE[c] - 0.5) * width;
          pos.setXYZ(o, p.x + across.x * t, p.y + across.y * t, p.z + across.z * t);
          nor.setXYZ(o, facing.x, facing.y, facing.z);
          uvA.setXY(o, STRAP_PROFILE[c], v);
        }
        if (i === RING_SEGMENTS - 1) sc.end.copy(across);
      }
      pos.needsUpdate = nor.needsUpdate = uvA.needsUpdate = true;

      across.copy(sc.end).addScaledVector(up, -sc.end.dot(up)).normalize();
      facing.crossVectors(across, up).normalize();
      sc.basis.makeBasis(across, up, facing);
      clip.quaternion.setFromRotationMatrix(sc.basis);
      clip.position.copy(end);
      renderer.render(scene, camera);
    };

    const frame = (now: number) => {
      raf = 0;
      if (!alive) return;
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      clock += dt;
      simulate(rope, dt, params, clock);
      const b = rope.body;
      if (!Number.isFinite(b.position.x + b.position.y + b.position.z + b.quaternion.w)) {
        rope.grab = null;
        resetRope(rope, z, false);
      }
      poseVisuals();
      const asleep = rope.calm > 1.2 && !rope.grab && params.breeze === 0;
      if (visible && !asleep) raf = requestAnimationFrame(frame);
    };
    function wake() {
      if (!raf && visible && alive) {
        rope.calm = 0;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    // interaction
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const setRay = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2) + 1);
      ray.setFromCamera(ndc, camera);
    };
    const hit = () => {
      card.updateMatrixWorld();
      return ray.intersectObjects([bodyMesh, frontMesh, backMesh], false)[0] ?? null;
    };
    let click: { x: number; y: number; time: number; point: THREE.Vector3 } | null = null;
    let hovering = false;
    const setCursor = (c: string) => {
      if (host.style.cursor !== c) host.style.cursor = c;
    };
    const flip = (point: THREE.Vector3) => {
      const b = rope.body;
      const up = tmp.a.set(0, 1, 0).applyQuaternion(b.quaternion);
      let dir = rope.turn > 0 ? -1 : 1;
      if (rope.turn === 0) {
        const view = tmp.c.subVectors(point, camera.position).normalize();
        dir = tmp.b.subVectors(point, b.position).cross(view).dot(up) < 0 ? -1 : 1;
      }
      rope.turn = rope.turn === 0 ? Math.PI * dir : 0;
      b.angular.addScaledVector(up, 9 * dir);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button > 0) return;
      setRay(e);
      const h = hit();
      if (!h) {
        missRef.current?.();
        return;
      }
      const b = rope.body;
      rope.grab = {
        local: h.point.clone().sub(b.position).applyQuaternion(b.quaternion.clone().invert()),
        rotation: b.quaternion.clone(),
        reach: h.distance,
        from: h.point.clone(),
        target: h.point.clone(),
      };
      click = { x: e.clientX, y: e.clientY, time: performance.now(), point: h.point.clone() };
      host.setPointerCapture?.(e.pointerId);
      setCursor("grabbing");
      e.preventDefault();
      wake();
    };
    const onMove = (e: PointerEvent) => {
      setRay(e);
      if (rope.grab) {
        if (click && Math.hypot(e.clientX - click.x, e.clientY - click.y) > 6) click = null;
        ray.ray.at(rope.grab.reach, rope.grab.target);
        wake();
        return;
      }
      if (e.pointerType !== "touch") {
        hovering = !!hit();
        setCursor(hovering ? "grab" : "");
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!rope.grab) return;
      rope.grab = null;
      if (click && e.type === "pointerup" && performance.now() - click.time < 450) flip(click.point);
      click = null;
      host.releasePointerCapture?.(e.pointerId);
      setCursor(hovering && e.pointerType !== "touch" ? "grab" : "");
      wake();
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length === 1 && t) {
        setRay(t);
        if (hit()) e.preventDefault();
      }
    };
    host.style.touchAction = "none";
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("lostpointercapture", onUp);
    host.addEventListener("touchstart", onTouch, { passive: false });

    const ro = new ResizeObserver(() => {
      viewW = Math.max(1, host.clientWidth);
      viewH = Math.max(1, host.clientHeight);
      applyLayout();
      poseVisuals();
    });
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) wake();
    });
    io.observe(host);
    const onVis = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener("visibilitychange", onVis);

    redrawStrap();
    redrawFaces(null, null);
    Promise.all([loadImage(frontImage), loadImage(backImage)]).then(([f, b]) => {
      if (alive) redrawFaces(f, b);
    });
    viewW = Math.max(1, host.clientWidth);
    viewH = Math.max(1, host.clientHeight);
    applyLayout();
    poseVisuals();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("lostpointercapture", onUp);
      host.removeEventListener("touchstart", onTouch);
      [bodyMesh, frontMesh, backMesh, ring, clipBody, clipRing, strap].forEach((m) => m.geometry.dispose());
      [frontMat, backMat, edgeMat, metalMat, strapMat].forEach((m) => m.dispose());
      [frontTex, backTex, strapTex, cardNormal, strapNormal].forEach((t) => t.dispose());
      env.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [frontImage, backImage, strapColor]);

  return <div ref={hostRef} className="relative h-full w-full" />;
}
