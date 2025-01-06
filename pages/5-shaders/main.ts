import {
  ACESFilmicToneMapping,
  AmbientLight,
  CircleGeometry,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  GridHelper,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
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

  private group: Group
  private pulse1: Mesh<CircleGeometry, ShaderMaterial> | undefined
  private pulse2: Mesh<CircleGeometry, ShaderMaterial> | undefined
  private pulse3: Mesh<CircleGeometry, ShaderMaterial> | undefined
  private pulse4: Mesh<CircleGeometry, ShaderMaterial> | undefined

  private params: {
    rotate: boolean
  }

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.set(20, 30, 40)
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

    this.group = new Group()

    this.params = {
      rotate: false
    }

    this.resize()
    this.addLight()
    this.animate()
    this.addPane()

    this.addGroup()
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

    if (this.params.rotate) {
      this.group.rotation.y += delta / 2
    }

    if (this.pulse1 && this.pulse2 && this.pulse3 && this.pulse4) {
      this.pulse1.material.uniforms.u_Time.value = this.clock.getElapsedTime()
      this.pulse2.material.uniforms.u_Time.value = this.clock.getElapsedTime()
      this.pulse3.material.uniforms.u_Time.value = this.clock.getElapsedTime()
      this.pulse4.material.uniforms.u_Time.value = this.clock.getElapsedTime()
    }

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

  createPulse1() {
    const geometry = new CircleGeometry(4, 36)
    const material = new ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
        vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 u_Color;
        uniform float u_Time;

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 p = vUv * 2.0 - 1.0; // 将 uv 转换为 [-1, 1] 范围
          // 计算动画效果
          float r = length(p) * 0.9;
          vec3 color = u_Color;

          float a = pow(r, 2.0);
          float b = sin(r * 0.8 - 1.6);
          float c = sin(r - 0.010);
          float s = sin(a - u_Time * 2.0 + b) * c;

          color *= abs(1.0 / (s * 100.0)) - 0.01;

          gl_FragColor = vec4(color, 0.8);
        }
      `,
      uniforms: {
        u_Time: {
          value: 0
        },
        u_Color: {
          value: new Color(0x00ff00)
        }
      },
      transparent: true,
      side: DoubleSide
    })
    this.pulse1 = new Mesh(geometry, material)

    this.pulse1.position.set(-45, 0.5, -45)
    this.pulse1.rotation.x = -Math.PI * 0.5
    this.group.add(this.pulse1)
  }

  createPulse2() {
    const geometry = new CircleGeometry(4, 36)
    const material = new ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 u_Color;
        uniform float u_Time;

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 p = vUv * 2.0 - 1.0; // 将 uv 转换为 [-1, 1] 范围

          // 计算动画效果
          float r = length(p) * 1.4;
          vec3 color = u_Color;

          float timer = u_Time / 1.2;
          float a = pow(r, 2.0);
          float b = sin(r * 0.8 - 1.6);
          float c = sin(r - 0.010);
          float s = sin(a - timer * 3.0 + b) * c;

          color *= abs(1.0 / (s * 10.8)) - 0.01;
          color = (color*(2.51*color+0.03))/(color*(2.43*color+0.59)+0.14);

          gl_FragColor = vec4(tanh(color), 1.);
        }
      `,
      uniforms: {
        u_Time: {
          value: 0
        },
        u_Color: {
          value: new Color('#ffee00')
        }
      },
      transparent: true,
      side: DoubleSide
    })
    this.pulse2 = new Mesh(geometry, material)

    this.pulse2.position.set(-35, 0.5, -45)
    this.pulse2.rotation.x = -Math.PI * 0.5
    this.group.add(this.pulse2)
  }

  createPulse3() {
    const geometry = new CircleGeometry(4, 36)
    const material = new ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 u_Color;
        uniform float u_Time;

        float circle(in vec2 uv, in float radius, in float thickness) {
          float len = length(uv) - radius;
          return 1.0 - smoothstep(thickness/2.0, thickness, abs(len));
        }

        mat2 rotate2d(float angle) {
          return mat2(cos(angle), - sin(angle), sin(angle), cos(angle));
        }

        float vertical_line(in vec2 uv) {
          if (uv.y > 0.0 && length(uv) < 1.2) {
            float theta = mod(180.0 * atan(uv.y, uv.x)/3.14, 360.0);
            float gradient = clamp(1.0-theta/90.0,0.0,1.0);
            return 0.5 * gradient;
          }
          return 0.0;
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 p = vUv * 2.0 - 1.0;

          // 计算动画效果
          float r = length(p) * 1.4;

          vec3 color = vec3(0.0);
          vec3 circle_color = u_Color;
          color = mix(color, circle_color + 0.2, circle(p, 0.98, 0.01));
          color = mix(color, circle_color + 0.2, circle(p, 0.7, 0.01));
          color = mix(color, circle_color + 0.2, circle(p, 0.4, 0.01));
          color = mix(color, circle_color + 0.2, circle(p, 0.05, 0.01));

          mat2 rotation_matrix = rotate2d(- u_Time);
          color = mix(color, circle_color, vertical_line(rotation_matrix * p));

          gl_FragColor = vec4(color, 1.);
        }
      `,

      uniforms: {
        u_Time: {
          value: 0
        },
        u_Color: {
          value: new Color(0.541, 0.749, 0.839)
        }
      },
      transparent: true,
      side: DoubleSide
    })
    this.pulse3 = new Mesh(geometry, material)

    this.pulse3.position.set(-25, 0.5, -45)
    this.pulse3.rotation.x = -Math.PI * 0.5
    this.group.add(this.pulse3)
  }

  createPulse4() {
    // https://www.shadertoy.com/view/stf3zs
    const geometry = new CircleGeometry(4, 36)
    const material = new ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 u_Color;
        uniform float u_Time;

        vec3 RadarPing(in vec2 uv, in vec2 center, in float innerTail, in float frontierBorder, in float timeResetSeconds, 
            in float radarPingSpeed, in float fadeDistance, float t) {
          vec2 diff = center - uv;
          float r = length(diff) * 0.85;
          float time = mod(t, timeResetSeconds) * radarPingSpeed;
        
          float circle;
          circle += smoothstep(time - innerTail, time, r) * smoothstep(time + frontierBorder, time, r);
          circle *= smoothstep(fadeDistance, 0.0, r);
          return vec3(circle);
        }

        void main() {
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 p = vUv * 2.0 - 1.0;

          vec3 color = vec3(0.0);
          float fadeDistance = 0.8; 
          vec2 greenPing = vec2(0.0, 0.0);
          color += RadarPing(p, greenPing, 0.08, 0.00025, 4.0, 0.3, fadeDistance, u_Time) * u_Color;
          color += RadarPing(p, greenPing, 0.08, 0.00025, 4.0, 0.3, fadeDistance, u_Time + 1.) * u_Color;
          color += RadarPing(p, greenPing, 0.08, 0.00025, 4.0, 0.3, fadeDistance, u_Time + 2.) * u_Color;
          color += RadarPing(p, greenPing, 0.08, 0.00025, 4.0, 0.3, fadeDistance, u_Time + 3.) * u_Color;

          gl_FragColor = vec4(color, 1.);
        }
      `,

      uniforms: {
        u_Time: {
          value: 0
        },
        u_Color: {
          value: new Color(0.041, 0.749, 0.839)
        }
      },
      transparent: true,
      side: DoubleSide
    })
    this.pulse4 = new Mesh(geometry, material)

    this.pulse4.position.set(-15, 0.5, -45)
    this.pulse4.rotation.x = -Math.PI * 0.5
    this.group.add(this.pulse4)
  }

  addGroup() {
    this.scene.add(this.group)
    const grid = new GridHelper(100, 10)
    this.group.add(grid)

    this.createPulse1()
    this.createPulse2()
    this.createPulse3()
    this.createPulse4()
  }

  addPane() {
    const pane = new Pane({
      title: 'Parameters'
    })
    pane.addBinding(this.params, 'rotate')
  }
}

const view = new View('canvas.webgl')
