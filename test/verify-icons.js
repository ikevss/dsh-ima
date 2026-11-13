const m = require(process.env.USERPROFILE + '/.dsh/plugins/dsh-ima/lib/dsh-icons.js')
const r = m.iconSvg('folder-open')
console.log('长度:', r.html.length)
console.log('含 ${e} 占位:', r.html.includes('${e}'))
const mw = r.html.match(/stroke-width="([^"]*)"/)
console.log('stroke-width 实际值:', mw && mw[1])
console.log('全部图标可生成:')
let bad = 0
for (const k of Object.keys(m.ICON_SYMBOLS)) {
  const x = m.iconSvg(k)
  if (!x || x.html.includes('${e}') || !x.html.startsWith('<svg')) { console.log('  异常:', k); bad++ }
}
console.log(bad === 0 ? '  全部正常' : `  ${bad} 个异常`)
