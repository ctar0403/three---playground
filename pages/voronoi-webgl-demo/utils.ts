import { Color } from 'three'

export function getColor(ratio: number) {
  const hue = ratio * 0.7 // 0.7限制色相范围避免循环回红色
  const saturation = 0.9
  const lightness = 0.5
  const color = new Color().setHSL(hue, saturation, lightness)
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(
    color.g * 255
  )}, ${Math.round(color.b * 255)}, 0.5)`
}
