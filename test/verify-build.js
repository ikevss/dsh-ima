/**
 * 构建产物自检：确认内联的图标模块和组件代码都正确落进了 lib/client.js。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const f = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima', 'lib', 'client.js')
const txt = fs.readFileSync(f, 'utf8')

const checks = [
  ['文件大小 > 7MB', txt.length > 7_000_000],
  ['__ModuleLoader__ 存在', txt.includes('__ModuleLoader__')],
  ['图标数据（folder-open）', txt.includes('"folder-open"')],
  ['图标数据（database-outline）', txt.includes('"database-outline"')],
  ['ICON_SYMBOLS 定义', txt.includes('var ICON_SYMBOLS')],
  ['iconSvg 函数', txt.includes('function iconSvg')],
  ['DSH_ICONS 别名', txt.includes('var DSH_ICONS')],
  ['DshIcon 组件', txt.includes('function DshIcon')],
  ['旧的 macOS 渐变图标已移除', !txt.includes('Big Sur 风格')],
  ['旧的 TYPE_STYLE 已移除', !txt.includes('var TYPE_STYLE')],
  ['旧的 icoSvg 已移除', !txt.includes('function icoSvg')],
  ['未残留 require 语句', !txt.includes("require('./dsh-icons')")],
  ['槽位注入 sidebar.panellist', txt.includes('sidebar.panellist')],
  ['exports.apply', txt.includes('exports.apply = apply')],
  ['exports.inject', txt.includes('exports.inject = inject')],
]

let pass = 0, fail = 0
for (const [label, ok] of checks) {
  console.log(`${ok ? '  OK  ' : '  FAIL'} ${label}`)
  ok ? pass++ : fail++
}
console.log(`\n通过 ${pass} / ${checks.length}，失败 ${fail}`)
process.exit(fail ? 1 : 0)
