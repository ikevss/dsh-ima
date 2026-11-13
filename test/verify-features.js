/**
 * 客户端 bundle 语法校验：
 * 用 vm 编译整个 lib/client.js（不执行），能编过就说明语法没问题。
 * 顺便统计新增功能的代码是否都在。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const vm = require('vm')

const f = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima', 'lib', 'client.js')
const txt = fs.readFileSync(f, 'utf8')

console.log('=== 1. 语法编译 ===')
try {
  new vm.Script(txt, { filename: 'client.js' })
  console.log('  OK  整个 bundle 语法可编译')
} catch (e) {
  console.log('  FAIL 语法错误:', e.message)
  process.exit(1)
}

console.log('\n=== 2. 新功能代码是否都在 ===')
const checks = [
  ['授权状态：右上角按钮', '.dsh-ima-authbtn{'],
  ['授权状态：浮窗', 'var authPopover ='],
  ['搜索框 CSS', '.dsh-ima-search{'],
  ['命中高亮 CSS', '.dsh-ima-hit{'],
  ['空状态 CSS', '.dsh-ima-emptybox{'],
  ['排序 CSS', '.dsh-ima-sortbtn'],
  ['KBD 快捷键提示', '.dsh-ima-kbd{'],
  ['HIT_TEXT 变量', 'var HIT_TEXT'],
  ['高亮渲染函数', 'pushPlain'],
  ['onVerify 处理', 'var onVerify = function'],
  ['runSearch 处理', 'var runSearch = function'],
  ['防抖搜索', 'setTimeout(function () { runSearch(query) }, 300)'],
  ['Ctrl+K 快捷键', "e.key === 'k'"],
  ['Esc 逻辑', "e.key === 'Escape'"],
  ['滚动到命中处', "querySelector('.dsh-ima-hit')"],
  ['排序逻辑', 'var sortedItems'],
  ['authInfo 渲染', 'var authInfo ='],
  ['searchBar 渲染', 'var searchBar ='],
  ['searchArea 渲染', 'var searchArea ='],
  ['空状态引导按钮', '去 ima 上传'],
]
let bad = 0
for (const [label, needle] of checks) {
  const ok = txt.includes(needle)
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}
console.log(`\n通过 ${checks.length - bad} / ${checks.length}`)
process.exit(bad ? 1 : 0)
