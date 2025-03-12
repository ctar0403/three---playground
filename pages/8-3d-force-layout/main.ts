import {
  AmbientLight,
  Box3,
  DirectionalLight,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from 'three'
import ThreeForcegraph from 'three-forcegraph'
import * as d3d from 'd3-force-3d'
import TWEEN from '@tweenjs/tween.js'
import graphData from './assets/data1.json'
import {
  EffectComposer,
  OrbitControls,
  RenderPass,
  UnrealBloomPass
} from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'
// import graphData2 from '../data/small_assets.json'

class Graph {
  #hoverObj
  #pointerPos
  private forceGraph?: ThreeForcegraph
  private tooltipElement: HTMLDivElement
  private scene: Scene
  private camera: PerspectiveCamera
  private renderer: WebGLRenderer
  private controls: OrbitControls
  private container: HTMLElement
  private width: number
  private height: number
  private data: any
  private groupField: string

  constructor(element: string, data: any, groupField: string) {
    this.container = document.querySelector(element) as HTMLElement

    this.scene = new Scene()

    this.renderer = new WebGLRenderer({
      canvas: this.container,
      antialias: true
    })
    this.#hoverObj = null
    this.#pointerPos = null

    this.width = window.innerWidth
    this.height = window.innerHeight

    this.camera = this.camera = new PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      1000
    )
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)

    this.data = data
    this.groupField = groupField

    this.tooltipElement = document.createElement('div')
    this.tooltipElement.classList.add('graph-tooltip')
    document.querySelector('body')?.appendChild(this.tooltipElement)

    this.init()
  }

  private init() {
    const graph = new ThreeForcegraph()
      .linkWidth(1)
      .linkOpacity(0.1)
      .linkDirectionalArrowColor('#ffffff00')
      .linkDirectionalArrowLength(0)
      .linkDirectionalArrowRelPos(1)
      .linkDirectionalParticles(1)
      .nodeVal('id')
      .nodeOpacity(1)
      .nodeRelSize(0.1)
      .nodeResolution(16)
      .nodeRelSize(0.1)
      .nodeAutoColorBy(this.groupField)

    // this.renderer = new WebGLRenderer({
    //   antialias: true
    // })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // this.container.appendChild(this.renderer.domElement)

    // this.scene = new Scene()
    this.scene.add(graph)
    this.scene.add(new AmbientLight(0xbbbbbb))
    this.scene.add(new DirectionalLight(0xffffff, 0.6))

    // setup camera
    // this.camera = new PerspectiveCamera()
    this.camera.far = 10000
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    this.camera.lookAt(graph.position)
    this.camera.position.z = Math.cbrt(300) * 180

    this.camera.layers.set(0)

    // controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.25
    this.controls.enableZoom = true
    this.controls.enablePan = true

    // pointer position
    this.#pointerPos = new Vector2()
    this.#pointerPos.x = -2
    this.#pointerPos.y = -2
    const eventTypes = ['pointermove', 'pointerdown']
    eventTypes.forEach((evType) =>
      this.container.addEventListener(evType, (ev: any) => {
        evType === 'pointerdown'

        const getOffset = (el) => {
          const rect = el.getBoundingClientRect(),
            scrollLeft = document.documentElement.scrollLeft,
            scrollTop = document.documentElement.scrollTop
          return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
        }
        const offset = getOffset(this.container)
        this.#pointerPos.x = ev.pageX - offset.left
        this.#pointerPos.y = ev.pageY - offset.top
      })
    )

    // responsive
    window.addEventListener('resize', () => {
      this.width = window.innerWidth
      this.height = window.innerHeight

      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()

      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    })

    // effects
    // this.bloomLayer = new Layers()
    // this.bloomLayer.set(1)

    const bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth, window.innerHeight),
      5,
      0.4,
      0.001
    )

    const effectComposer = new EffectComposer(this.renderer)

    const bgPass = new RenderPass(this.scene, this.camera)

    effectComposer.addPass(bgPass)
    effectComposer.addPass(bloomPass)

    // render
    const animate = () => {
      graph.tickFrame()
      TWEEN.update()

      this.controls.update()
      effectComposer.render()

      if (this.#pointerPos.x > 0 && this.#pointerPos.y > 0) {
        let topObj = null
        const intersects = this.#intersectingObjects(
          this.#pointerPos.x,
          this.#pointerPos.y
        )
        const topIntersect = intersects?.length ? intersects[0] : null
        topObj = topIntersect ? topIntersect.object : null
        if (topObj !== this.#hoverObj) {
          this.#hoverObj = topObj

          if (this.#hoverObj) {
            this.#hoverObj.layers.toggle(1)
            document.documentElement.style.cursor = 'pointer'
            // this.#hoverObj.

            console.log(333333, this.#hoverObj)

            // show tooltip when hovering a node
            if (this.#hoverObj.__graphObjType === 'node') {
              this.tooltipElement.style.display = 'block'
              this.tooltipElement.style.position = `absolute`
              this.tooltipElement.style.color = '#fff'
              this.tooltipElement.style.fontSize = '.8em'
              this.tooltipElement.style.top = `${this.#pointerPos.y}px`
              this.tooltipElement.style.left = `${this.#pointerPos.x}px`
              this.tooltipElement.style.transform = `translate(-${
                (this.#pointerPos.x / this.width) * 100
              }%, ${
                this.height - this.#pointerPos.y < 100
                  ? 'calc(-100% - 8px)'
                  : '14px'
              })`
              this.tooltipElement.innerText = `${this.#hoverObj?.__data.val}`
            } else {
              this.tooltipElement.innerHTML = ''
              this.tooltipElement.style.display = 'none'
            }
          } else {
            document.documentElement.style.cursor = 'default'
            this.tooltipElement.innerHTML = ''
            this.tooltipElement.style.display = 'none'
          }
        }
      }

      requestAnimationFrame(animate)
    }
    animate()

    this.forceGraph = graph
  }

  updateData(data: any) {
    this.data = data
    this.forceGraph?.graphData(this.data)
  }

  cameraPosition(
    position: Vector3,
    lookAt: Vector3,
    transitionDuration?: number
  ) {
    const camera = this.camera
    const setLookAt = (lookAt) => {
      const lookAtVect = new Vector3(lookAt.x, lookAt.y, lookAt.z)
      if (this.controls.target) {
        this.controls.target = lookAtVect
      } else {
        camera.lookAt(lookAtVect)
      }
    }

    const getLookAt = () => {
      return Object.assign(
        new Vector3(0, 0, -1000)
          .applyQuaternion(camera.quaternion)
          .add(camera.position)
      )
    }

    const setCameraPos = (pos) => {
      const { x, y, z } = pos
      if (x !== undefined) camera.position.x = x
      if (y !== undefined) camera.position.y = y
      if (z !== undefined) camera.position.z = z
    }

    if (position) {
      const finalPos = position
      const finalLookAt = lookAt || { x: 0, y: 0, z: 0 }
      if (!transitionDuration) {
        setCameraPos(finalPos)
        setLookAt(finalLookAt)
      } else {
        const camPos = Object.assign({}, camera.position)
        const camLookAt = getLookAt()

        new TWEEN.Tween(camPos)
          .to(finalPos, transitionDuration)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(setCameraPos)
          .start()

        new TWEEN.Tween(camLookAt)
          .to(finalLookAt, transitionDuration / 3)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(setLookAt)
          .start()
      }
    }
  }

  fitToBBox(padding = 20) {
    const camera = this.camera
    const graph = this.forceGraph
    if (!graph) return
    const box = new Box3(new Vector3(0, 0, 0), new Vector3(0, 0, 0))

    const center = new Vector3(0, 0, 0)
    const bbox = box.expandByObject(graph)

    const maxboxSide =
      Math.max(...Object.entries(bbox.max).map((i) => i[1])) * 2

    const paddedFov = (1 - (padding * 2) / this.height) * camera.fov
    const fitHeightDistance =
      maxboxSide / Math.atan((paddedFov * Math.PI) / 180)
    const fitWidthDistance = fitHeightDistance / camera.aspect
    const distance = Math.max(fitHeightDistance, fitWidthDistance)
    this.controls.reset()

    if (distance > 0) {
      const newCameraPos = center
        .clone()
        .sub(camera.position)
        .normalize()
        .multiplyScalar(-distance)
      this.cameraPosition(newCameraPos, center)
    }
  }

  #intersectingObjects(x: number, y: number) {
    const graph = this.forceGraph
    if (graph) {
      const relCoords = new Vector2(
        (x / this.width) * 2 - 1,
        -(y / this.height) * 2 + 1
      )
      const raycaster = new Raycaster()
      raycaster.params.Line.threshold = 2
      raycaster.setFromCamera(relCoords, this.camera)
      return raycaster.intersectObject(graph, true)
    }
  }

  spherize(isSphere: boolean) {
    const graph = this.forceGraph
    if (isSphere) {
      graph
        ?.graphData(this.data)
        .d3Force('radial', d3d.forceRadial(500))
        .d3Force('link', null)
        .d3Force('collision', null)
    } else {
      graph
        ?.graphData(this.data)
        .d3Force('radial', null)
        .d3Force('link', d3d.forceLink(this.data.links))
    }
  }

  rotate(isRotate: boolean, speed: number) {
    this.controls.target = new Vector3(0, 0, 0)
    this.controls.autoRotate = isRotate
    this.controls.autoRotateSpeed = speed || 6
  }
}

const params = {
  rotate: false,
  spherize: false,
  dataFiltered: false
}
const pane = new Pane({
  title: '3D Force Layout'
})
const graph = new Graph('canvas.webgl', graphData, 'label')

pane.addBinding(params, 'rotate').on('change', (e) => {
  graph.rotate(e.value, 3)
})
pane.addBinding(params, 'spherize').on('change', (e) => {
  graph.spherize(e.value)
})

pane
  .addButton({
    title: 'FitToBBox'
  })
  .on('click', () => {
    graph.fitToBBox()
  })

pane
  .addButton({
    title: 'Update Data'
  })
  .on('click', () => {
    const kind = 'Domain'
    const newData = {
      nodes: graphData.nodes.filter((n) => n.label != kind),
      links: graphData.links.filter((l) => {
        let sn = graphData.nodes.find(
          (n) => n.id === l.source || n.id === l.source?.id
        )
        let tn = graphData.nodes.find(
          (n) => n.id === l.target || n.id === l.target?.id
        )
        return sn.label !== kind && tn.label !== kind
      })
    }
    if (params.dataFiltered) {
      graph.updateData(graphData)
    } else {
      graph.updateData(newData)
    }

    params.dataFiltered = !params.dataFiltered
  })

graph.updateData(graphData)
