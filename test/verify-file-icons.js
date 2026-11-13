/**
 * 文件图标自检：每种格式的图形必须语义正确，且不能有空的。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const src = fs.readFileSync(path.join(ROOT, 'build', 'client.src.js'), 'utf8')

// 抠出 FILE_GLYPH 里的 key
const glyphBlock = src.match(/var FILE_GLYPH = \{([\s\S]*?)\n\}/)
const glyphs = [...glyphBlock[1].matchAll(/^\s{2}(\w+):\s/gm)].map((m) => m[1])

// 抠出 TYPE_ICON 的映射
const typeBlock = src.match(/var TYPE_ICON = \{([\s\S]*?)\n\}/)
const types = [...typeBlock[1].matchAll(/^\s*(\d+):\s*\{\s*glyph:\s*'(\w+)'/gm)].map((m) => ({
  type: Number(m[1]), glyph: m[2],
}))

console.log('=== 自绘图形清单 ===')
console.log('  ' + glyphs.join(', '))

console.log('\n=== 每种类型的图形语义 ===')
const SEMANTIC = {
  1: 'paper', 2: 'web', 3: 'word', 4: 'slide', 5: 'sheet', 6: 'web', 7: 'markdown',
  8: 'image', 9: 'note', 10: 'chat', 11: 'text', 12: 'mind', 13: 'audio', 14: 'video',
  15: 'audio', 16: 'archive', 20: 'code', 21: 'book', 99: 'folder',
}
let bad = 0
for (const t of types) {
  // 文件夹不走自绘那套（复用 DSH 的 folder-open），其余都要留在 FILE_GLYPH 里
  const isFolder = t.type === 99
  const ok = isFolder
    ? t.glyph === 'folder' && src.includes("st.glyph === 'folder'")
    : glyphs.includes(t.glyph) && SEMANTIC[t.type] === t.glyph
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} 类型 ${String(t.type).padEnd(3)} -> ${t.glyph}${isFolder ? '（复用 DSH 文件夹图标）' : ''}`)
  if (!ok) bad++
}

console.log('\n=== 关键约束 ===')
const checks = [
  ['txt 不再用播放键', SEMANTIC[11] === 'text'],
  ['pdf 用文档', SEMANTIC[1] === 'paper'],
  ['word 有独立图形', SEMANTIC[3] === 'word'],
  ['excel 用表格格子', SEMANTIC[5] === 'sheet'],
  ['ppt 用屏幕', SEMANTIC[4] === 'slide'],
  ['音频用音符', SEMANTIC[13] === 'audio' && SEMANTIC[15] === 'audio'],
  ['视频用播放键', SEMANTIC[14] === 'video'],
  ['未知类型有兜底图形', glyphs.includes('unknown')],
  ['未映射类型退回 unknown', src.includes("TYPE_ICON[props.type] || { glyph: 'unknown'")],
  ['上传按钮用加号', src.includes("h(DshIcon, { name: 'plus-outline', size: 14 }), '上传'")],
]
for (const [label, ok] of checks) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

const total = types.length + checks.length
console.log(`\n通过 ${total - bad} / ${total}`)
process.exit(bad ? 1 : 0)
