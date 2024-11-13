import {
  ACESFilmicToneMapping,
  AmbientLight,
  Clock,
  DirectionalLight,
  EquirectangularReflectionMapping,
  IcosahedronGeometry,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  TextureLoader,
  WebGLRenderer
} from 'three'
import { OrbitControls, RGBELoader } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

const params = {
  scale: 0.15,
  wireframe: false,
  light: false,
  rotate: true
}

const canvas = document.querySelector('canvas.webgl') as HTMLElement
const scene = new Scene()

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const camera = new PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000)

camera.position.set(0, 0, 3)
scene.add(camera)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

const renderer = new WebGLRenderer({
  canvas: canvas,
  antialias: true
})

renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 0.9
renderer.outputColorSpace = LinearSRGBColorSpace
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// load HDR environment map
const rgbeLoader = new RGBELoader()
rgbeLoader.load('./assets/venice_sunset_1k.hdr', (texture) => {
  texture.mapping = EquirectangularReflectionMapping
  scene.environment = texture
})

const ambientLight = new AmbientLight(0xffffff, 4)
ambientLight.visible = params.light
scene.add(ambientLight)

const directionalLight = new DirectionalLight(0xffffff, Math.PI)
directionalLight.position.set(4, 0, 2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.width = 2048
directionalLight.shadow.mapSize.height = 2048
directionalLight.shadow.camera.left = -2
directionalLight.shadow.camera.right = 2
directionalLight.shadow.camera.top = 2
directionalLight.shadow.camera.bottom = -2
directionalLight.shadow.camera.near = 0.1
directionalLight.shadow.camera.far = 8

scene.add(directionalLight)

const loader = new TextureLoader()
const texture = loader.load('./assets/worldColour.5400x2700.jpg')
texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
const earth = new Mesh(
  new IcosahedronGeometry(1, 128),
  new MeshStandardMaterial({
    map: texture,
    displacementMap: loader.load('./assets/gebco_bathy_2700x1350.jpg'),
    displacementScale: params.scale
  })
)
earth.castShadow = true
earth.receiveShadow = true
scene.add(earth)

const pane = new Pane({
  title: 'Parameters'
})
pane
  .addBinding(params, 'scale', {
    min: -0.4,
    max: 0.5,
    step: 0.001
  })
  .on('change', (e) => {
    earth.material.displacementScale = e.value
  })
pane.addBinding(params, 'wireframe').on('change', (e) => {
  earth.material.wireframe = e.value
})
pane.addBinding(params, 'light').on('change', (e) => {
  ambientLight.visible = e.value
})
pane.addBinding(params, 'rotate')

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const clock = new Clock()
function animate() {
  const delta = clock.getDelta()
  if (params.rotate) {
    earth.rotation.y += delta / 12
  }

  renderer.render(scene, camera)
  controls.update()
  window.requestAnimationFrame(animate)
}

animate()
