import Delaunator from 'delaunator'
import { getColor } from './utils'
import {
  Camera,
  OGLRenderingContext,
  Program,
  Renderer,
  Transform,
  Mesh,
  Geometry
} from 'ogl'
import earcut from 'earcut'
import PoissonDiskSampling from 'poisson-disk-sampling'
import alea from 'alea'

type Point = {
  x: number
  y: number
}

type Params = {
  gridSize: number
  jitter: number
}

class Demo {
  private dom: HTMLDivElement
  private width: number = 0
  private height: number = 0
  private renderer: Renderer
  private gl: OGLRenderingContext
  private camera: Camera
  private scene: Transform
  private dpr: number = 2
  private params: Params
  private points: Point[] = []
  private delaunay!: Delaunator<Float64Array<ArrayBufferLike>>
  private centers: Point[] = []

  constructor(dom: HTMLDivElement, params: Params) {
    this.dom = dom
    this.renderer = new Renderer({
      antialias: true
    })

    this.gl = this.renderer.gl

    this.camera = new Camera(this.gl, {
      near: 0.1,
      far: 1000
    })
    this.camera.position.z = 3
    this.camera.lookAt([0, 0, 0])

    this.resize()
    this.update()
    this.gl.clearColor(1, 1, 1, 0)
    this.dom.appendChild(this.gl.canvas)

    this.scene = new Transform()

    this.params = params

    this.generatePoints()
    this.generateDelaunay()
    this.generateCenters()
  }

  resize() {
    const _resize = () => {
      this.width = this.dom.clientWidth
      this.height = this.dom.clientHeight
      this.dpr = Math.min(window.devicePixelRatio, 2)

      this.renderer.dpr = this.dpr
      this.renderer.setSize(this.width, this.height)

      this.camera.orthographic({
        left: -20,
        right: this.width,
        top: this.height,
        bottom: -20
      })
    }
    window.addEventListener('resize', _resize, false)
    _resize()
  }

  update() {
    const _update = (t: number) => {
      requestAnimationFrame(_update)
      this.renderer.render({ scene: this.scene, camera: this.camera })
    }
    requestAnimationFrame(_update)
  }

  generatePoints() {
    const prng = alea('1199')
    const pds = new PoissonDiskSampling(
      {
        shape: [this.width, this.height],
        minDistance: this.params.gridSize,
        maxDistance: this.params.gridSize * 1.5,
        tries: 30
      },
      prng
    )
    const samples = pds.fill()
    this.points = samples.map(([x, y]) => ({ x, y }))
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

  renderPoints() {
    const gl = this.gl
    const geometry = new Geometry(gl, {
      position: {
        size: 3,
        data: new Float32Array(
          this.points.reduce(
            (acc, point) => [...acc, point.x, point.y, 0],
            [] as number[]
          )
        )
      }
    })
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 5.0;
        }
      `,
      fragment: `
        precision highp float;
        
        void main() {
          gl_FragColor = vec4(0.141, 0.882, 0.463, 1.0);
        }
      `
    })
    const points = new Mesh(gl, { mode: gl.POINTS, geometry, program })
    points.setParent(this.scene)

    // this.renderer.render({ scene: this.scene, camera: this.camera })
  }

  renderEdges() {
    const gl = this.gl
    const positions: number[] = []

    for (let e = 0; e < this.delaunay.triangles.length; e++) {
      if (e > this.delaunay.halfedges[e]) {
        const p = this.points[this.delaunay.triangles[e]]
        const q = this.points[this.delaunay.triangles[this.nextHalfedge(e)]]
        positions.push(p.x, p.y, 0, q.x, q.y, 0)
      }
    }
    if (positions.length === 0) return
    const geometry = new Geometry(gl, {
      position: {
        size: 3,
        data: new Float32Array(positions)
      }
    })
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        void main() {
          gl_FragColor = vec4(0.26, 0.25, 0.25, 0.25);
        }
      `
    })

    // gl.lineWidth(0.3)
    // 启用混合（使透明度生效）
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const mesh = new Mesh(gl, {
      geometry,
      program,
      mode: gl.LINES
    })
    mesh.setParent(this.scene)
    // this.renderer.render({ scene: this.scene, camera: this.camera })
  }

  renderCenters() {
    const gl = this.gl
    const positions: number[] = []

    for (let { x, y } of this.centers) {
      positions.push(x, y, 0)
    }

    if (positions.length === 0) return
    const geometry = new Geometry(gl, {
      position: {
        size: 3,
        data: new Float32Array(positions)
      }
    })
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 6.0;
        }
      `,
      fragment: `
        void main() {
          gl_FragColor = vec4(0.88, 0.07, 0.72, 0.8);
        }
      `
    })
    const points = new Mesh(gl, { mode: gl.POINTS, geometry, program })
    points.setParent(this.scene)

    this.renderer.render({ scene: this.scene, camera: this.camera })
  }

  renderTriangles() {
    const gl = this.gl
    const pts = this.points
    const triangles = this.delaunay.triangles
    const positions: number[] = []
    const colors: number[] = []

    for (let i = 0; i < triangles.length; i += 3) {
      const p0 = pts[triangles[i]]
      const p1 = pts[triangles[i + 1]]
      const p2 = pts[triangles[i + 2]]

      positions.push(p0.x, p0.y, 0)
      positions.push(p1.x, p1.y, 0)
      positions.push(p2.x, p2.y, 0)

      const color = getColor(i / triangles.length)
      for (let j = 0; j < 3; j++) {
        colors.push(...color) // 每个顶点同色
      }
    }

    const geometry = new Geometry(gl, {
      position: {
        size: 3,
        data: new Float32Array(positions)
      },
      color: {
        size: 4,
        data: new Float32Array(colors)
      }
    })
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        attribute vec4 color;
        varying vec4 vColor;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        varying vec4 vColor;

        void main() {
          gl_FragColor = vec4(vColor);
        }
      `,
      // cullFace: null, // 顶点顺序不统一，禁用背面剔除。开启时默认会提出顺时针顶点面
      transparent: true
    })

    gl.frontFace(gl.CW) // 顶点顺序为顺时针
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const mesh = new Mesh(gl, {
      geometry,
      program,
      mode: gl.TRIANGLES
    })
    mesh.setParent(this.scene)
  }

  renderCellEdges() {
    const gl = this.gl
    const positions: number[] = []

    for (let e = 0; e < this.delaunay.halfedges.length; e++) {
      if (e < this.delaunay.halfedges[e]) {
        const p = this.centers[this.triangleOfEdge(e)]
        const q = this.centers[this.triangleOfEdge(this.delaunay.halfedges[e])]
        positions.push(p.x, p.y, 0, q.x, q.y, 0)
      }
    }
    if (positions.length === 0) return
    const geometry = new Geometry(gl, {
      position: {
        size: 3,
        data: new Float32Array(positions)
      }
    })
    const program = new Program(gl, {
      vertex: `
        attribute vec3 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragment: `
        void main() {
          gl_FragColor = vec4(0.0941, 0.0431, 0.5725, 0.3);
        }
      `
    })

    // gl.lineWidth(0.3)
    // 启用混合（使透明度生效）
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const mesh = new Mesh(gl, {
      geometry,
      program,
      mode: gl.LINES
    })
    mesh.setParent(this.scene)
    this.renderer.render({ scene: this.scene, camera: this.camera })
  }

  renderCells() {
    const seen = new Set()
    let indexOffset = 0
    const gl = this.gl
    const positions: number[] = []
    const indices: number[] = []
    const colors: number[] = []

    for (let e = 0; e < this.delaunay.halfedges.length; e++) {
      const r = this.delaunay.triangles[this.nextHalfedge(e)]
      if (seen.has(r)) continue
      seen.add(r)

      const vertices = this.edgesAroundPoint(e).map(
        (e) => this.centers[this.triangleOfEdge(e)]
      )
      if (vertices.length < 3) continue

      const flat = vertices.flatMap((p) => [p.x, p.y])
      const color = getColor(e / this.delaunay.halfedges.length)
      for (let i = 0; i < flat.length / 2; i++) {
        colors.push(...color)
      }

      const cellIndices = earcut(flat)
      positions.push(...flat)
      for (let i = 0; i < cellIndices.length; i++) {
        indices.push(cellIndices[i] + indexOffset)
      }

      indexOffset += flat.length / 2
    }

    const geometry = new Geometry(gl, {
      position: { size: 2, data: new Float32Array(positions) },
      index: { data: new Uint32Array(indices) },
      color: {
        size: 4,
        data: new Float32Array(colors)
      }
    })

    const program = new Program(gl, {
      vertex: `
        attribute vec2 position;
        attribute vec4 color;
        varying vec4 vColor;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main() {
          vColor = color;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.0, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        varying vec4 vColor;

        void main() {
          gl_FragColor = vec4(vColor);
        }
      `,
      cullFace: null,
      transparent: true
    })

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const mesh = new Mesh(gl, {
      geometry,
      program,
      mode: gl.TRIANGLES
    })
    mesh.setParent(this.scene)
  }
}

const demo = new Demo(document.getElementById('demo') as HTMLDivElement, {
  gridSize: 40,
  jitter: 10
})

// demo.renderPoints()
// demo.renderEdges()
demo.renderCenters()
// demo.renderTriangles()
demo.renderCellEdges()
demo.renderCells()
