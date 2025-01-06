import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  TextureLoader,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'
import {
  eciToEcf,
  EciVec3,
  gstime,
  propagate,
  twoline2satrec,
  sgp4,
  SatRec
} from 'satellite.js'
import tle from './assets/tle.json'

const earthRadius = 6378.137
const eartSegments = 72

function jday(
  year: number,
  month: number,
  day: number,
  hr: number,
  minute: number,
  sec: number
): number {
  return (
    367.0 * year -
    Math.floor(7 * (year + Math.floor((month + 9) / 12.0)) * 0.25) +
    Math.floor((275 * month) / 9.0) +
    day +
    1721013.5 +
    ((sec / 60.0 + minute) / 60.0 + hr) / 24.0
  )
}

// function calcPositions() {
//   const satCache: SatRec[] = []
//   Object.values(tle).forEach((i) => {
//     const satrec = twoline2satrec(i.tle[1], i.tle[2])
//     // const positionAndVelocity = propagate(satrec, new Date())

//     // const positionEci = positionAndVelocity.position as EciVec3<number>
//     // const gmst = gstime(new Date())
//     // if (positionEci) {
//     //   const positionEcf = eciToEcf(positionEci, gmst)

//     //   satellites.push({
//     //     ...i,
//     //     position: positionEcf
//     //   })
//     // }
//     satCache.push(satrec)
//   })

//   const satPos = new Float32Array(satCache.length * 3)
//   const satVel = new Float32Array(satCache.length * 3)

//   var now = new Date()
//   var j = jday(
//     now.getUTCFullYear(),
//     now.getUTCMonth() + 1,
//     now.getUTCDate(),
//     now.getUTCHours(),
//     now.getUTCMinutes(),
//     now.getUTCSeconds()
//   )
//   j += now.getUTCMilliseconds() * 1.15741e-8 //days per millisecond

//   for (let i = 0; i < satCache.length; i++) {
//     const m = (j - satCache[i].jdsatepoch) * 1440.0
//     // const pv = sgp4(satCache[i], m)
//     const pv = propagate(satCache[i], new Date())
//     let x = 0,
//       y = 0,
//       z = 0,
//       vx = 0,
//       vy = 0,
//       vz = 0

//     if (pv) {
//       x = pv.position ? pv.position.x : 0
//       y = pv.position ? pv.position.y : 0
//       z = pv.position ? pv.position.z : 0
//       vx = pv.velocity ? pv.velocity.x : 0
//       vy = pv.velocity ? pv.velocity.y : 0
//       vz = pv.velocity ? pv.velocity.z : 0
//     }

//     satPos[i * 3] = x / 1000
//     satPos[i * 3 + 1] = y / 1000
//     satPos[i * 3 + 2] = z / 1000

//     satVel[i * 3] = vx / 1000
//     satVel[i * 3 + 1] = vy / 1000
//     satVel[i * 3 + 2] = vz / 1000
//   }

//   return {
//     satPos,
//     satVel,
//     satCache
//   }
// }

const worker = new Worker(new URL('./work.js', import.meta.url), {
  type: 'module'
})

let particleGeometry = new BufferGeometry()
const satCache: SatRec[] = []
Object.values(tle).forEach((i) => {
  const satrec = twoline2satrec(i.tle[1], i.tle[2])
  satCache.push(satrec)
})

let satPosition = new Float32Array(satCache.length * 3)

worker.onmessage = (event) => {
  const { position } = event
  satPosition = position

  console.log(2222223, satPosition)

  particleSystem.geometry.attributes.position = new BufferAttribute(
    satPosition,
    3
  )
  particleGeometry.attributes.position.needsUpdate = true
}

worker.postMessage({
  tle: tle
})

const params = {
  rotate: false
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

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const ambientLight = new AmbientLight(0xffffff, 4)
scene.add(ambientLight)

const group = new Group()
scene.add(group)

const loader = new TextureLoader()
const normalTexture = loader.load('./assets/worldColour.5400x2700.jpg')
const nightTexture = loader.load('./assets/BlackMarble_2016_01deg.jpg')

const earthGeometry = new IcosahedronGeometry(0.5, 128)
const earthMaterial = new MeshStandardMaterial({
  map: nightTexture
})

const earth = new Mesh(earthGeometry, earthMaterial)
earth.castShadow = true
earth.receiveShadow = true

group.add(earth)

// Particles
particleGeometry = new BufferGeometry()
// const particleGeometry = new IcosahedronGeometry(12, 16)
const particleMaterial = new PointsMaterial({ color: 0xffffff, size: 0.01 })
// const positions = new Float32Array(satellites.length * 3)
// for (let i = 0; i < satellites.length; i++) {
//   const p = satellites[i].position
//   positions[0 + i * 3] = p.x / 1000
//   positions[1 + i * 3] = p.y / 1000
//   positions[2 + i * 3] = p.z / 1000
// }
// const { satPos, satVel, satCache } = calcPositions()

// console.log(2223333, satCache, satPos, satVel)

particleGeometry.setAttribute('position', new BufferAttribute(satPosition, 3))
const particleSystem = new Points(particleGeometry, particleMaterial)
scene.add(particleSystem)

const pane = new Pane({
  title: 'Parameters'
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
  const currentTime = clock.getElapsedTime()

  // const { satPos } = calcPositions()

  // for (var i = 0; i < satCache.length; i++) {
  //   satPos[i * 3] += satVel[i * 3] * delta * 1000 // Update x position
  //   satPos[i * 3 + 1] += satVel[i * 3 + 1] * delta * 1000 // Update y position
  //   satPos[i * 3 + 2] += satVel[i * 3 + 2] * delta * 1000 // Update z position
  // }

  setInterval(() => {
    worker.postMessage({
      tle: tle
    })
    // particleSystem.geometry.attributes.position = new BufferAttribute(satPosition, 3)
    // particleGeometry.attributes.position.needsUpdate = true
  }, 100)

  renderer.render(scene, camera)
  controls.update()
  window.requestAnimationFrame(animate)
}

animate()
