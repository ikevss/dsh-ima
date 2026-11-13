/**
 * UI 验收自检：对照「顶级UI设计师」的验收清单，逐条查落地情况。
 * 特别检查：引用的 --dsw-* 变量是否全部真实存在（专家建议的变量一半在 DSH 里没有）。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const src = fs.readFileSync(path.join(ROOT, 'build', 'client.src.js'), 'utf8')

// DSH 真实变量（从 app.asar CSS 导出）
const REAL = new Set(`--dsw-alias-bg-base,--dsw-alias-bg-layer-1,--dsw-alias-bg-layer-2,--dsw-alias-bg-layer-3,--dsw-alias-bg-layer-4,--dsw-alias-bg-mask-1,--dsw-alias-bg-skeleton,--dsw-alias-border-l1,--dsw-alias-border-l2,--dsw-alias-border-l3,--dsw-alias-border-l4,--dsw-alias-brand-primary,--dsw-alias-button-primary-fill,--dsw-alias-button-primary-hover,--dsw-alias-interactive-bg-active,--dsw-alias-interactive-bg-hover,--dsw-alias-interactive-bg-hover-danger,--dsw-alias-label-primary,--dsw-alias-label-primary-foreground,--dsw-alias-label-secondary,--dsw-alias-label-tertiary,--dsw-alias-label-error,--dsw-alias-label-caption,--dsw-alias-label-dimmed,--dsw-alias-state-warn-primary,--dsw-alias-state-success-primary,--dsw-alias-state-error-primary,--dsw-alias-toast-bg,--dsw-alias-toast-label,--dsw-alias-tooltip-bg,--dsw-focus-ring-color,--dsw-radius-lg,--dsw-radius-md,--dsw-radius-sm,--dsw-elevation-soft,--dsw-elevation-prominent,--dsw-font-family,--dsw-font-xs-13`.split(','))

console.log('=== 1. 引用的主题变量是否都存在 ===')
const used = [...new Set([...src.matchAll(/--dsw-[a-z0-9-]+/g)].map((m) => m[0]))]
const missing = used.filter((v) => !REAL.has(v))
used.forEach((v) => {
  if (!REAL.has(v)) console.log(`  FAIL ${v}  ← DSH 里不存在`)
})
console.log(missing.length ? `  ${missing.length} 个不存在的变量` : `  OK  全部 ${used.length} 个变量都存在`)

console.log('\n=== 2. 动效是否到位 ===')
const anims = [
  ['骨架屏 shimmer', '@keyframes dsh-ima-shimmer'],
  ['列表项进场', '@keyframes dsh-ima-in'],
  ['浮窗弹出', '@keyframes dsh-ima-pop'],
  ['脉冲', '@keyframes dsh-ima-pulse'],
  ['不确定进度条', '@keyframes dsh-ima-indet'],
  ['交互统一过渡', '.dsh-ima-btn,.dsh-ima-ibtn'],
  ['按钮按下缩放', 'transform:scale(.97)'],
  ['焦点可见', ':focus-visible'],
  ['减少动态效果', 'prefers-reduced-motion'],
  ['骨架屏组件', 'dsh-ima-skel'],
  ['进度条组件', 'dsh-ima-prog'],
  ['列表项级联延迟', 'animation-delay:calc(var(--i,0) * 18ms)'],
]
let bad = 0
for (const [label, needle] of anims) {
  const ok = src.includes(needle)
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

console.log('\n=== 3. 错误样式 ===')
const errs = [
  ['统一 alert 样式', '.dsh-ima-alert{'],
  ['错误带图标', "className: 'dsh-ima-alert', role: 'alert'"],
  ['有重试按钮', "'重试'"],
  ['旧的裸红字已移除', !src.includes("className: 'dsh-ima-err'")],
]
for (const [label, v] of errs) {
  const ok = typeof v === 'boolean' ? v : src.includes(v)
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

console.log('\n=== 4. 无障碍 ===')
const a11y = [
  ['列表项可聚焦', "role: 'button'"],
  ['键盘可操作', 'onKeyDown'],
  ['触控目标 32px', 'width:32px;height:32px'],
]
for (const [label, needle] of a11y) {
  const ok = src.includes(needle)
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

const total = used.length + anims.length + errs.length + a11y.length
console.log(`\n不存在的主题变量: ${missing.length} 个`)
console.log(`功能检查失败: ${bad} 项`)
process.exit(missing.length || bad ? 1 : 0)
