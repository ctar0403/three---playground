import Delaunator from 'delaunator'
import { fbm, getColor, NoiseOptions } from './utils'
import { Pane } from 'tweakpane'

type Point = {
  x: number
  y: number
}

type Params = {
  gridSize: number
  jitter: number
  margin: number
  noiseOptions: NoiseOptions
}

class Demo {
  private canvas: HTMLCanvasElement
  private width: number
  private height: number
  private dpr: number = 1
  private ctx: CanvasRenderingContext2D | null
  private params: Params
  private points: Point[] = []
  private delaunay!: Delaunator<Float64Array<ArrayBufferLike>>
  private centers: Point[] = []
  private elevations: number[] = []

  constructor(dom: HTMLCanvasElement, params: Params) {
    this.canvas = dom
    this.dpr = window.devicePixelRatio
    this.width = this.canvas.width
    this.height = this.canvas.height
    this.ctx = this.canvas.getContext('2d')
    this.params = params

    this.resize()
    this.generatePoints()
    this.generateDelaunay()
    this.generateCenters()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.canvas.style.width = rect.width + 'px'
    this.canvas.style.height = rect.height + 'px'

    // 缩放上下文以匹配CSS像素
    this.ctx?.scale(this.dpr, this.dpr)
  }

  generatePoints() {
    const margin = this.params.margin
    const gridSize = this.params.gridSize

    for (let x = margin; x <= this.width - margin; x = x + gridSize) {
      for (let y = margin; y <= this.height - margin; y = y + gridSize) {
        this.points.push({
          x: x + this.params.jitter * (Math.random() - Math.random()),
          y: y + this.params.jitter * (Math.random() - Math.random())
        })
      }
    }
  }

  generateDelaunay() {
    this.delaunay = Delaunator.from(
      this.points,
      (p) => p.x,
      (p) => p.y
    )
  }

  // 获取所有三角形的中心点
  generateCenters() {
    const numTriangles = this.delaunay.triangles.length / 3
    let centroids = []
    for (let t = 0; t < numTriangles; t++) {
      let sumOfX = 0,
        sumOfY = 0
      for (let i = 0; i < 3; i++) {
        let s = 3 * t + i
        let p = this.points[this.delaunay.triangles[s]]
        sumOfX += p.x
        sumOfY += p.y
      }
      centroids[t] = { x: sumOfX / 3, y: sumOfY / 3 }
    }
    this.centers = centroids
    // return centroids
  }

  // 获取一个三角形t的半边
  edgesOfTriangle(t: number) {
    return [3 * t, 3 * t + 1, 3 * t + 2]
  }

  // 获取半边为e的三角形
  triangleOfEdge(e: number) {
    return Math.floor(e / 3)
  }

  // 获取同一三角形中 顺时针的下一条边
  nextHalfedge(e: number) {
    return e % 3 === 2 ? e - 2 : e + 1
  }

  //获取同一三角形中 逆时针的上一条边
  prevHalfedge(e: number) {
    return e % 3 === 0 ? e + 2 : e - 1
  }

  // 获取三角形的points索引
  pointsOfTriangle(t: number) {
    return this.edgesOfTriangle(t).map((e) => this.delaunay.triangles[e])
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

  // 通过噪声分配高度
  assignElevation() {
    for (let i = 0; i < this.points.length; i++) {
      let nx = this.points[i].x / this.width
      let ny = this.points[i].y / this.height

      this.elevations[i] = fbm(nx, ny, this.params.noiseOptions)
      // this.elevations[i] = (1 + noise(nx * 0.5, ny * 0.5)) / 2
      let d = 2 * Math.max(Math.abs(nx), Math.abs(ny)) // 0 ~ 1

      // console.log('noise', nx, ny, noise(nx, ny), d)

      // this.elevations[i] = (1 + this.elevations[i]) / 2
    }
  }

  renderPoints() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.save()

    ctx.fillStyle = 'rgb(36, 225, 118)'

    for (let { x, y } of this.points) {
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.restore()
  }

  renderCellsByElevation() {
    this.assignElevation()

    if (!this.ctx) return
    const ctx = this.ctx
    ctx.save()
    let seen = new Set()

    for (let e = 0; e < this.delaunay.triangles.length; e++) {
      const r = this.delaunay.triangles[this.nextHalfedge(e)]
      if (!seen.has(r)) {
        seen.add(r)
        const vertices = this.edgesAroundPoint(e).map(
          (e) => this.centers[this.triangleOfEdge(e)]
        )

        ctx.fillStyle =
          // getColor(this.elevations[r])
          this.elevations[r] < 0.1 ? 'hsl(240, 30%, 50%)' : 'hsl(90, 20%, 50%)'
        ctx.beginPath()
        ctx.moveTo(vertices[0].x, vertices[0].y)
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y)
        }
        ctx.fill()
      }
    }
    ctx.restore()
  }

  rerender(params: Params) {
    this.params = params
    this.ctx?.clearRect(0, 0, this.width, this.height)
    this.ctx?.reset()
    this.resize()
    this.points = []
    this.generatePoints()
    this.generateDelaunay()
    this.generateCenters()

    this.renderCellsByElevation()
  }
}

const params: Params = {
  gridSize: 20,
  jitter: 10,
  margin: 40,
  noiseOptions: {
    seed: 100,
    scale: 1
  }
}
const demo = new Demo(
  document.getElementById('map') as HTMLCanvasElement,
  params
)

const pane = new Pane({
  title: 'Mapgen Demo'
})
const noise = pane.addFolder({
  title: 'noise'
})
noise
  .addBinding(params.noiseOptions, 'seed', {
    min: 1,
    max: 10000,
    step: 1
  })
  .on('change', (ev) => {
    if (ev.last) {
      demo.rerender(params)
    }
  })

noise
  .addBinding(params.noiseOptions, 'scale', {
    min: 0.1,
    max: 10,
    step: 0.1
  })
  .on('change', (ev) => {
    if (ev.last) {
      demo.rerender(params)
    }
  })

// demo.renderPoints()
// demo.renderEdges()
// demo.renderTriangles()
// demo.renderCenters()
// demo.renderCellEdges()
// demo.renderCells()
demo.renderCellsByElevation()
