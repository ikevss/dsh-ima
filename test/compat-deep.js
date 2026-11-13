/**
 * 深度兼容检查：插件用到的 DSH 宿主 API 在 0.2.2-rc.1 是否还存在/改签名。
 * 检查点：ctx.tools.register、ctx.webServer.register、defineTool 来源、ctx.inject
 */
const fs = require('fs')

const ASAR = 'D:\\Program Files (x86)\\dsh\\resources\\app.asar'
const fd = fs.openSync(ASAR, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(12)
const baseOffset = 16 + headerSize
const hb = Buffer.alloc(headerSize)
fs.readSync(fd, hb, 0, headerSize, 16)
const J = JSON.parse(hb.toString('utf8').replace(/\0+$/, ''))

function file(segs) {
  let c = J
  for (const s of segs) { if (!c.files || !c.files[s]) return null; c = c.files[s] }
  if (!c || c.files) return null
  const b = Buffer.alloc(c.size)
  fs.readSync(fd, b, 0, c.size, baseOffset + Number(c.offset))
  return b.toString('utf8')
}
function list(segs) {
  let c = J
  for (const s of segs) { if (!c.files || !c.files[s]) return []; c = c.files[s] }
  return c.files ? Object.keys(c.files) : []
}

console.log('=== 1. 插件依赖的宿主包是否存在 ===')
for (const pkg of ['dsh-tools', 'dsh-host-frontend-static', 'dsh-web-frontend', 'dsh-api-gateway']) {
  const segs = ['dsh', 'node_modules', '@deepseek-ai', pkg]
  const files = list(segs)
  console.log(`  ${files.length ? 'OK  ' : '缺失'} ${pkg}  (${files.length} 项)`)
}

console.log('\n=== 2. ctx.tools.register 签名 ===')
const toolsPkg = file(['dsh', 'node_modules', '@deepseek-ai', 'dsh-tools', 'package.json'])
if (toolsPkg) {
  const pj = JSON.parse(toolsPkg)
  console.log('  dsh-tools version:', pj.version)
  console.log('  exports:', JSON.stringify(pj.exports || pj.main))
}
const toolsIdx = file(['dsh', 'node_modules', '@deepseek-ai', 'dsh-tools', 'lib', 'index.js'])
if (toolsIdx) {
  const m = toolsIdx.match(/register\s*\([^)]{0,120}\)/)
  console.log('  register 签名片段:', m ? m[0] : '未找到')
  console.log('  defineTool 导出:', /defineTool/.test(toolsIdx) ? '有' : '无')
}

console.log('\n=== 3. ctx.webServer.register 签名 ===')
const staticIdx = file(['dsh', 'node_modules', '@deepseek-ai', 'dsh-host-frontend-static', 'lib', 'index.js'])
if (staticIdx) {
  const m = staticIdx.match(/register\s*\([^)]{0,160}\)/)
  console.log('  register 片段:', m ? m[0] : '未找到')
} else {
  console.log('  dsh-host-frontend-static 未找到')
}

console.log('\n=== 4. webServer 服务在 0.2.2 里的提供者 ===')
// 搜哪些包声明了 webServer 服务
const nm = J.files.dsh.files.node_modules
const dsPkgs = Object.keys(nm.files?.['@deepseek-ai']?.files || {})
const providers = []
for (const p of dsPkgs) {
  const idx = file(['dsh', 'node_modules', '@deepseek-ai', p, 'lib', 'index.js'])
  if (idx && /webServer/.test(idx)) providers.push(p)
}
console.log('  提到 webServer 的包:', providers.slice(0, 12).join(', ') || '无')

fs.closeSync(fd)
