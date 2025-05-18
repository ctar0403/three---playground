import Delaunator from 'delaunator'
import { getColor } from './utils'

type Point = {
  x: number
  y: number
}

type Params = {
  gridSize: number
  jitter: number
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
    for (let x = 0; x <= this.width; x = x + this.params.gridSize) {
      for (let y = 0; y <= this.height; y = y + this.params.gridSize) {
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

  // triangleCenter(t: number) {
  //   const vertices = this.pointsOfTriangle(t).map(p => this.points[p])

  // }

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

  renderEdges() {
    console.log('triangles', this.delaunay.triangles, this.delaunay.halfedges)

    //  0------1
    //   \    / \
    //    \  /   \
    //     2------3
    // points: [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] 共四个点
    // delaunay.triangles : 存储三角形顶点索引，通过索引可以在points中找到对应的点，
    // 每三个元素表示一个三角形的3个顶点。
    // 上图值为：[
    //   0, 1, 2 // triangle0
    //   2, 1, 3 // triangle1
    // ]
    // delaunay.halfedges : 半边索引，与 triangles 等长，每个元素表示 triangles 中对应半边
    //                      的 “对边” 所在的索引，没有则为 -1。
    // 上图值为：[
    //    -1,  // triangle0 的边0: 0->1, 无对边
    //    3,   // triangle0 的边1: 1->2，对边是索引3，triagles[3] = 2, 即 2->1
    //    -1,  // triangle0 的边2: 2->0, 无
    //    1,   // triangle1 的边0: 2->1, 对边是索引1，triangles[1] = 1，即 1->2
    //    -1,  // triangle1 的边1: 1->3, 无
    //    -1   // triangle1 的边2: 3->2, 无
    // ]
    // 即 halfedges[1] = 3 -> triangle0 的边1对应 triangle1 的边0
    //    halfedges[3] = 1 -> triangle1 的边0对应 triangle0 的边1
    // halfedges[i] 是第i条边的对边的索引，它本质上是triangles中的索引，也是halfedges中索引，
    // 因为两者长度一样，结构一一对应

    if (!this.ctx) return
    const ctx = this.ctx
    ctx.save()
    ctx.lineWidth = 0.2
    ctx.strokeStyle = `rgba(66, 63, 63, 0.6)`

    for (let e = 0; e < this.delaunay.triangles.length; e++) {
      // 半边是两个边，此条件能确保每个边只被绘制一次
      if (e > this.delaunay.halfedges[e]) {
        // p 是边的起点
        const p = this.points[this.delaunay.triangles[e]]
        // q 是边的终点
        const q = this.points[this.delaunay.triangles[this.nextHalfedge(e)]]

        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  renderTriangles() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.save()

    for (let t = 0; t < this.delaunay.triangles.length / 3; t++) {
      const ps = this.pointsOfTriangle(t)
      ctx.fillStyle = getColor(t / this.delaunay.triangles.length)

      ctx.beginPath()
      ctx.moveTo(this.points[ps[0]].x, this.points[ps[0]].y)
      ctx.lineTo(this.points[ps[1]].x, this.points[ps[1]].y)
      ctx.lineTo(this.points[ps[2]].x, this.points[ps[2]].y)
      ctx.closePath()
      ctx.fill()
    }

    ctx.restore()
  }

  renderCenters() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.save()

    ctx.fillStyle = 'hsl(312, 85.20%, 47.80%)'

    for (let { x, y } of this.centers) {
      ctx.beginPath()
      ctx.arc(x, y, 1.5, 0, 2 * Math.PI)
      ctx.fill()
    }

    ctx.restore()
  }

  renderCellEdges() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.save()
    ctx.lineWidth = 0.3
    ctx.strokeStyle = `rgba(24, 11, 146, 0.7)`

    for (let e = 0; e < this.delaunay.halfedges.length; e++) {
      if (e < this.delaunay.halfedges[e]) {
        const p = this.centers[this.triangleOfEdge(e)]
        const q = this.centers[this.triangleOfEdge(this.delaunay.halfedges[e])]
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  renderCells() {
    if (!this.ctx) return
    const ctx = this.ctx
    ctx.save()

    let seen = new Set()

    for (let e = 0; e < this.delaunay.halfedges.length; e++) {
      const r = this.delaunay.triangles[this.nextHalfedge(e)]
      if (!seen.has(r)) {
        seen.add(r)
        const vertices = this.edgesAroundPoint(e).map(
          (e) => this.centers[this.triangleOfEdge(e)]
        )
        ctx.fillStyle = getColor(e / this.delaunay.halfedges.length)
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
}

const demo = new Demo(document.getElementById('map') as HTMLCanvasElement, {
  gridSize: 40,
  jitter: 10
})

demo.renderPoints()
demo.renderEdges()
// demo.renderTriangles()
demo.renderCenters()
demo.renderCellEdges()
demo.renderCells()
