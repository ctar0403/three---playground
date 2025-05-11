import Delaunator from 'delaunator'
import { createNoise2D } from 'simplex-noise'
import { Pane } from 'tweakpane'

// const GRIDSIZE = 25
// const JITTER = 0.5
// const WAVELENGTH = 0.5

const params = {
  gridsize: 20,
  jitter: 0.5,
  wavelength: 0.5
}

type Params = typeof params
type Point = { x: number; y: number }

class MapGen {
  private canvas: HTMLCanvasElement
  private params: Params
  private points: Point[]
  private numRegions: number
  private delaunay: Delaunator<Float64Array<ArrayBufferLike>>
  private numTriangles: number
  private numEdges: number
  private centers: { x: number; y: number }[]
  private halfedges: Int32Array<ArrayBufferLike>
  private triangles: Uint32Array<ArrayBufferLike>
  private elevation: number[]
  private moisture: number[]

  constructor(dom: HTMLCanvasElement, params: Params) {
    this.canvas = dom
    this.params = params
    this.points = []

    this.init()
  }

  private init() {
    for (let x = 0; x <= this.params.gridsize; x++) {
      for (let y = 0; y <= this.params.gridsize; y++) {
        this.points.push({
          x: x + this.params.jitter * (Math.random() - Math.random()),
          y: y + this.params.jitter * (Math.random() - Math.random())
        })
      }
    }

    this.numRegions = this.points.length

    this.delaunay = Delaunator.from(
      this.points,
      (loc) => loc.x,
      (loc) => loc.y
    )
    this.triangles = this.delaunay.triangles
    this.numTriangles = this.triangles.length
    this.halfedges = this.delaunay.halfedges
    this.numEdges = this.delaunay.halfedges.length
    this.centers = this.calculateCentroids(this.points, this.delaunay)
    this.moisture = this.assignMoisture()
    this.elevation = this.assignElevation()
  }

  private calculateCentroids(
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

  private triangleOfEdge(e: number) {
    return Math.floor(e / 3)
  }

  private nextHalfedge(e: number) {
    return e % 3 === 2 ? e - 2 : e + 1
  }

  private assignElevation() {
    const noise = createNoise2D()
    let elevation = []
    for (let r = 0; r < this.numRegions; r++) {
      let nx = this.points[r].x / this.params.gridsize - 1 / 2
      let ny = this.points[r].y / this.params.gridsize - 1 / 2

      elevation[r] =
        (1 + noise(nx / this.params.wavelength, ny / this.params.wavelength)) /
        2
      let d = 2 * Math.max(Math.abs(nx), Math.abs(ny)) // 0 ~ 1
      elevation[r] = (1 + elevation[r] - d) / 2
    }
    return elevation
  }

  private assignMoisture() {
    const noise = createNoise2D()
    let moisture = []
    for (let r = 0; r < this.numRegions; r++) {
      let nx = this.points[r].x / this.params.gridsize - 1 / 2,
        ny = this.points[r].y / this.params.gridsize - 1 / 2
      moisture[r] =
        (1 + noise(nx / this.params.wavelength, ny / this.params.wavelength)) /
        2
    }
    return moisture
  }

  private biomeColor(r: number) {
    let e = (this.elevation[r] - 0.5) * 2,
      m = this.moisture[r]
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

  edgesAroundPoint(start: number) {
    const result = []
    let incoming = start
    do {
      result.push(incoming)
      const outgoing = this.nextHalfedge(incoming)
      incoming = this.delaunay.halfedges[outgoing]
    } while (incoming !== -1 && incoming !== start)
    return result
  }

  drawPoints() {
    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    ctx.save()

    ctx.scale(
      this.canvas.width / this.params.gridsize,
      this.canvas.height / this.params.gridsize
    )
    ctx.fillStyle = 'hsl(0, 50%, 50%)'
    for (let { x, y } of this.points) {
      ctx.beginPath()
      ctx.arc(x, y, 0.1, 0, 2 * Math.PI)
      ctx.fill()
    }
    ctx.restore()
  }

  drawCellBoundaries() {
    let ctx = this.canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.scale(
      this.canvas.width / this.params.gridsize,
      this.canvas.height / this.params.gridsize
    )
    ctx.lineWidth = 0.02
    ctx.strokeStyle = 'black'
    for (let i = 0; i < this.numEdges; i++) {
      if (i < this.delaunay.halfedges[i]) {
        const p = this.centers[this.triangleOfEdge(i)]
        const q = this.centers[this.triangleOfEdge(this.halfedges[i])]
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  drawCellColors() {
    let ctx = this.canvas.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.scale(
      this.canvas.width / this.params.gridsize,
      this.canvas.height / this.params.gridsize
    )
    let seen = new Set() // of region ids
    for (let e = 0; e < this.numEdges; e++) {
      const r = this.triangles[this.nextHalfedge(e)]
      if (!seen.has(r)) {
        seen.add(r)
        let vertices = this.edgesAroundPoint(e).map(
          (e) => this.centers[this.triangleOfEdge(e)]
        )
        ctx.fillStyle = this.biomeColor(r)
        ctx.beginPath()
        ctx.moveTo(vertices[0].x, vertices[0].y)
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y)
        }
        ctx.fill()
      }
    }
  }

  redraw(params: Params) {
    this.params = params

    let ctx = this.canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.init()
  }
}

const mapGen = new MapGen(
  document.getElementById('map') as HTMLCanvasElement,
  params
)
// mapGen.drawPoints()
// mapGen.drawCellBoundaries()
mapGen.drawCellColors()
