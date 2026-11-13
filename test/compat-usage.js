/**
 * 直接看 dsh-host-webserver 里 register(route) 的调用方示例：
 * 别的官方插件怎么调这个 API 的 —— 照抄就是正确写法。
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

// 扫所有 @deepseek-ai 包，找 .webServer.register( 调用点
const dsRoot = J.files.dsh.files.node_modules.files['@deepseek-ai'].files
const samples = []
for (const [name, node] of Object.entries(dsRoot)) {
  if (!node.files) continue
  const walk = (n, prefix) => {
    if (!n.files) return
    for (const [k, v] of Object.entries(n.files)) {
      if (v.files) { walk(v, prefix + '/' + k); continue }
      if (!/\.js$/.test(k) || v.size > 900000) continue
      const t = read(v)
      if (!t || !/webServer\.register\s*\(/.test(t)) continue
      samples.push({ name, file: prefix + '/' + k, txt: t })
    }
  }
  walk(node, '')
}

console.log(`找到 ${samples.length} 个 webServer.register 调用点\n`)
for (const s of samples.slice(0, 4)) {
  console.log('='.repeat(50))
  console.log(`${s.name}${s.file}`)
  console.log('='.repeat(50))
  const lines = s.txt.split('\n')
  lines.forEach((l, i) => {
    if (/webServer\.register\s*\(/.test(l)) {
      console.log(lines.slice(i, Math.min(i + 14, lines.length)).map(x => '  ' + x.slice(0, 175)).join('\n'))
      console.log('  ---')
    }
  })
  console.log()
}
fs.closeSync(fd)
