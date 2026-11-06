// Runs inside headless Chrome (see bake-sit-flow.cjs): for each pair of her neighbouring sit-up pictures, finds a dense deformation that lays one
// picture's drawing over the other's, on top of the landmark warp the game already does (landing.ts sitMarks / SIT_VERT).
//
// For pictures A -> B (both placed in the one frame, hips at the origin, in landing px):
//   1. warp A onto B with the landmark field (the same inverse-distance blend the vertex shader uses), at its end state;
//   2. register that warped A onto B with a multiscale "demons" registration (alpha silhouette + dark linework as the features), which
//      pulls the dress outline, sleeves, hem, hijab and shoes onto each other;
//   3. report, on a G x G grid over A (u, v in 0-1), how far each point of A must still move beyond the landmark warp, in A's own px.
// The game adds that residual (scaled by how far the movement has got) so, where the two pictures meet, their drawings already coincide
// and the dissolve only blends the drawing's detail, not two different outlines.
(async (cfg) => {
  const { pics, G, Q } = cfg
  const sleep = () => new Promise((r) => setTimeout(r, 0))
  const load = async (url) => createImageBitmap(await (await fetch(url)).blob())
  const imgs = await Promise.all(pics.map((p) => load(p.url)))

  // ---------- small image helpers on Float32Array planes ----------
  const down = (a, w, h) => {
    const nw = Math.max(1, w >> 1), nh = Math.max(1, h >> 1), o = new Float32Array(nw * nh)
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
      const x0 = Math.min(w - 1, 2 * x), y0 = Math.min(h - 1, 2 * y), x1 = Math.min(w - 1, 2 * x + 1), y1 = Math.min(h - 1, 2 * y + 1)
      o[y * nw + x] = (a[y0 * w + x0] + a[y0 * w + x1] + a[y1 * w + x0] + a[y1 * w + x1]) / 4
    }
    return [o, nw, nh]
  }
  const blur = (a, w, h, sigma) => {
    if (sigma <= 0.01) return a
    const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1)
    let sum = 0
    for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); sum += k[i + r] }
    for (let i = 0; i < k.length; i++) k[i] /= sum
    const t = new Float32Array(w * h), o = new Float32Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0
      for (let i = -r; i <= r; i++) s += a[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r]
      t[y * w + x] = s
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0
      for (let i = -r; i <= r; i++) s += t[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r]
      o[y * w + x] = s
    }
    return o
  }
  const bil = (a, w, h, x, y) => {
    x = Math.min(w - 1.001, Math.max(0, x)); y = Math.min(h - 1.001, Math.max(0, y))
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = y0 * w + x0
    return (a[i] * (1 - fx) + a[i + 1] * fx) * (1 - fy) + (a[i + w] * (1 - fx) + a[i + w + 1] * fx) * fy
  }

  // ---------- pictures in the shared frame ----------
  const world = (p, i, j) => [(p.marks[i][0] - p.hip[0]) * p.s, (p.marks[i][1] - p.hip[1]) * p.s]
  const rasterOf = (k, W, H, minX, minY) => {
    const p = pics[k], c = new OffscreenCanvas(W, H), g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(imgs[k], (-p.hip[0] * p.s - minX) * Q, (-p.hip[1] * p.s - minY) * Q, p.w * p.s * Q, p.h * p.s * Q)
    const d = g.getImageData(0, 0, W, H).data, n = W * H
    const A = new Float32Array(n), R = new Float32Array(n), Gc = new Float32Array(n), B = new Float32Array(n)
    for (let i = 0; i < n; i++) { A[i] = d[4 * i + 3] / 255; R[i] = d[4 * i]; Gc[i] = d[4 * i + 1]; B[i] = d[4 * i + 2] }
    return { A, R, G: Gc, B }
  }
  // features the registration matches: the silhouette, and her dark linework / hair / lace shading
  const features = (r, W, H) => {
    const n = W * H, sil = new Float32Array(n), ink = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const lum = (0.3 * r.R[i] + 0.59 * r.G[i] + 0.11 * r.B[i]) / 255
      sil[i] = r.A[i]
      ink[i] = r.A[i] * (1 - lum) * 2.2
    }
    return [blur(sil, W, H, 1.2), blur(ink, W, H, 1.2)]
  }

  // ---------- demons registration: finds D with M(x + D(x)) ~ F(x) ----------
  const demons = async (F, M, W, H) => {
    // pyramids
    const pyr = (planes) => {
      const out = [{ p: planes, w: W, h: H }]
      for (let l = 1; l < 4; l++) {
        const prev = out[l - 1], np = [], dims = []
        for (const pl of prev.p) { const [o, nw, nh] = down(pl, prev.w, prev.h); np.push(o); dims[0] = nw; dims[1] = nh }
        out.push({ p: np, w: dims[0], h: dims[1] })
      }
      return out
    }
    const PF = pyr(F), PM = pyr(M)
    const iters = [90, 60, 40, 25], sig = [2.2, 2.0, 1.8, 1.6]
    let Dx = new Float32Array(PF[3].w * PF[3].h), Dy = new Float32Array(PF[3].w * PF[3].h)
    for (let l = 3; l >= 0; l--) {
      const w = PF[l].w, h = PF[l].h
      if (Dx.length !== w * h) { // up from the coarser level
        const cw = PF[l + 1].w, ch = PF[l + 1].h, nx = new Float32Array(w * h), ny = new Float32Array(w * h)
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          nx[y * w + x] = 2 * bil(Dx, cw, ch, (x + 0.5) / 2 - 0.5, (y + 0.5) / 2 - 0.5)
          ny[y * w + x] = 2 * bil(Dy, cw, ch, (x + 0.5) / 2 - 0.5, (y + 0.5) / 2 - 0.5)
        }
        Dx = nx; Dy = ny
      }
      const nc = PF[l].p.length
      for (let it = 0; it < iters[l]; it++) {
        const ux = new Float32Array(w * h), uy = new Float32Array(w * h)
        for (let c = 0; c < nc; c++) {
          const f = PF[l].p[c], m = PM[l].p[c]
          for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
            const i = y * w + x, sx = x + Dx[i], sy = y + Dy[i]
            const mv = bil(m, w, h, sx, sy), diff = mv - f[i]
            const gx = (f[i + 1] - f[i - 1]) / 2 + (bil(m, w, h, sx + 1, sy) - bil(m, w, h, sx - 1, sy)) / 2
            const gy = (f[i + w] - f[i - w]) / 2 + (bil(m, w, h, sx, sy + 1) - bil(m, w, h, sx, sy - 1)) / 2
            const den = (gx * gx + gy * gy) / 4 + diff * diff + 1e-4
            ux[i] -= (diff * gx) / 2 / den
            uy[i] -= (diff * gy) / 2 / den
          }
        }
        for (let i = 0; i < w * h; i++) {
          Dx[i] += Math.max(-1, Math.min(1, ux[i] / nc)); Dy[i] += Math.max(-1, Math.min(1, uy[i] / nc))
        }
        Dx = blur(Dx, w, h, sig[l]); Dy = blur(Dy, w, h, sig[l])
        if (it % 10 === 9) await sleep()
      }
    }
    return [Dx, Dy]
  }

  // ---------- one direction: A (moving) onto B (fixed) ----------
  const residual = async (ka, kb) => {
    const A = pics[ka], B = pics[kb]
    const minX = Math.min(-A.hip[0] * A.s, -B.hip[0] * B.s) - 24, maxX = Math.max((A.w - A.hip[0]) * A.s, (B.w - B.hip[0]) * B.s) + 24
    const minY = Math.min(-A.hip[1] * A.s, -B.hip[1] * B.s) - 24, maxY = Math.max((A.h - A.hip[1]) * A.s, (B.h - B.hip[1]) * B.s) + 24
    const W = Math.ceil((maxX - minX) * Q), H = Math.ceil((maxY - minY) * Q)
    const ra = rasterOf(ka, W, H, minX, minY), rb = rasterOf(kb, W, H, minX, minY)
    const LA = A.marks.map((_, i) => world(A, i)), LB = B.marks.map((_, i) => world(B, i))
    // the landmark field (the vertex shader's pull), in world px relative to the hips
    const disp = (x, y) => {
      let ax = 0, ay = 0, ws = 0
      for (let i = 0; i < LA.length; i++) {
        const dx = x - LA[i][0], dy = y - LA[i][1], d2 = dx * dx + dy * dy, w = 1 / (d2 * d2 + 1)
        ax += (LB[i][0] - LA[i][0]) * w; ay += (LB[i][1] - LA[i][1]) * w; ws += w
      }
      return [ax / ws, ay / ws]
    }
    // A warped onto B's layout, sampled backwards: for each output pixel, the point of A that lands there
    const warp = { A: new Float32Array(W * H), R: new Float32Array(W * H), G: new Float32Array(W * H), B: new Float32Array(W * H) }
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = minX + i / Q, y = minY + j / Q
      let qx = x, qy = y
      for (let t = 0; t < 6; t++) { const d = disp(qx, qy); qx = x - d[0]; qy = y - d[1] }
      const sx = (qx - minX) * Q, sy = (qy - minY) * Q, o = j * W + i
      warp.A[o] = bil(ra.A, W, H, sx, sy); warp.R[o] = bil(ra.R, W, H, sx, sy); warp.G[o] = bil(ra.G, W, H, sx, sy); warp.B[o] = bil(ra.B, W, H, sx, sy)
    }
    const fm = features(warp, W, H), ff = features(rb, W, H)
    const err = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length }
    const before = err(fm[0], ff[0]) + err(fm[1], ff[1])
    const [Dx, Dy] = await demons(ff, fm, W, H)
    // after: M sampled at x + D
    let after = 0
    for (let c = 0; c < 2; c++) {
      let s = 0
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const o = j * W + i; s += Math.abs(bil(fm[c], W, H, i + Dx[o], j + Dy[o]) - ff[c][o]) }
      after += s / (W * H)
    }
    // the residual on a grid over A: where A's point lands (landmark field), minus the registration's offset there
    const out = new Int16Array(G * G * 2)
    let maxR = 0, sumR = 0
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const px = (gx / (G - 1)) * A.w, py = (gy / (G - 1)) * A.h
      const qx = (px - A.hip[0]) * A.s, qy = (py - A.hip[1]) * A.s
      const d = disp(qx, qy), tx = qx + d[0], ty = qy + d[1]
      const cx = (tx - minX) * Q, cy = (ty - minY) * Q
      // only trust the registration where A has something to register (else it is just smooth extrapolation: keep it, but fade it out far from her)
      const rx = (-bil(Dx, W, H, cx, cy) / Q) / A.s, ry = (-bil(Dy, W, H, cx, cy) / Q) / A.s
      const o = (gy * G + gx) * 2
      out[o] = Math.max(-32000, Math.min(32000, Math.round(rx * 8))); out[o + 1] = Math.max(-32000, Math.min(32000, Math.round(ry * 8)))
      const m = Math.hypot(rx * A.s, ry * A.s); maxR = Math.max(maxR, m); sumR += m
    }
    return { out: Array.from(out), before, after, maxR, meanR: sumR / (G * G) }
  }

  const result = { G, fields: [] }
  const log = []
  for (let k = 0; k < pics.length; k++) {
    const fwd = k < pics.length - 1 ? await residual(k, k + 1) : null
    const bwd = k > 0 ? await residual(k, k - 1) : null
    result.fields.push({ fwd: fwd && fwd.out, bwd: bwd && bwd.out })
    log.push({ k, fwd: fwd && { before: +fwd.before.toFixed(4), after: +fwd.after.toFixed(4), maxR: +fwd.maxR.toFixed(1), meanR: +fwd.meanR.toFixed(1) }, bwd: bwd && { before: +bwd.before.toFixed(4), after: +bwd.after.toFixed(4), maxR: +bwd.maxR.toFixed(1), meanR: +bwd.meanR.toFixed(1) } })
  }
  result.log = log
  return JSON.stringify(result)
})
