import alea from 'alea'
import { createNoise2D } from 'simplex-noise'

export function getColor(elevation: number) {
  const h = 120 - elevation * 120 // 绿到红（120 到 0）
  const l = 30 + elevation * 50 // 增加亮度
  return `hsl(${h}, 60%, ${l}%)`
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
