/**
 * Hook 规则检查：useEffect / useState / useRef 不能出现在组件的条件 return 之后。
 * 这类问题 React 只在运行时报 #310（Rendered more hooks than during the previous render），
 * 很难定位，所以用静态扫一遍：在 ImaPage / BindDialog 等组件体内，
 * 第一个顶格的 `return` 之后就不该再有 hook 调用。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const FILE = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima', 'build', 'client.src.js')
const lines = fs.readFileSync(FILE, 'utf8').split('\n')

// 找组件定义起点：function Xxx(props) {
const comps = []
lines.forEach((l, i) => {
  const m = l.match(/^function ([A-Z]\w*)\(props\) \{/)
  if (m) comps.push({ name: m[1], start: i })
})

const HOOK_RE = /React\.(useEffect|useState|useRef|useMemo|useCallback|useLayoutEffect)\(/

let bad = 0
for (const c of comps) {
  // 组件体：从 start 到下一个顶格 `}` 或下一个 function
  let end = lines.length
  for (let i = c.start + 1; i < lines.length; i++) {
    if (/^\}/.test(lines[i]) || /^function [A-Z]/.test(lines[i])) { end = i; break }
  }

  // 找出组件体内「顶格 2 空格的 return」（组件早退）
  let earlyReturn = -1
  for (let i = c.start + 1; i < end; i++) {
    if (/^  return /.test(lines[i]) || /^  if \(.*\) \{$/.test(lines[i])) {
      // 只把真正跳过后续代码的 return 算进来
      if (/^  return /.test(lines[i])) { earlyReturn = i; break }
    }
  }

  const hooks = []
  for (let i = c.start + 1; i < end; i++) {
    if (HOOK_RE.test(lines[i])) hooks.push(i)
  }

  if (earlyReturn >= 0) {
    const after = hooks.filter((h) => h > earlyReturn)
    if (after.length) {
      console.log(`  FAIL ${c.name}: ${after.length} 个 hook 在早退(第 ${earlyReturn + 1} 行)之后 → React #310`)
      after.forEach((h) => console.log(`         第 ${h + 1} 行: ${lines[h].trim().slice(0, 80)}`))
      bad += after.length
    } else {
      console.log(`  OK   ${c.name}: ${hooks.length} 个 hook，全部在早退之前`)
    }
  } else {
    console.log(`  OK   ${c.name}: ${hooks.length} 个 hook，组件无早退`)
  }
}

console.log(`\n问题 ${bad} 处`)
process.exit(bad ? 1 : 0)
