import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  InstancedMesh,
  LinearSRGBColorSpace,
  MathUtils,
  MeshLambertMaterial,
  MeshPhongMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector2,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { FBM } from './../../lib/three-noise'
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

  private terrain: InstancedMesh<BoxGeometry, MeshPhongMaterial> | undefined
  private params: {
    colors: {
      [key: string]: {
        value: number
        color: string
      }
    }
    display: {
      heightMap: boolean
    }
    generation: {
      seed: number
      height: number
      scale: number
      detail: number
      fuzzyness: number
      resolution: number
    }
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
      colors: {
        snow: {
          value: 0.6,
          color: '#9aa7ad'
        },
        stone: {
          value: 0.36,
          color: '#656565'
        },
        forest: {
          value: 0.29,
          color: '#586647'
        },
        shrub: {
          value: 0.1,
          color: '#9ea667'
        },
        beach: {
          value: 0.04,
          color: '#efb28f'
        },
        shore: {
          value: 0.01,
          color: '#ffd68f'
        },
        water: {
          value: 0.12,
          color: '#00a9ff'
        }
      },
      display: {
        heightMap: false
      },
      generation: {
        seed: Math.random(),
        height: 1,
        scale: 0.3,
        detail: 0.5,
        fuzzyness: 0.2,
        resolution: 0.3
      }
    }

    this.resize()
    this.addLight()
    this.createDataBlock()
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

  getColor(height: number) {
    const colors = this.params.colors
    // if (this.params.display.heightMap) {
    // } else {
    const assetType = (() => {
      if (height <= colors.water.value) {
        return 'water'
      } else if (height <= colors.water.value + colors.shore.value) {
        return 'shore'
      } else if (height <= colors.water.value + colors.beach.value) {
        return 'beach'
      } else if (height <= colors.water.value + colors.shrub.value) {
        return 'shrub'
      } else if (height <= colors.water.value + colors.forest.value) {
        return 'forest'
      } else if (height <= colors.water.value + colors.stone.value) {
        return 'stone'
      } else {
        return 'snow'
      }
    })()
    const color = new Color(colors[assetType].color)

    return color
    // }
  }

  generate() {
    console.log('params', this.params)
    if (this.terrain) {
      this.scene.remove(this.terrain)
      this.terrain = undefined
    }

    this.createDataBlock()
  }

  createSurface() {
    const INTRINSIC_TERRAIN_MAX_SIZE = 500
    const VISIBLE_MAP_SIZE = 8

    const resolution = this.params.generation.resolution
    const surface: Vector2[] = []
    const terrainSize = Math.max(INTRINSIC_TERRAIN_MAX_SIZE * resolution, 20)
    const scale = VISIBLE_MAP_SIZE / terrainSize
    for (let x = -terrainSize / 2; x < terrainSize / 2; x++) {
      for (let y = -terrainSize / 2; y < terrainSize / 2; y++) {
        surface.push(new Vector2(x, y))
      }
    }
    return { surface, scale }
  }

  createDataBlock() {
    const seed = this.params.generation.seed
    const detail = this.params.generation.detail
    const fuzzyness = this.params.generation.fuzzyness
    const generationScale = this.params.generation.scale
    const generationHeight = this.params.generation.height
    const fbm = new FBM({
      seed: seed,
      persistance: fuzzyness * 2,
      lacunarity: detail * 4
    })

    const boxGeometry = new BoxGeometry()
    const material = new MeshPhongMaterial()

    const { surface, scale } = this.createSurface()

    const mesh = new InstancedMesh(boxGeometry, material, surface.length)
    const emptyObject = new Object3D()

    surface.map((point, i) => {
      const scaledVector = point.clone().multiplyScalar(scale * generationScale)
      const realHeight = Math.pow(
        MathUtils.mapLinear(fbm.get2(scaledVector), -1, 1, 0, 1),
        2
      )

      const color = this.getColor(realHeight)
      const x = point.x,
        y = point.y,
        z = realHeight * 30

      emptyObject.position.set(x, y, z)
      emptyObject.updateMatrix()
      mesh.setMatrixAt?.(i, emptyObject.matrix)
      mesh.setColorAt?.(i, color)
    })

    mesh.rotateX(-Math.PI / 2)
    mesh.scale.set(scale, scale, scale)
    this.terrain = mesh
    this.scene.add(this.terrain)
  }

  addPane() {
    const pane = new Pane({
      title: 'Parameters'
    })
    const colors = pane.addFolder({
      title: 'colors'
    })
    const colorObj: Record<string, string> = {}
    Object.keys(this.params.colors).forEach((color) => {
      colorObj[color] = this.params.colors[color].color
      colors
        .addBinding(colorObj, color, {
          view: 'color'
        })
        .on('change', (e) => {
          this.params.colors[e.target.key].color = e.value
          this.generate()
        })
    })

    const display = pane.addFolder({
      title: 'display'
    })

    display
      .addBinding(this.params.display, 'heightMap', {
        label: 'heightMap'
      })
      .on('change', () => {})

    const generation = pane.addFolder({
      title: 'generation'
    })

    Object.keys(this.params.generation).forEach((key: any) => {
      generation
        .addBinding(this.params.generation, key, {
          min: 0,
          max: 1,
          step: 0.01
        })
        .on('change', () => {
          this.generate()
        })
    })

    pane
      .addButton({
        title: 'regenerate'
      })
      .on('click', () => {
        this.params.generation.seed = Math.random()
        this.generate()
      })
  }
}

const view = new View('canvas.webgl')
