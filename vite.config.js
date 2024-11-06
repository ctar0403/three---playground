import { defineConfig } from 'vite'
import glsl from 'vite-plugin-glsl'
import { pages } from './plugin/page'

export default defineConfig({
  plugins: [pages(), glsl()]
})
