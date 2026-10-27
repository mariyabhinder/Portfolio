// A batch of triangles with a colour per vertex, for the ribbons, lines and shades that are rebuilt every frame.
// It draws exactly what beginShape(TRIANGLES) + fill() + vertex() would (the same buffers through the same fill shader),
// but p5 builds and converts a colour object for every fill() and again for every vertex as it builds the shape, which
// costs whole milliseconds a frame at a few thousand vertices; here the colours go straight into one reused geometry.
// (p5 is reached through the instance, so the modules that use this do not pull p5 into the main bundle.)

let nextId = 0
const unit = (c: number) => Math.min(1, Math.max(0, c / 255))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createTris(p: any) {
  const geom = new p.constructor.Geometry(undefined, undefined, undefined, p._renderer)
  geom.gid = `tris-${nextId++}`
  const pool: { x: number; y: number; z: number }[] = []
  let n = 0, last = [0, 0, 0, 0]

  return {
    begin() {
      n = 0
      geom.vertexColors.length = 0
    },
    /** a vertex at (x, y), coloured like fill(r, g, b, a) (0-255) */
    vertex(x: number, y: number, r: number, g: number, b: number, a: number) {
      const v = pool[n] ?? (pool[n] = { x: 0, y: 0, z: 0 })
      v.x = x
      v.y = y
      geom.vertices[n++] = v
      geom.vertexColors.push(unit(r), unit(g), unit(b), unit(a))
      last = [r, g, b, a]
    },
    end() {
      geom.vertices.length = n
      if (n < 3) return
      // leave the fill as the shape would have (the last vertex's colour): it is also what p5 picks the blending by
      p.fill(last[0], last[1], last[2], last[3])
      geom.dirtyFlags = {}
      geom._hasFillTransparency = undefined
      p.model(geom)
    },
    dispose() {
      p.freeGeometry(geom)
    },
  }
}
