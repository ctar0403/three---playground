import {
  AmbientLight,
  AxesHelper,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshNormalMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Scene,
  TorusKnotGeometry,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

class View {
  private width: number
  private height: number
  private pixelRatio: number
  private canvas: HTMLElement
  private scene: Scene
  private mainCamera: PerspectiveCamera
  private frontCamera: OrthographicCamera
  private topCamera: OrthographicCamera
  private sideCamera: OrthographicCamera
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
    this.mainCamera = new PerspectiveCamera(
      75,
      (this.width * 0.75) / this.height,
      0.001,
      1000
    )
    this.mainCamera.position.set(3, 3, 3)
    this.mainCamera.lookAt(0, 0, 0)

    this.frontCamera = new OrthographicCamera(
      (this.width * 0.75) / -250,
      (this.width * 0.75) / 250,
      this.height / 250,
      this.height / -250,
      0.1,
      1000
    )
    this.frontCamera.position.set(0, 0, 3)
    this.frontCamera.lookAt(0, 0, 0)

    this.topCamera = new OrthographicCamera(
      (this.width * 0.75) / -250,
      (this.width * 0.75) / 250,
      this.height / 250,
      this.height / -250,
      0.1,
      1000
    )
    this.topCamera.position.set(0, 3, 0)
    this.topCamera.lookAt(0, 0, 0)

    this.sideCamera = new OrthographicCamera(
      (this.width * 0.75) / -250,
      (this.width * 0.75) / 250,
      this.height / 250,
      this.height / -250,
      0.1,
      1000
    )
    this.sideCamera.position.set(3, 0, 0)
    this.sideCamera.lookAt(0, 0, 0)

    this.scene.add(this.mainCamera)
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    })

    this.renderer.setSize(this.width, this.height)

    this.renderer.setPixelRatio(this.pixelRatio)

    this.controls = new OrbitControls(this.mainCamera, this.canvas)
    this.controls.enableDamping = true
    this.clock = new Clock()

    this.group = new Group()

    this.params = {
      rotate: true
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

      this.mainCamera.aspect = this.width / 2 / this.height
      this.mainCamera.updateProjectionMatrix()
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(this.pixelRatio)

      const orthoWidth = (this.width * 0.75) / 250
      const orthoHeight = this.height / 250
      this.frontCamera.left = -orthoWidth
      this.frontCamera.right = orthoWidth
      this.frontCamera.top = orthoHeight
      this.frontCamera.bottom = -orthoHeight
      this.frontCamera.updateProjectionMatrix()

      this.topCamera.left = -orthoWidth
      this.topCamera.right = orthoWidth
      this.topCamera.top = orthoHeight
      this.topCamera.bottom = -orthoHeight
      this.topCamera.updateProjectionMatrix()

      this.sideCamera.left = -orthoWidth
      this.sideCamera.right = orthoWidth
      this.sideCamera.top = orthoHeight
      this.sideCamera.bottom = -orthoHeight
      this.sideCamera.updateProjectionMatrix()
    })
  }

  animate() {
    const delta = this.clock.getDelta()

    if (this.params.rotate) {
      this.group.rotation.y += delta / 2
    }

    this.renderer.setScissorTest(true)
    // 主视图，左侧 3/4
    this.renderer.setClearColor(new Color().setHex(0xfff7ed))
    this.renderer.setViewport(0, 0, this.width * 0.75, this.height)
    this.renderer.setScissor(0, 0, this.width * 0.75, this.height)
    this.renderer.render(this.scene, this.mainCamera)

    // 正视图，右侧 1/4 上部
    this.renderer.setClearColor(new Color().setHex(0xe0e7ff))
    this.renderer.setViewport(
      this.width * 0.75,
      this.height * 0.66666666,
      this.width * 0.25,
      this.height * 0.33333333
    )
    this.renderer.setScissor(
      this.width * 0.75,
      this.height * 0.66666666,
      this.width * 0.25,
      this.height * 0.33333333
    )
    this.renderer.setScissorTest(true)
    this.renderer.render(this.scene, this.frontCamera)

    // 俯视图，右侧中部
    this.renderer.setClearColor(new Color().setHex(0xd1fae5))
    this.renderer.setViewport(
      this.width * 0.75,
      this.height * 0.33333333,
      this.width * 0.25,
      this.height * 0.33333333
    )
    this.renderer.setScissor(
      this.width * 0.75,
      this.height * 0.33333333,
      this.width * 0.25,
      this.height * 0.33333333
    )
    this.renderer.setScissorTest(true)
    this.renderer.render(this.scene, this.topCamera)

    // 侧视图，右侧底部
    this.renderer.setClearColor(new Color().setHex(0xfecdd3))
    this.renderer.setViewport(
      this.width * 0.75,
      0,
      this.width * 0.25,
      this.height * 0.33333333
    )
    this.renderer.setScissor(
      this.width * 0.75,
      0,
      this.width * 0.25,
      this.height * 0.33333333
    )
    this.renderer.setScissorTest(true)
    this.renderer.render(this.scene, this.sideCamera)

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

    const box = new TorusKnotGeometry(1, 0.3, 100, 16)
    const material = new MeshNormalMaterial({
      wireframe: true
    })

    const mesh = new Mesh(box, material)
    mesh.castShadow = true
    mesh.receiveShadow = true

    const axesHelper = new AxesHelper(3)
    this.scene.add(axesHelper)
    this.group.add(mesh)
  }

  addPane() {
    const pane = new Pane({
      title: 'Multiple Views'
    })
    pane.addBinding(this.params, 'rotate')
  }
}

const view = new View('canvas.webgl')
