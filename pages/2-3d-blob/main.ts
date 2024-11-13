import {
  AmbientLight,
  Clock,
  Color,
  IcosahedronGeometry,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Pane } from 'tweakpane'
import fragment from './main.frag'
import vertex from './main.vert'
import {
  EffectComposer,
  RenderPass,
  UnrealBloomPass
} from 'three/examples/jsm/Addons.js'

const PARAMS = {
  displacement: 1,
  wireframe: false,
  color: 0xccbb1f,
  opacity: 0.6,
  strength: 2,
  threshold: 0,
  radius: 0.8
}

function init() {
  const canvas = document.querySelector('canvas.webgl') as HTMLElement
  const scene = new Scene()

  const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  const camera = new PerspectiveCamera(
    75,
    sizes.width / sizes.height,
    0.1,
    1000
  )
  camera.position.set(0, 0, 10)
  scene.add(camera)
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true

  const ambientLight = new AmbientLight(0xffffff, 2.5)
  scene.add(ambientLight)

  const blob = new Mesh(
    new IcosahedronGeometry(3, 12),
    new ShaderMaterial({
      uniforms: {
        u_displacement: {
          value: PARAMS.displacement
        },
        u_color: {
          value: new Color(PARAMS.color)
        },
        u_opacity: {
          value: PARAMS.opacity
        },
        u_time: {
          value: 0
        }
      },
      vertexShader: vertex,
      fragmentShader: fragment
    })
  )
  scene.add(blob)

  const renderer = new WebGLRenderer({
    canvas: canvas,
    antialias: true
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(
    new Vector2(window.innerWidth, window.innerHeight),
    PARAMS.strength,
    PARAMS.radius,
    PARAMS.threshold
  )
  composer.addPass(bloomPass)

  window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })

  // pane
  const pane = new Pane({
    title: 'Parameters'
  })
  pane.addBinding(PARAMS, 'displacement').on('change', (e) => {
    blob.material.uniforms.u_displacement.value = e.value
  })
  pane.addBinding(PARAMS, 'wireframe').on('change', (e) => {
    blob.material.wireframe = e.value
  })

  pane
    .addBinding(PARAMS, 'color', {
      view: 'color'
    })
    .on('change', (e) => {
      blob.material.uniforms.u_color.value = new Color(e.value)
    })

  const bloom = pane.addFolder({
    title: 'bloom'
  })
  bloom
    .addBinding(PARAMS, 'strength', { min: 0, max: 10 })
    .on('change', (e) => {
      bloomPass.strength = e.value
    })
  bloom.addBinding(PARAMS, 'radius', { min: 0, max: 10 }).on('change', (e) => {
    bloomPass.radius = e.value
  })
  bloom
    .addBinding(PARAMS, 'threshold', { min: 0, max: 1 })
    .on('change', (e) => {
      bloomPass.threshold = e.value
    })

  const clock = new Clock()
  function animate() {
    controls.update()

    blob.material.uniforms.u_time.value = clock.getElapsedTime()
    composer.render()
    window.requestAnimationFrame(animate)
  }
  animate()
}

init()
