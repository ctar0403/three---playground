interface PageInfo {
  name: string
  description: string
  image: string
  url: string
}

const pages: PageInfo[] = [
  {
    name: 'Model Animation',
    description:
      'This example demonstrates how a model moves along a specified path and how to play animations.',
    image: '/cover/1.png',
    url: '/pages/1-model-animation/index.html'
  },
  {
    name: '3D Glob',
    description:
      'This example shows how to create a 3D glob using Berlin noise with shaders.',
    image: '/cover/2.png',
    url: '/pages/2-3d-blob/index.html'
  },
  {
    name: 'Earth',
    description: 'Create a Earth using three.js.',
    image: '/cover/3.png',
    url: '/pages/3-earth/index.html'
  },
  {
    name: 'Globe',
    description: 'Display latitude and longitude coordinates on the Earth.',
    image: '/cover/4.png',
    url: '/pages/4-globe/index.html'
  },
  {
    name: 'Shaders',
    description: 'Special effects ported from ShaderToy.',
    image: '/cover/5.png',
    url: '/pages/5-shaders/index.html'
  },
  {
    name: 'Procedural Terrain',
    description: 'Procedurally generated terrain based on Berlin Noise.',
    image: '/cover/6.png',
    url: '/pages/6-procedural-terrain/index.html'
  },
  {
    name: 'Block Terrain',
    description:
      'Terrain generated with the Fractal Brownian Motion (FBM) algorithm using square blocks.',
    image: '/cover/7.png',
    url: '/pages/7-block-terrain/index.html'
  },
  {
    name: '3D Force Layout',
    description: 'The 3D force-directed graph',
    image: '/cover/8.png',
    url: '/pages/8-3d-force-layout/index.html'
  }
]

function createPageCard(page: PageInfo): HTMLElement {
  const card = document.createElement('div')
  card.className = 'page-card'

  card.innerHTML = `
    <img src="${page.image}" alt="${page.name}">
    <h2>${page.name}</h2>
    <p>${page.description}</p>
  `

  card.addEventListener('click', () => {
    window.location.href = page.url
  })

  return card
}

function initializePages() {
  const pagesGrid = document.querySelector('.pages-grid')
  if (!pagesGrid) return

  pages.forEach((page) => {
    const card = createPageCard(page)
    pagesGrid.appendChild(card)
  })
}

// 当 DOM 加载完成后初始化页面
document.addEventListener('DOMContentLoaded', initializePages)
