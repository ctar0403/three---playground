import FileHound from 'filehound'

const generateInputPath = () => {
  const dir = process.cwd()
  const paths = FileHound.create()
    .paths(dir)
    .discard(['node_modules', 'dist'])
    .ext('html')
    .findSync()
  return paths
}

export const pages = () => {
  return {
    name: 'vite-plugin-pages',
    config: (config) => {
      config.build = {
        rollupOptions: {
          input: generateInputPath()
        }
      }
    }
  }
}
