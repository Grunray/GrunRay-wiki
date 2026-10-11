// 管线接收服务器：接收页面/编辑器 POST 的导出文本并写盘
// 用法：node recv-server.cjs [默认输出文件名]   （监听 127.0.0.1:9977，常驻，Ctrl+C 停）
//   POST /save            -> 写入默认文件名
//   POST /save?name=x.json -> 写入 x.json（仅允许文件名，防路径穿越）
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_OUT = process.argv[2] || 'export-frames.json'

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }
  if (req.method === 'POST' && req.url.startsWith('/save')) {
    const q = new URL(req.url, 'http://x').searchParams
    const name = path.basename(q.get('name') || DEFAULT_OUT)
    const out = path.join(__dirname, name)
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => {
      const body = Buffer.concat(chunks)
      fs.writeFileSync(out, body)
      console.log(`SAVED ${body.length} bytes -> ${out}`)
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
    })
    return
  }
  res.writeHead(404)
  res.end()
})

server.listen(9977, '127.0.0.1', () =>
  console.log(`recv server on 127.0.0.1:9977 (default -> ${DEFAULT_OUT})`),
)
