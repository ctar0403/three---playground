import Delaunator from 'delaunator'
import { SimplexNoise } from 'three/examples/jsm/Addons.js'

const GRIDSIZE = 25
const JITTER = 0.5
const WAVELENGTH = 0.5

type Point = { x: number; y: number }

let points: Point[] = []

for (let x = 0; x <= GRIDSIZE; x++) {
  for (let y = 0; y <= GRIDSIZE; y++) {
    points.push({
      x: x + JITTER * (Math.random() - Math.random()),
      y: y + JITTER * (Math.random() - Math.random())
    })
  }
}

let delaunay = Delaunator.from(
  points,
  (loc) => loc.x,
  (loc) => loc.y
)

type Delaunay = typeof delaunay

let map = {
  points,
  numRegions: points.length,
  numTriangles: delaunay.halfedges.length / 3,
  numEdges: delaunay.halfedges.length,
  halfedges: delaunay.halfedges,
  triangles: delaunay.triangles,
  centers: calculateCentroids(points, delaunay),
  elevation: [],
  moisture: []
}

type MapType = typeof map

function drawPoints(
  canvas: HTMLCanvasElement,
  points: { x: number; y: number }[]
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.save()

  ctx.scale(canvas.width / GRIDSIZE, canvas.height / GRIDSIZE)
  ctx.fillStyle = 'hsl(0, 50%, 50%)'
  for (let { x, y } of points) {
    ctx.beginPath()
    ctx.arc(x, y, 0.1, 0, 2 * Math.PI)
    ctx.fill()
  }
  ctx.restore()
}

function calculateCentroids(
  points: Point[],
  delaunay: Delaunator<Float64Array<ArrayBufferLike>>
) {
  const numTriangles = delaunay.halfedges.length / 3
  let centroids = []
  for (let t = 0; t < numTriangles; t++) {
    let sumOfX = 0,
      sumOfY = 0
    for (let i = 0; i < 3; i++) {
      let s = 3 * t + i
      let p = points[delaunay.triangles[s]]
      sumOfX += p.x
      sumOfY += p.y
    }
    centroids[t] = { x: sumOfX / 3, y: sumOfY / 3 }
  }
  return centroids
}

function triangleOfEdge(e: number) {
  return Math.floor(e / 3)
}

function nextHalfedge(e: number) {
  return e % 3 === 2 ? e - 2 : e + 1
}

function drawCellBoundaries(canvas: HTMLCanvasElement, map: MapType) {
  let { points, centers, halfedges, triangles, numEdges } = map
  let ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.save()
  ctx.scale(canvas.width / GRIDSIZE, canvas.height / GRIDSIZE)
  ctx.lineWidth = 0.02
  ctx.strokeStyle = 'black'
  for (let e = 0; e < numEdges; e++) {
    if (e < delaunay.halfedges[e]) {
      const p = centers[triangleOfEdge(e)]
      const q = centers[triangleOfEdge(halfedges[e])]
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(q.x, q.y)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function assignElevation(map: MapType) {
  const noise = new SimplexNoise()
  let { points, numRegions } = map
  let elevation = []
  for (let r = 0; r < numRegions; r++) {
    let nx = points[r].x / GRIDSIZE - 1 / 2
    let ny = points[r].y / GRIDSIZE - 1 / 2

    elevation[r] = (1 + noise.noise(nx / WAVELENGTH, ny / WAVELENGTH)) / 2
    let d = 2 * Math.max(Math.abs(nx), Math.abs(ny)) // 0 ~ 1
    elevation[r] = (1 + elevation[r] - d) / 2
  }
  return elevation
}

map.elevation = assignElevation(map)

function edgesAroundPoint(delaunay: Delaunay, start: number) {
  const result = []
  let incoming = start
  do {
    result.push(incoming)
    const outgoing = nextHalfedge(incoming)
    incoming = delaunay.halfedges[outgoing]
  } while (incoming !== -1 && incoming !== start)
  return result
}

function drawCellColors(
  canvas: HTMLCanvasElement,
  map: MapType,
  colorFn: Function
) {
  let ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.save()
  ctx.scale(canvas.width / GRIDSIZE, canvas.height / GRIDSIZE)
  let seen = new Set() // of region ids
  let { triangles, numEdges, centers } = map
  for (let e = 0; e < numEdges; e++) {
    const r = triangles[nextHalfedge(e)]
    if (!seen.has(r)) {
      seen.add(r)
      let vertices = edgesAroundPoint(delaunay, e).map(
        (e) => centers[triangleOfEdge(e)]
      )
      ctx.fillStyle = colorFn(r)
      ctx.beginPath()
      ctx.moveTo(vertices[0].x, vertices[0].y)
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y)
      }
      ctx.fill()
    }
  }
}

function assignMoisture(map: MapType) {
  const noise = new SimplexNoise()
  let { points, numRegions } = map
  let moisture = []
  for (let r = 0; r < numRegions; r++) {
    let nx = points[r].x / GRIDSIZE - 1 / 2,
      ny = points[r].y / GRIDSIZE - 1 / 2
    moisture[r] = (1 + noise.noise(nx / WAVELENGTH, ny / WAVELENGTH)) / 2
  }
  return moisture
}

map.moisture = assignMoisture(map)

function biomeColor(map: MapType, r: number) {
  let e = (map.elevation[r] - 0.5) * 2,
    m = map.moisture[r]
  let g, b
  if (e < 0.0) {
    r = 48 + 48 * e
    g = 64 + 64 * e
    b = 127 + 127 * e
  } else {
    m = m * (1 - e)
    e = e ** 4 // tweaks
    r = 210 - 100 * m
    g = 185 - 45 * m
    b = 139 - 45 * m
    ;(r = 255 * e + r * (1 - e)),
      (g = 255 * e + g * (1 - e)),
      (b = 255 * e + b * (1 - e))
  }
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`
}

// drawCellBoundaries(document.getElementById('map') as HTMLCanvasElement, map)

// drawCellColors(
//   document.getElementById('map') as HTMLCanvasElement,
//   map,
//   (r: number) =>
//     map.elevation[r] < 0.5 ? 'hsl(240, 30%, 50%)' : 'hsl(90, 20%, 50%)'
// )

drawCellColors(
  document.getElementById('map') as HTMLCanvasElement,
  map,
  (r: number) => biomeColor(map, r)
)
