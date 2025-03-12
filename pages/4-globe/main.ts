import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Clock,
  DirectionalLight,
  LinearSRGBColorSpace,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'
import cities from './assets/data'

function latLonToCartesian(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = lon * (Math.PI / 180)
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return { x, y, z }
}

const params = {
  rotate: true
}

const canvas = document.querySelector('canvas.webgl') as HTMLElement
const scene = new Scene()

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const camera = new PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1500)
camera.position.setZ(1500)
scene.add(camera)
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

const renderer = new WebGLRenderer({
  canvas: canvas,
  antialias: true
})

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const ambientLight = new AmbientLight(0xffffff, 15)
scene.add(ambientLight)

const globeGeometry = new BufferGeometry()
const globeMaterial = new PointsMaterial({
  color: 0xffffff,
  size: 0.6,
  transparent: false,
  opacity: 1
})

const vertices: number[] = []
cities.forEach((city) => {
  const { x, y, z } = latLonToCartesian(city[0], city[1], 500)
  vertices.push(x, y, z)
})

globeGeometry.setAttribute(
  'position',
  new BufferAttribute(new Float32Array(vertices), 3)
)
globeGeometry.attributes.position.needsUpdate = true

const points = new Points(globeGeometry, globeMaterial)
points.castShadow = true
points.receiveShadow = true

scene.add(points)

const pane = new Pane({
  title: 'Globe'
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

function animate() {
  const time = Date.now() * 0.00005
  const hue = ((360 * (1.0 + time)) % 360) / 360
  globeMaterial.color.setHSL(hue, 0.6, 0.6)

  if (params.rotate) {
    points.rotation.y += 0.006
  }

  renderer.render(scene, camera)
  controls.update()
  window.requestAnimationFrame(animate)
}

animate()
