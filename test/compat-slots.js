/**
 * 核对客户端槽位契约：插件用 ctx.slots / 'sidebar.panellist' / 'main'
 * 在 0.2.2-rc.1 里是否还存在。
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

function read(node) {
  if (!node || node.files || node.offset === undefined) return null
  const b = Buffer.alloc(node.size)
  fs.readSync(fd, b, 0, node.size, baseOffset + Number(node.offset))
  return b.toString('utf8')
}

const dsRoot = J.files.dsh.files.node_modules.files['@deepseek-ai'].files

// 1) 找 sidebar.panellist 这个槽位名在哪些包里被声明
console.log('=== "sidebar.panellist" 出现在哪些包 ===')
const decl = []
for (const [name, node] of Object.entries(dsRoot)) {
  if (!node.files || !node.files.lib || !node.files.lib.files) continue
  const f = node.files.lib.files['client.js'] || node.files.lib.files['index.js']
  if (!f) continue
  const t = read(f)
  if (!t) continue
  if (t.includes('sidebar.panellist')) decl.push({ name, file: f === node.files.lib.files['client.js'] ? 'client' : 'index', t })
}
decl.forEach(d => console.log(`  ${d.name} (${d.file}.js)`))

// 2) 看槽位声明方式
for (const d of decl.slice(0, 3)) {
  const i = d.t.indexOf('sidebar.panellist')
  console.log(`\n--- ${d.name} 上下文 ---`)
  console.log(d.t.slice(Math.max(0, i - 300), i + 300).replace(/\n/g, ' ').slice(0, 550))
}

// 3) "slots" 服务由谁提供
console.log('\n=== 声明提供 slots 服务的包 ===')
const provs = []
for (const [name, node] of Object.entries(dsRoot)) {
  if (!node.files || !node.files.lib || !node.files.lib.files) continue
  const f = node.files.lib.files['index.js']
  if (!f) continue
  const t = read(f)
  if (!t) continue
  if (/Service\.?.*slots|['"]slots['"]/.test(t)) provs.push(name)
}
console.log('  ' + (provs.slice(0, 15).join(', ') || '无'))
fs.closeSync(fd)
