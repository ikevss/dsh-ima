/**
 * 授权状态改版自检：常驻内容必须只剩一个图标，详情在浮窗里。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const vm = require('vm')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const client = fs.readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8')

console.log('=== 1. 语法 ===')
try {
  new vm.Script(client, { filename: 'client.js' })
  console.log('  OK  可编译')
} catch (e) {
  console.log('  FAIL', e.message)
  process.exit(1)
}

const checks = [
  // 常驻部分：只剩图标
  ['右上角按钮容器', 'dsh-ima-authwrap'],
  ['图标按钮', 'dsh-ima-authbtn'],
  ['按钮用盾牌图标', "name: 'shield-outline', size: 15"],
  ['状态圆点', 'dsh-ima-dot'],
  // 浮窗
  ['浮窗容器', 'dsh-ima-authpop'],
  ['浮窗里显示年龄', 'authInfo.ageTxt'],
  ['浮窗里有重新验证', "verifying ? '验证中…' : '重新验证'"],
  ['说明不编造有效期', 'ima 不提供有效期信息'],
  ['点击外部关闭', "document.addEventListener('mousedown'"],
  ['点按钮切换', 'setAuthOpen(!authOpen)'],
  // 移除的东西
  ['旧的常驻长条已移除', 'dsh-ima-auth{'],
  ['旧的 authBar 已移除', 'var authBar ='],
]
let bad = 0
for (const [label, needle] of checks) {
  const found = client.includes(needle)
  // 后两项是「应该不存在」的
  const shouldExist = !label.includes('已移除')
  const ok = shouldExist ? found : !found
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

console.log(`\n通过 ${checks.length - bad} / ${checks.length}`)
process.exit(bad ? 1 : 0)
