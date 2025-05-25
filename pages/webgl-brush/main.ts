import {
  Camera,
  Geometry,
  Mesh,
  OGLRenderingContext,
  Program,
  Renderer,
  InstancedMesh,
  Transform,
  Color
} from 'ogl'
import { Pane } from 'tweakpane'

interface Params {
  radius: number
  opacity: number
  sharpness: number
  color: string
}

class Brush {
  private dom: HTMLDivElement
  private width: number = 0
  private height: number = 0
  private renderer: Renderer
  private gl: OGLRenderingContext
  private camera: Camera
  private scene: Transform
  private dpr: number = 2
  private isDrawing: boolean = false
  private params: Params
  private currentPosition: [number, number] = [0, 0]
  private positions: [number, number][] = []
  private helper?: Mesh

  constructor(dom: HTMLDivElement, params: Params) {
    this.dom = dom
    this.params = params

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
    this.gl.clearColor(1, 1, 1, 0)
    this.dom.appendChild(this.gl.canvas)

    this.scene = new Transform()

    this.animate()

    this.setup()
  }

  resize() {
    const _resize = () => {
      this.width = this.dom.clientWidth
      this.height = this.dom.clientHeight
      this.dpr = Math.min(window.devicePixelRatio, 2)

      this.renderer.dpr = this.dpr
      this.renderer.setSize(this.width, this.height)

      this.camera.orthographic({
        left: 0,
        right: this.width,
        top: this.height,
        bottom: 0
      })
    }
    window.addEventListener('resize', _resize, false)
    _resize()
  }

  animate() {
    const _animate = (t: number) => {
      requestAnimationFrame(_animate)
      this.renderer.render({ scene: this.scene, camera: this.camera })
    }
    requestAnimationFrame(_animate)
  }

  setup() {
    this.initHelper()
    this.bindEvents()
  }

  bindEvents() {
    this.dom.addEventListener('mousedown', () => {
      this.isDrawing = true
    })
    this.dom.addEventListener('mouseup', () => {
      this.isDrawing = false
    })
    this.dom.addEventListener('mouseleave', () => {
      this.isDrawing = false
    })
    this.dom.addEventListener('mousemove', (e) => {
      const rect = this.dom.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = this.height - (e.clientY - rect.top)
      this.helper?.position.set(x, y, 0)
    })
  }

  draw(position: [number, number]) {
    if (!this.isDrawing) return
    const gl = this.gl
  }

  initHelper() {
    const gl = this.gl
    const segments = 64
    const color = new Color(this.params.color)

    const indices = new Float32Array(segments + 2) // +2: 包括圆心 & 回到起点
    for (let i = 0; i <= segments + 1; i++) {
      indices[i] = i
    }

    const geometry = new Geometry(this.gl, {
      vertexId: {
        // 只传入索引，不传入位置
        size: 1,
        data: indices
      }
    })
    const program = new Program(this.gl, {
      vertex: `
        attribute float vertexId;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform float uSegments;
        uniform float uOpacity;
        uniform float uRadius;
        uniform vec3 uColor;
        varying float vOpacity;
        varying vec3 vColor;

        void main() {
          float angle;
          vec2 pos;
          // 根据索引计算位置
          if (vertexId == 0.0) {
            angle = 0.0;
            pos = vec2(0.0, 0.0);
          } else {
            angle = (vertexId - 1.0) / uSegments * 2.0 * 3.14159;
            pos = vec2(cos(angle), sin(angle));
          }
          vOpacity = uOpacity;
          vColor = uColor;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos * uRadius, 0.0, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        varying float vOpacity;
        varying vec3 vColor;

        void main() {
          gl_FragColor = vec4(vColor, vOpacity);
        }
      `,
      transparent: true,
      uniforms: {
        uSegments: {
          value: segments
        },
        uOpacity: {
          value: this.params.opacity
        },
        uRadius: {
          value: this.params.radius
        },
        uColor: {
          value: color
        }
      }
    })
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    this.helper = new Mesh(gl, {
      geometry,
      program,
      mode: gl.TRIANGLE_FAN
    })
    this.helper.position.set(
      this.currentPosition[0],
      this.currentPosition[1],
      0
    )
    this.helper.setParent(this.scene)
  }

  update(params: Params) {
    if (!this.helper) return
    this.params = params
    this.helper.program.uniforms.uOpacity.value = params.opacity
    this.helper.program.uniforms.uRadius.value = params.radius
    this.helper.program.uniforms.uColor.value = new Color(params.color)
  }
}

const params: Params = {
  radius: 15,
  opacity: 0.3,
  color: '#000000',
  sharpness: 1
}

const brush = new Brush(
  document.getElementById('demo') as HTMLDivElement,
  params
)

const pane = new Pane({
  title: 'WebGL Brush'
})
pane
  .addBinding(params, 'radius', {
    min: 1,
    max: 40,
    step: 1
  })
  .on('change', (e) => {
    if (e.last) {
      brush.update(params)
    }
  })

pane
  .addBinding(params, 'opacity', {
    min: 0,
    max: 1,
    step: 0.01
  })
  .on('change', (e) => {
    if (e.last) {
      brush.update(params)
    }
  })

pane.addBinding(params, 'sharpness', {
  min: 1,
  max: 10,
  step: 1
})

pane
  .addBinding(params, 'color', {
    view: 'color'
  })
  .on('change', (e) => {
    if (e.last) {
      brush.update(params)
    }
  })
