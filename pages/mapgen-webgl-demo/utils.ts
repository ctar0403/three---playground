import alea from 'alea'
import { createNoise2D } from 'simplex-noise'
import { Color } from 'three'

export function getColor(ratio: number) {
  const hue = ratio * 0.7 // 0.7限制色相范围避免循环回红色
  const saturation = 0.9
  const lightness = 0.5
  const color = new Color().setHSL(hue, saturation, lightness)
  // return `rgba(${Math.round(color.r * 255)}, ${Math.round(
  //   color.g * 255
  // )}, ${Math.round(color.b * 255)}, 0.5)`

  return [color.r, color.g, color.b, 0.5]
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
    result += noiseValue * amplitude
    frequency *= lacunarity
    amplitude *= persistance
    max += amplitude
  }
  const redistributed = Math.pow(result, redistribution)
  return redistributed / max
}
