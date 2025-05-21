import alea from 'alea'
import { createNoise2D } from 'simplex-noise'
import { Color } from 'three'

export function getColor(ratio: number) {
  const hue = ratio * 0.7
  const saturation = 0.9
  const lightness = 0.5
  const color = new Color().setHSL(hue, saturation, lightness)
  // return `rgba(${Math.round(color.r * 255)}, ${Math.round(
  //   color.g * 255
  // )}, ${Math.round(color.b * 255)}, 0.5)`

  return [color.r, color.g, color.b, 0.5]
}

export function getElevationColor(
  noise: number
): [number, number, number, number] {
  const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v))
  noise = clamp(noise)

  let r = 0,
    g = 0,
    b = 0

  if (noise < 0.15) {
    // 深海: 深蓝
    r = 0
    g = 0
    b = 128
  } else if (noise < 0.3) {
    // 浅海: 浅蓝绿
    r = 0
    g = 206
    b = 209
  } else if (noise < 0.45) {
    // 平原: 草绿色
    r = 124
    g = 252
    b = 0
  } else if (noise < 0.6) {
    // 丘陵: 黄绿色
    r = 173
    g = 255
    b = 47
  } else if (noise < 0.75) {
    // 山地: 棕色
    r = 205
    g = 133
    b = 63
  } else if (noise < 0.9) {
    // 高山: 灰色
    r = 169
    g = 169
    b = 169
  } else {
    // 雪山: 白色
    r = 255
    g = 255
    b = 255
  }

  // WebGL 使用 [0,1] 范围
  return [r / 255, g / 255, b / 255, 0.8]
}

export type NoiseOptions = {
  seed: number
  scale?: number
  persistance?: number
  lacunarity?: number
  octaves?: number
  redistribution?: number
}

export function fbm(x: number, y: number, options: NoiseOptions) {
  const {
    seed,
    scale = 1,
    persistance = 0.5,
    lacunarity = 2,
    octaves = 6,
    redistribution = 1
  } = options

  const prng = alea(seed)
  const noise = createNoise2D(prng)

  let result = 0
  let amplitude = 1
  let frequency = 1
  let max = amplitude

  for (let i = 0; i < octaves; i++) {
    let nx = x * scale * frequency
    let ny = y * scale * frequency
    let noiseValue = noise(nx, ny)
    // result += noiseValue * amplitude

    result += (noiseValue * 0.5 + 0.5) * amplitude // -> [0, 1]
    frequency *= lacunarity
    amplitude *= persistance
    max += amplitude
  }
  const redistributed = Math.pow(result, redistribution)
  return redistributed / max
}

export function makeFbmGenerator(options: NoiseOptions) {
  const {
    seed,
    scale = 1,
    persistance = 0.5,
    lacunarity = 2,
    octaves = 6,
    redistribution = 1
  } = options

  const prng = alea(seed)
  const noise2D = createNoise2D(prng)

  return function fbm(x: number, y: number): number {
    let result = 0
    let amplitude = 1
    let frequency = 1
    let max = 0

    for (let i = 0; i < octaves; i++) {
      let nx = x * scale * frequency
      let ny = y * scale * frequency
      let noiseValue = noise2D(nx, ny)
      result += (noiseValue * 0.5 + 0.5) * amplitude
      max += amplitude
      frequency *= lacunarity
      amplitude *= persistance
    }

    const normalized = result / max
    return Math.pow(normalized, redistribution)
  }
}
