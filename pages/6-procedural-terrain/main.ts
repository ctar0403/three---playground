import {
  ACESFilmicToneMapping,
  AmbientLight,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  LinearSRGBColorSpace,
  Mesh,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three'
import { ImprovedNoise, OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

class View {
  private width: number
  private height: number
  private canvas: HTMLElement
  private scene: Scene
  private camera: PerspectiveCamera
  private renderer: WebGLRenderer
  private controls: OrbitControls
  private clock: Clock

  private terrain: Mesh<PlaneGeometry, MeshLambertMaterial> | undefined
  private params: {
    wireframe: boolean
    rotate: boolean
    seed: number
    scale: number
    height: number
  }

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.set(40, 80, 100)
    this.scene.add(this.camera)
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    })
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.9
    this.renderer.outputColorSpace = LinearSRGBColorSpace
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.clock = new Clock()

    this.params = {
      wireframe: false,
      rotate: false,
      seed: 0,
      scale: 10,
      height: 5
    }

    this.resize()
    this.addLight()
    this.addGroup()
    this.animate()
    this.addPane()
  }

  resize() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth
      this.height = window.innerHeight

      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()

      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })
  }

  animate() {
    const delta = this.clock.getDelta()

    this.renderer.render(this.scene, this.camera)
    this.controls.update()
    window.requestAnimationFrame(this.animate.bind(this))
  }

  addLight() {
    const ambientLight = new AmbientLight(0xffffff, 4)
    this.scene.add(ambientLight)

    const directionalLight = new DirectionalLight(0xffffff, Math.PI)
    directionalLight.position.set(4, 0, 2)
    directionalLight.castShadow = true
    this.scene.add(directionalLight)
  }

  updateGeometry() {
    if (!this.terrain) return
    const perlin = new ImprovedNoise()
    const vertices = this.terrain.geometry.attributes.position
    const colors = []

    const colorBands = [
      { height: 0.0, color: new Color(0x33aa33) }, // 绿色
      { height: 0.5, color: new Color(0xffff00) }, // 黄色
      { height: 0.75, color: new Color(0x8b4513) }, // 棕色
      { height: 1.0, color: new Color(0xffffff) } // 白色
    ]

    function getColorFromBands(
      normalizedHeight: number,
      bands: { height: number; color: Color }[]
    ) {
      for (let i = 0; i < bands.length - 1; i++) {
        const start = bands[i]
        const end = bands[i + 1]
        if (
          normalizedHeight >= start.height &&
          normalizedHeight <= end.height
        ) {
          const t =
            (normalizedHeight - start.height) / (end.height - start.height)
          const color = new Color()
          color.lerpColors(start.color, end.color, t)
          return color
        }
      }
      return bands[bands.length - 1].color // 如果超出范围，返回最高高度的颜色
    }

    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i)
      const z = vertices.getZ(i)
      const y =
        perlin.noise(
          x / this.params.scale + this.params.seed,
          z / this.params.scale + this.params.seed,
          0
        ) * this.params.height
      vertices.setY(i, y)

      const normalizedHeight =
        (y + this.params.height) / (2 * this.params.height)
      const color = getColorFromBands(normalizedHeight, colorBands)
      colors.push(color.r, color.g, color.b)
    }
    vertices.needsUpdate = true
    this.terrain.geometry.setAttribute(
      'color',
      new Float32BufferAttribute(colors, 3)
    )
    this.terrain.geometry.attributes.color.needsUpdate = true
  }

  addGroup() {
    const geometry = new PlaneGeometry(100, 100, 200, 200)
    geometry.rotateX(-Math.PI / 2)

    const material = new MeshLambertMaterial({
      wireframe: this.params.wireframe,
      vertexColors: true,
      side: DoubleSide
    })

    this.terrain = new Mesh(geometry, material)
    this.updateGeometry()

    this.scene.add(this.terrain)
  }

  addPane() {
    const pane = new Pane({
      title: 'Parameters'
    })
    pane.addBinding(this.params, 'wireframe').on('change', (e) => {
      if (this.terrain) {
        this.terrain.material.wireframe = e.value
      }
    })
    pane
      .addBinding(this.params, 'seed', {
        min: 0,
        max: 100
      })
      .on('change', () => {
        this.updateGeometry()
      })
    pane
      .addBinding(this.params, 'scale', {
        min: 1,
        max: 20
      })
      .on('change', () => {
        if (this.terrain) {
          this.updateGeometry()
        }
      })
    pane
      .addBinding(this.params, 'height', {
        min: 0.2,
        max: 80
      })
      .on('change', () => {
        if (this.terrain) {
          this.updateGeometry()
        }
      })
  }
}

const view = new View('canvas.webgl')
