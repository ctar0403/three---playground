import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Clock,
  DirectionalLight,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
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

  private group: Group
  private params: {
    rotate: boolean
  }

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.set(0, 0, 3)
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

    this.group = new Group()

    this.params = {
      rotate: false
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

    if (this.params.rotate) {
      this.group.rotation.y += delta / 2
    }

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

  addGroup() {
    this.scene.add(this.group)

    const box = new BoxGeometry(1, 1, 1)
    const material = new MeshNormalMaterial({})

    const mesh = new Mesh(box, material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    this.group.add(mesh)
  }

  addPane() {
    const pane = new Pane({
      title: 'Parameters'
    })
    pane.addBinding(this.params, 'rotate')
  }
}

const view = new View('canvas.webgl')
