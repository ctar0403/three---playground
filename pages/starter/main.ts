import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Clock,
  Color,
  DirectionalLight,
  Group,
  Line,
  LinearSRGBColorSpace,
  LineBasicMaterial,
  Mesh,
  MeshNormalMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three'
import {
  Line2,
  LineGeometry,
  LineMaterial,
  OrbitControls
} from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

class View {
  private width: number
  private height: number
  private pixelRatio: number
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
    this.pixelRatio = Math.min(window.devicePixelRatio, 2)
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(
      75,
      this.width / this.height,
      0.001,
      1000
    )
    this.camera.position.set(0, 0, 3)
    this.scene.add(this.camera)
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    })

    this.renderer.setSize(this.width, this.height)

    this.renderer.setPixelRatio(this.pixelRatio)

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
      this.renderer.setPixelRatio(this.pixelRatio)
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
    // this.group.add(mesh)

    const lineMat = new LineBasicMaterial({
      color: 0xffffff,
      linewidth: 20
    })
    const lineGeom = new BufferGeometry().setFromPoints([
      new Vector3(-1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(1, 0, 0)
    ])
    const line1 = new Line(lineGeom, lineMat)

    const lineGeom2 = new LineGeometry()
    lineGeom2.setPositions([-1, 0, 0, 1, 0, 0])
    const lineMat2 = new LineMaterial({
      color: new Color('red'),
      linewidth: 15
      // wireframe: true
    })
    const line2 = new Line2(lineGeom2, lineMat2)

    this.group.add(line1)
    this.group.add(line2)
  }

  addPane() {
    const pane = new Pane({
      title: 'Starter'
    })
    pane.addBinding(this.params, 'rotate')
  }
}

const view = new View('canvas.webgl')
