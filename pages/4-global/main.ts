import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferGeometry,
  Clock,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Group,
  IcosahedronGeometry,
  LinearFilter,
  LinearMipMapLinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  TextureLoader,
  Vector3,
  WebGLRenderer
} from 'three'
import { OrbitControls, RGBELoader } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'
import cityData from './assets/city.json'

const params = {
  surface: 'normal',
  scale: 0.05,
  wireframe: false,
  cloud: false,
  light: false,
  rotate: true
}

function latLonToSphereCoord(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = lon * (Math.PI / 180)

  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return { x, y, z }
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

scene.add(directionalLight)

const group = new Group()
scene.add(group)

const loader = new TextureLoader()
const normalTexture = loader.load('./assets/worldColour.5400x2700.jpg')
normalTexture.minFilter = LinearMipMapLinearFilter
normalTexture.magFilter = LinearFilter

const nightTexture = loader.load('./assets/BlackMarble_2016_01deg.jpg')

const earthGeometry = new IcosahedronGeometry(1, 128)
const earthMaterial = new MeshStandardMaterial({
  map: normalTexture
})

const earth = new Mesh(earthGeometry, earthMaterial)
earth.castShadow = true
earth.receiveShadow = true

group.add(earth)

// city
const pointsGeometry = new BufferGeometry()
const points = cityData.features.map((feature) => {
  const [lon, lat] = feature.geometry.coordinates
  const pos = latLonToSphereCoord(lat, lon, 1 + 0.01)
  return new Vector3(pos.x, pos.y, pos.z)
})
pointsGeometry.setFromPoints(points)
const pointsMaterial = new PointsMaterial({ color: 0xff0000, size: 0.02 })
const pointsMesh = new Points(pointsGeometry, pointsMaterial)
group.add(pointsMesh)

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
    group.rotation.y += delta / 12
  }

  renderer.render(scene, camera)
  controls.update()
  window.requestAnimationFrame(animate)
}

animate()
