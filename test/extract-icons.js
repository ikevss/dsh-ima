/**
 * 从 DSH bundle 抽取图标 path 数据（v2：用正则逐个抠，不用 eval 整个对象）。
 * 每个图标形如：
 *   "alarm-clock-outline":{size:16,svg:e=>`<svg ...>...</svg>`}
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ASAR = 'D:\\Program Files (x86)\\dsh\\resources\\app.asar'
const fd = fs.openSync(ASAR, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(12)
const baseOffset = 16 + headerSize
const hb = Buffer.alloc(headerSize)
fs.readSync(fd, hb, 0, headerSize, 16)
const J = JSON.parse(hb.toString('utf8').replace(/\0+$/, ''))

function walkSegs(segs) {
  let c = J
  for (const s of segs) { if (!c.files || !c.files[s]) return null; c = c.files[s] }
  return c
}
const node = walkSegs(['dsh', 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist', 'assets', 'index-BgUyXZcc.js'])
const b = Buffer.alloc(node.size)
fs.readSync(fd, b, 0, node.size, baseOffset + Number(node.offset))
const txt = b.toString('utf8')
fs.closeSync(fd)

// 匹配 "name":{size:N,svg:e=>`....`}
const RE = /"([a-z0-9-]+)":\{size:(\d+),svg:([a-zA-Z_$][\w$]*)=>`([\s\S]*?)`\}/g
const icons = {}
let m, count = 0
while ((m = RE.exec(txt))) {
  const [, name, size, arg, svgBody] = m
  icons[name] = { size: Number(size), svgBody, arg }
  count++
}
console.log('抓到图标:', count, '个')

// 预览一个
const sample = icons['alarm-clock-outline']
console.log('\n样例 alarm-clock-outline:')
console.log('  size:', sample && sample.size)
console.log('  svg 前 200:', sample && sample.svgBody.slice(0, 200))
console.log('  svg 长度:', sample && sample.svgBody.length)
console.log('  stroke-width 占位符出现次数:', sample && (sample.svgBody.match(/\$\{e\}/g) || []).length)

// 检查文件夹图标
for (const k of Object.keys(icons).filter(k => /folder|archive|book|note|doc|file|globe|image|microphone|play|search|refresh|copy|link|share|plus|trash|download|info|warning|clock|edit|list|data|database|plugin/i.test(k))) {
  console.log('  候选:', k)
}

// 输出 JSON 供下一步生成
// 中间产物写到系统临时目录，不提交进仓库
const outFile = path.join(os.tmpdir(), 'dsh-ima-icons-raw.json')
fs.writeFileSync(outFile, JSON.stringify(icons, null, 2))
console.log('\n原始数据已写入:', outFile, `(${Object.keys(icons).length} 个)`)
