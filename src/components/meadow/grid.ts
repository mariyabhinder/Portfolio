// A grid mesh over a picture, made as one geometry: `verts` are [x, y, z, u, v], row by row ((cols + 1) per row, rows + 1 rows),
// and every cell is two triangles. It has the same triangles in the same order as building the grid with buildGeometry() and
// vertex() calls, but skips p5's shape pipeline, which converts a fill colour for every vertex (seconds of work for her meshes on
// a phone) and keeps stroke edges nobody draws. (p5 is reached through the instance, like tris.ts.)

let nextId = 0

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function gridGeometry(p: any, cols: number, rows: number, verts: number[][]) {
  const g = new p.constructor.Geometry(undefined, undefined, undefined, p._renderer)
  g.gid = `grid-${nextId++}`
  for (const [x, y, z, u, v] of verts) {
    g.vertices.push(p.createVector(x, y, z))
    g.uvs.push(u, v)
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1
    g.faces.push([a, b, c], [b, d, c])
  }
  return g
}
