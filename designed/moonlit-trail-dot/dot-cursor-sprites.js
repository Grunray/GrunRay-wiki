// <dot-sprite> — 月相光标点阵精灵（自包含，由 build-cursor-component.mjs 生成）
// 数据：cursor-frames.json（undefined 采样 · t0=undefined · 三色分层）
// 用法：<dot-sprite name="columbina" px="56"></dot-sprite>  name ∈ columbina|damselette|kuuhenki
const DOT_SPRITES = {"columbina":{"grid":{"cols":28,"rows":28},"displayPx":56,"enginePx":36,"hot":{"x":0.08,"y":0.08},"palette":{"primary":"#0c485c","secondary":"#072833","tertiary":"#d2ebf8"},"layers":{"state1":[42,43,46,74,76,93,102,106,122,129,135,149,152,155,156,163,164,177,183,184,186,190,191,192,206,212,213,231,233,234,242,243,248,249,253,260,264,267,269,270,276,277,290,292,293,294,295,297,306,318,319,325,333,337,345,347,349,351,352,354,361,363,365,374,375,377,380,382,389,391,392,403,406,408,416,417,419,428,429,431,436,437,438,439,444,447,449,455,456,460,463,464,467,468,474,478,483,485,486,488,489,490,494,495,496,497,505,509,510,511,512,515,517,520,521,523,525,526,527,528,530,534,535,536,539,541,543,548,554,565,566,569,576,581,582,584,593,598,599,603,605,612,619,620,621,622,626,629,630,632,635,636,637,639,640,648,652,661,662,663,666,667,682,685,690,694,707,714,717,719,720,737,739,740,741,742,743,744,746],"state2":[12,13,14,15,41,103,120,150,161,180,193,207,215,225,226,247,250,271,288,291,308,317,323,324,326,334,335,336,346,348,350,353,362,364,376,388,390,400,402,404,405,407,409,418,420,422,430,445,446,448,457,465,475,479,481,492,499,506,529,533,542,547,558,571,575,592,600,604,609,627,628,653,656,659,664,677,679,681,686,687,688,689,709,713,718,747,768,769,770,771],"state3":[44,45,75,104,105,121,130,133,134,151,153,154,158,162,179,219,221,232,241,261,278,281,289,298,305,309,373,378,381,393,401,410,421,450,458,459,466,472,477,482,484,493,500,502,507,513,524,549,552,556,557,562,564,570,577,583,585,591,610,649,650,651,655,660,678,683,684,693,708,715,716,738,745]}},"damselette":{"grid":{"cols":16,"rows":16},"displayPx":15,"enginePx":15,"hot":{"x":0.06,"y":0.06},"palette":{"primary":"#0c485c","secondary":"#072833","tertiary":"#d2ebf8"},"layers":{"state1":[14,15,27,28,29,30,31,35,36,37,42,43,44,47,49,50,51,53,54,57,58,62,63,65,66,70,71,72,73,77,78,79,81,82,83,85,86,87,88,91,92,93,94,96,97,98,99,101,102,103,104,107,110,113,115,116,117,119,125,126,129,131,132,135,139,140,141,142,145,146,147,148,149,151,154,155,157,162,163,164,165,172,173,178,179,180,186,187,188,195,196,197,198,199,200,201,202,203,204,212,213,214,215,217,218,219,230,231,232,233,234,247,248,249],"state2":[34,41,80,112,133,167,181],"state3":[216]}},"kuuhenki":{"grid":{"cols":16,"rows":16},"displayPx":15,"enginePx":15,"hot":{"x":0.5,"y":0.5},"palette":{"primary":"#124e62","secondary":"#0a2b36","tertiary":"#d2ebf8"},"layers":{"state1":[7,8,10,11,20,21,22,23,24,25,26,27,36,37,38,39,40,41,42,50,51,52,53,55,56,57,64,65,66,67,69,70,71,72,73,74,75,80,81,82,83,85,86,87,88,89,90,96,97,98,99,100,102,103,104,105,112,114,115,116,117,118,119,120,121,129,130,131,132,133,135,136,137,145,146,147,148,150,151,152,153,154,155,163,164,167,168,169,170,171,172,184,185,186,187,188,189,201,203,204,205,206,217,221,222,223,237,238,239,254,255],"state2":[84,162,220],"state3":[54,101,113,134]}}}

class DotSprite extends HTMLElement {
  static get observedAttributes() { return ['name', 'px'] }
  connectedCallback() { this.render() }
  attributeChangedCallback() { this.render() }
  render() {
    const name = this.getAttribute('name') || 'columbina'
    const sp = DOT_SPRITES[name]
    if (!sp) return
    const px = Number(this.getAttribute('px')) || sp.displayPx
    const { cols, rows } = sp.grid
    const cellPx = px / Math.max(cols, rows)
    const w = Math.round(cols * cellPx)
    const h = Math.round(rows * cellPx)
    let cv = this.querySelector('canvas')
    if (!cv) {
      cv = document.createElement('canvas')
      this.innerHTML = ''
      this.appendChild(cv)
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    cv.width = w * dpr
    cv.height = h * dpr
    cv.style.width = w + 'px'
    cv.style.height = h + 'px'
    const ctx = cv.getContext('2d')
    ctx.scale(dpr, dpr)
    const hex2rgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
    const pal = {
      1: hex2rgb(sp.palette.primary),
      2: hex2rgb(sp.palette.secondary),
      3: hex2rgb(sp.palette.tertiary),
    }
    const paint = (indices, state, alpha) => {
      const [r, g, b] = pal[state]
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
      for (const idx of indices) {
        const row = Math.floor(idx / cols)
        const col = idx % cols
        ctx.beginPath()
        ctx.arc((col + 0.5) * cellPx, (row + 0.5) * cellPx, cellPx * 0.44, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    paint(sp.layers.state2, 2, 0.8)   // 暗墨底层
    paint(sp.layers.state1, 1, 0.95)  // 主墨
    paint(sp.layers.state3, 3, 0.95)  // 冰蓝高光
  }
}
if (!customElements.get('dot-sprite')) customElements.define('dot-sprite', DotSprite)
