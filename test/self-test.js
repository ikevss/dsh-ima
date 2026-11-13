/**
 * 宿主半自检：不动网络，只验证模块能加载、导出齐全、新接口挂上了。
 */
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')

console.log('=== 1. ima-client 模块 ===')
const ima = require(path.join(ROOT, 'lib', 'ima-client.js'))
const need = ['listKnowledgeBases', 'touchValidated', 'readMedia', 'validate', 'saveCredentials']
for (const k of need) console.log(`  ${typeof ima[k] === 'function' ? 'OK  ' : 'FAIL'} ${k}`)

console.log('\n=== 2. 宿主入口 ===')
const host = require(path.join(ROOT, 'lib', 'index.js'))
console.log('  name:', host.name)
console.log('  inject:', JSON.stringify(host.inject))
console.log('  apply 是函数:', typeof host.apply === 'function')

console.log('\n=== 3. 图标模块 ===')
const icons = require(path.join(ROOT, 'lib', 'dsh-icons.js'))
console.log('  图标数:', Object.keys(icons.ICON_SYMBOLS).length)
console.log('  iconSvg 可用:', typeof icons.iconSvg === 'function')

console.log('\n=== 4. 凭证状态（不显示密钥） ===')
const c = ima.loadCredentials()
if (c) {
  console.log('  已绑定，来源:', c.source)
  console.log('  boundAt:', c.boundAt)
  console.log('  lastValidatedAt:', c.lastValidatedAt)
} else {
  console.log('  未绑定')
}
