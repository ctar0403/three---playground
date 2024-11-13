class PageInfo extends HTMLElement {
  private text: string = ''
  private url: string = ''
  private container: HTMLDivElement
  private info: HTMLParagraphElement
  private links: HTMLParagraphElement
  private source: HTMLSpanElement
  private back: HTMLSpanElement
  private shadow: ShadowRoot

  static get observedAttributes() {
    return ['text', 'url']
  }

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
    this.container = document.createElement('div')
    this.info = document.createElement('p')
    this.links = document.createElement('p')
    this.source = document.createElement('span')
    this.back = document.createElement('span')
    this.info.textContent = `${this.text}`
    this.source.textContent = 'Source'
    this.back.textContent = 'Back'
  }

  connectedCallback() {
    this.source.onclick = () => {
      window.open(this.url, '__blank')
    }
    this.back.onclick = () => {
      window.location.href = '/'
    }
    this.render()
  }

  disconnectedCallback() {}

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    if (name === 'text' && newValue !== null) {
      this.text = newValue
      this.info.textContent = `${this.text}`
    }
    if (name === 'url' && newValue !== null) {
      this.url = newValue
    }
  }

  private render() {
    this.shadow.innerHTML = ''
    const style = document.createElement('style')
    style.textContent = `
      div {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9;
        max-width: 500px;
        min-width: 100px;
        padding: 8px 16px;
        background-color: #f4f4f5;
        color: #6b7280;
        border: 1px solid #a1a1aa;
        font-size: 12px;
        border-radius: 4px;
      }

      p {
        margin: 0;
        display: flex;  
        justify-content: center;
      }

      p:nth-child(2) {
        padding-top: 6px;
        gap: 24px;
      }

      span {
        cursor: pointer;
      }

      span:hover {
        cursor: pointer;
        text-decoration: underline;
        color: #3f3f46;
      }
    `
    this.shadow.appendChild(style)
    this.container.appendChild(this.info)
    this.links.appendChild(this.back)
    this.links.appendChild(this.source)
    this.container.appendChild(this.links)
    this.shadow.appendChild(this.container)
  }
}

customElements.define('page-info', PageInfo)
