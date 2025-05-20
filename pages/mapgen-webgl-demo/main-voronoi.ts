// import Delaunator from 'delaunator'
import { Delaunay, Voronoi } from 'd3-delaunay'
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
import { NoiseOptions } from '../mapgen-demo/utils'
import { Pane } from 'tweakpane'

type Point = {
  x: number
  y: number
}

type Params = {
  gridSize: number
  jitter: number
  margin: number
  noise: NoiseOptions
  display: {
    points?: boolean
    edges?: boolean
    centers?: boolean
    triangles?: boolean
    cellEdges?: boolean
    cells?: boolean
  }
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
  private delaunay!: Delaunay<Float64Array<ArrayBufferLike>>
  private voronoi!: Voronoi<Float64Array<ArrayBufferLike>>

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
    this.delaunay = Delaunay.from(
      this.points,
      (p) => p.x,
      (p) => p.y
    )
    this.voronoi = this.delaunay.voronoi([0, 0, this.width, this.height])
  }

  // 获取同一三角形中 顺时针的下一条边
  nextHalfedge(e: number) {
    return e % 3 === 2 ? e - 2 : e + 1
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
          gl_PointSize = 6.0;
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

    // 启用混合（使透明度生效）
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const mesh = new Mesh(gl, {
      geometry,
      program,
      mode: gl.LINES
    })
    mesh.setParent(this.scene)
  }

  renderCenters() {
    const gl = this.gl
    const centers = this.voronoi.circumcenters

    const geometry = new Geometry(gl, {
      position: {
        size: 2,
        data: new Float32Array(centers)
      }
    })
    const program = new Program(gl, {
      vertex: `
        attribute vec2 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;

        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 0.0, 1.0);
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
    const cells = Array.from({ length: this.points.length }, (_, i) =>
      this.voronoi.cellPolygon(i)
    )

    // 会有重复边
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]
      for (let j = 0; j < cell.length - 1; j++) {
        const a = cell[j]
        const b = cell[j + 1]
        positions.push(a[0], a[1], 0, b[0], b[1], 0)
      }
      const a = cell[cell.length - 1]
      const b = cell[0]
      positions.push(a[0], a[1], 0, b[0], b[1], 0)
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
    const voronoi = this.voronoi
    let indexOffset = 0
    const gl = this.gl
    const positions: number[] = []
    const indices: number[] = []
    const colors: number[] = []

    const polygons = Array.from({ length: this.points.length }, (_, i) =>
      voronoi.cellPolygon(i)
    )

    for (let i = 0; i < polygons.length; i++) {
      const p = polygons[i]
      const flat = p.flat()
      const color = getColor(i / polygons.length)
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

  render() {
    const display = this.params.display
    display.points && this.renderPoints()
    display.edges && this.renderEdges()
    display.centers && this.renderCenters()
    display.triangles && this.renderTriangles()
    display.cellEdges && this.renderCellEdges()
    display.cells && this.renderCells()
  }

  rerender(params: Params) {
    this.params = params
    this.scene = new Transform()
    this.generatePoints()
    this.generateDelaunay()
    // for (const child of this.scene.children) {
    //   child.setParent(null)
    // }
    this.render()
  }
}

const params: Params = {
  gridSize: 40,
  jitter: 10,
  margin: 0,
  noise: {
    seed: 1994
  },
  display: {
    points: false,
    edges: false,
    centers: false,
    triangles: false,
    cellEdges: false,
    cells: false
  }
}

const demo = new Demo(document.getElementById('demo') as HTMLDivElement, params)
demo.render()

const pane = new Pane({
  title: 'mapgen-webgl-demo'
})

pane
  .addBinding(params, 'gridSize', {
    min: 8,
    max: 50,
    step: 1
  })
  .on('change', (e) => {
    if (e.last) {
      demo.rerender(params)
    }
  })

const display = pane.addFolder({
  title: 'display'
})
display.addBinding(params.display, 'points').on('change', (e) => {
  demo.rerender(params)
})
display.addBinding(params.display, 'edges').on('change', (e) => {
  demo.rerender(params)
})
display.addBinding(params.display, 'centers').on('change', (e) => {
  demo.rerender(params)
})
display.addBinding(params.display, 'triangles').on('change', (e) => {
  demo.rerender(params)
})
display.addBinding(params.display, 'cellEdges').on('change', (e) => {
  demo.rerender(params)
})
display.addBinding(params.display, 'cells').on('change', (e) => {
  demo.rerender(params)
})
