import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  Clock,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Group,
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
  surface: 'normal',
  scale: 0.05,
  wireframe: false,
  cloud: false,
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

const group = new Group()
scene.add(group)

const loader = new TextureLoader()
const normalTexture = loader.load('./assets/worldColour.5400x2700.jpg')
const nightTexture = loader.load('./assets/BlackMarble_2016_01deg.jpg')

const earthGeometry = new IcosahedronGeometry(1, 128)
const earthMaterial = new MeshStandardMaterial({
  map: normalTexture,
  displacementMap: loader.load('./assets/gebco_bathy_2700x1350.jpg'),
  displacementScale: params.scale
})

const earth = new Mesh(earthGeometry, earthMaterial)
earth.castShadow = true
earth.receiveShadow = true

const cloudMaterial = new MeshStandardMaterial({
  alphaMap: loader.load('./assets/cloud_combined_2048.jpg'),
  transparent: true,
  opacity: 0.3
})
const cloud = new Mesh(earthGeometry, cloudMaterial)
cloud.scale.setScalar(1.05)
cloud.visible = params.cloud

group.add(earth)
group.add(cloud)

const pane = new Pane({
  title: 'Parameters'
})
pane
  .addBinding(params, 'surface', {
    options: {
      normal: 'normal',
      night: 'night'
    }
  })
  .on('change', (e) => {
    if (e.value === 'night') {
      earth.material.map = nightTexture
    } else {
      earth.material.map = normalTexture
    }
  })
pane
  .addBinding(params, 'scale', {
    min: -0.4,
    max: 0.5,
    step: 0.001
  })
  .on('change', (e) => {
    earth.material.displacementScale = e.value
    cloud.scale.addScalar(e.value)
  })
pane.addBinding(params, 'wireframe').on('change', (e) => {
  earth.material.wireframe = e.value
})
pane.addBinding(params, 'cloud').on('change', (e) => {
  cloud.visible = e.value
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
    cloud.rotation.y += delta / 11
  }

  renderer.render(scene, camera)
  controls.update()
  window.requestAnimationFrame(animate)
}

animate()
