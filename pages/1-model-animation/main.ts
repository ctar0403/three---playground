import {
  AmbientLight,
  AnimationAction,
  AnimationMixer,
  BufferGeometry,
  CatmullRomCurve3,
  Clock,
  Group,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3DEventMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/Addons.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Pane } from 'tweakpane'

let model: Group<Object3DEventMap>
let mixer: AnimationMixer
let activeActionName: string = ''
let activeAction: AnimationAction | undefined
let actions: Record<string, AnimationAction | undefined> = {}
let availableActions: string[] = []
let cameraFollowed = false
let cameraReset = false
const cameraPosition = new Vector3(20, 30, 40)
const actionOptions: Record<string, string> = { None: '' }

const points: { x: number; y: number; z: number }[] = [
  {
    x: -20,
    y: 0,
    z: -20
  },
  {
    x: -20,
    y: 0,
    z: 10
  },
  {
    x: 24,
    y: 10,
    z: 22
  },
  {
    x: 15,
    y: 24,
    z: -7
  }
]
const speeds: Record<string, number> = {
  Survey: 0,
  Walk: 0.5,
  Run: 1
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
  camera.position.copy(cameraPosition)
  scene.add(camera)

  const floor = new Mesh(
    new PlaneGeometry(60, 60, 6, 6),
    new MeshStandardMaterial({
      color: 0x1e293b,
      wireframe: true,
      metalness: 0
    })
  )
  floor.receiveShadow = true
  floor.rotation.x = -Math.PI * 0.5
  scene.add(floor)

  //
  const curve = createCurve(scene)

  const ambientLight = new AmbientLight(0xffffff, 2.5)
  scene.add(ambientLight)

  // load model
  const gltfLoader = new GLTFLoader()
  gltfLoader.load('/model/fox.glb', (gltf) => {
    model = gltf.scene
    model.scale.set(0.025, 0.025, 0.025)
    model.position.copy(points[0])
    const animations = gltf.animations
    scene.add(model)
    mixer = new AnimationMixer(model)
    animations.forEach((clip) => {
      const action = mixer?.clipAction(clip)
      const name = clip.name
      actions[name] = action
      actionOptions[name] = name
      availableActions.push(name)
    })

    createPane()
  })

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.75, 0)
  controls.enableDamping = true

  const renderer = new WebGLRenderer({
    canvas: canvas,
    antialias: true
  })
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  })

  let t = 0
  // const loopTime = 10 * 1000
  const clock = new Clock()
  function animate() {
    if (mixer) {
      mixer.update(clock.getDelta())
    }

    if (model && activeActionName) {
      // let time = Date.now()
      // let t = (time % loopTime) / loopTime
      const v = speeds[activeActionName] / 1000
      t += v
      if (t > 1) t = 0

      const position = curve.getPointAt(t)
      model.position.copy(position)
      const tangent = curve.getTangentAt(t)
      const lookAtVec = tangent.add(position)
      model.lookAt(lookAtVec)
    }

    if (!cameraFollowed) {
      if (!cameraReset) {
        camera.position.lerp(cameraPosition, 1)
        cameraReset = true
      }
      controls.update()
    } else {
      cameraReset = false
      const cameraOffset = new Vector3(0, 2, -5)
      const cameraPosition = model.position
        .clone()
        .add(cameraOffset.applyQuaternion(model.quaternion))
      camera.position.lerp(cameraPosition, 0.1)
      camera.lookAt(model.position)
    }
    renderer.render(scene, camera)
    window.requestAnimationFrame(animate)
  }

  animate()
}

function createCurve(scene: Scene) {
  const cubes = points.map((point) => {
    const cube = new Mesh(
      new SphereGeometry(0.4, 12, 12),
      new MeshBasicMaterial({
        color: 0xfdba74
      })
    )
    cube.position.copy(point)
    scene.add(cube)
    return cube
  })
  const curve = new CatmullRomCurve3(cubes.map((cube) => cube.position))
  curve.curveType = 'chordal'
  curve.closed = true
  const cPoints = curve.getPoints(200)
  const line = new LineLoop(
    new BufferGeometry().setFromPoints(cPoints),
    new LineBasicMaterial({ color: 0x38bdf8 })
  )
  scene.add(line)
  return curve
}

function createPane() {
  const params = {
    action: ''
  }
  const pane = new Pane({
    title: 'Parameters'
  })
  pane
    .addBinding(params, 'action', {
      options: actionOptions
    })
    .on('change', (ev) => {
      playAnimation(ev.value)
      activeActionName = ev.value
    })
  pane
    .addButton({
      title: 'Change',
      label: 'view'
    })
    .on('click', () => {
      cameraFollowed = !cameraFollowed
    })
}

function playAnimation(actionName: string) {
  const fadeDuration = 1
  if (actionName) {
    activeAction?.fadeOut(fadeDuration)

    activeAction = actions[actionName]
    activeAction?.reset().fadeIn(fadeDuration).play()
  } else {
    activeAction?.fadeOut(fadeDuration)
    activeAction = undefined
  }
}

init()
