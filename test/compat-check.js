/**
 * 步骤 1：核对 dsh-ima 插件与 DSH 0.2.2-rc.1 的接口契约。
 * 逐项检查：宿主注入点、client 入口、locale、slots、路由挂载方式。
 * 只读，不改任何文件。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const PLUGIN = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const ASAR = 'D:\\Program Files (x86)\\dsh\\resources\\app.asar'

// ── asar 读取器 ──
const fd = fs.openSync(ASAR, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(12)
const baseOffset = 16 + headerSize
const hbuf = Buffer.alloc(headerSize)
fs.readSync(fd, hbuf, 0, headerSize, 16)
const ASAR_JSON = JSON.parse(hbuf.toString('utf8').replace(/\0+$/, ''))

function asarFile(segs) {
  let cur = ASAR_JSON
  for (const s of segs) {
    if (!cur.files || !cur.files[s]) return null
    cur = cur.files[s]
  }
  if (!cur || cur.files) return null
  const b = Buffer.alloc(cur.size)
  fs.readSync(fd, b, 0, cur.size, baseOffset + Number(cur.offset))
  return b.toString('utf8')
}

function asarList(prefixSegs) {
  let cur = ASAR_JSON
  for (const s of prefixSegs) {
    if (!cur.files || !cur.files[s]) return []
    cur = cur.files[s]
  }
  return cur.files ? Object.keys(cur.files) : []
}

console.log('='.repeat(60))
console.log('1. 版本核对')
console.log('='.repeat(60))
const dshPkg = JSON.parse(asarFile(['dsh', 'package.json']))
const pluginPkg = JSON.parse(fs.readFileSync(path.join(PLUGIN, 'package.json'), 'utf8'))
console.log('  DSH 版本        :', dshPkg.version)
console.log('  插件版本        :', pluginPkg.version)
console.log('  插件声明的 DSH  : README 说测试于 0.2.0-rc.1')

console.log('\n' + '='.repeat(60))
console.log('2. 插件声明的注入依赖是否都在 DSH 里')
console.log('='.repeat(60))
const injects = (pluginPkg.dsh && pluginPkg.dsh.client && pluginPkg.dsh.client.inject) || []
for (const dep of injects) {
  const segs = ['dsh', 'node_modules', ...dep.split('/')]
  const ok = asarList(segs).length > 0
  console.log(`  ${ok ? 'OK  ' : '缺失'} ${dep}`)
}

console.log('\n' + '='.repeat(60))
console.log('3. 宿主入口 lib/index.js 用到的 API')
console.log('='.repeat(60))
const hostSrc = fs.readFileSync(path.join(PLUGIN, 'lib', 'index.js'), 'utf8')
const apiHits = [...new Set([
  ...hostSrc.matchAll(/\b(ctx|this)\.([a-zA-Z]+)/g),
].map(m => m[2]))]
console.log('  ctx.* 调用:', apiHits.slice(0, 30).join(', '))
// 找注入声明
const injectDecl = hostSrc.match(/exports\.inject\s*=\s*\[[^\]]*\]/)
console.log('\n  宿主 inject 声明:', injectDecl ? injectDecl[0] : '未找到 exports.inject')
const applyDecl = /exports\.apply\s*=/.test(hostSrc) ? 'exports.apply 存在' : 'exports.apply 未找到'
console.log('  ', applyDecl)

console.log('\n' + '='.repeat(60))
console.log('4. 客户端入口检查')
console.log('='.repeat(60))
const clientSrc = fs.readFileSync(path.join(PLUGIN, 'lib', 'client.js'), 'utf8')
console.log('  lib/client.js 大小:', (clientSrc.length / 1024).toFixed(0), 'KB')
console.log('  __ModuleLoader__ 调用:', clientSrc.includes('__ModuleLoader__') ? 'OK' : '缺失')
const clientInj = clientSrc.match(/exports\.inject\s*=\s*\[[^\]]*\]/)
console.log('  客户端 inject:', clientInj ? clientInj[0].slice(0, 200) : '未找到')

fs.closeSync(fd)
