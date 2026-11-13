/**
 * 用周鹏库里真实的文件名 + ima 返回的 mediaType，验证图标判断是不是对的。
 * 重点验证那个坑：文件名是 .txt 但 ima 标成 mediaType=13（录音）。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const vm = require('vm')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const ima = require(path.join(ROOT, 'lib', 'ima-client.js'))

// 从 client.src.js 里把判断逻辑抠出来单独跑
const src = fs.readFileSync(path.join(ROOT, 'build', 'client.src.js'), 'utf8')

function grab(name, kind) {
  const re = kind === 'var'
    ? new RegExp('var ' + name + ' = \\{[\\s\\S]*?\\n\\}', 'm')
    : new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}', 'm')
  const m = src.match(re)
  return m ? m[0] : null
}

const code = [
  grab('EXT_GLYPH', 'var'),
  grab('TYPE_GLYPH', 'var'),
  grab('extOfTitle', 'fn'),
  grab('resolveGlyph', 'fn'),
].filter(Boolean).join('\n')

const sandbox = { console, String }
vm.createContext(sandbox)
vm.runInContext(code + '\n;this.__resolve = resolveGlyph;', sandbox)
const resolve = sandbox.__resolve

;(async () => {
  const c = ima.loadCredentials()
  const kbs = await ima.listKnowledgeBases(c, { type: 'all' })

  console.log('=== 真实文件：文件名后缀 vs 渲染图形 ===\n')
  let rows = []
  for (const kb of kbs.knowledgeBases) {
    try {
      const r = await ima.listMedia(c, kb.id, { folderId: '', limit: 20 })
      for (const i of (r.items || [])) {
        if (i.isFolder) continue
        rows.push({
          title: i.title,
          imaType: i.mediaType,
          imaLabel: i.typeLabel,
          glyph: resolve(i.title, i.mediaType),
        })
      }
    } catch {}
  }

  // 打印，标出「ima 类型和最终图形不一致」的（说明后缀纠正生效了）
  for (const r of rows) {
    const byType = { 1:'paper',2:'web',3:'word',4:'slide',5:'sheet',6:'web',7:'markdown',8:'image',9:'note',10:'chat',11:'text',12:'mind',13:'audio',14:'video',15:'audio',16:'archive',20:'code',21:'book',99:'folder' }
    const fixed = byType[r.imaType] && byType[r.imaType] !== r.glyph
    console.log(`  ${fixed ? '★' : ' '} ${r.glyph.padEnd(9)} ${String(r.imaLabel || '').padEnd(9)} ${r.title}`)
  }

  console.log('\n=== 关键用例 ===')
  const cases = [
    ['会议培训.txt', 13, 'text'],
    ['报告.pdf', 1, 'paper'],
    ['方案.docx', 3, 'word'],
    ['数据.xlsx', 5, 'sheet'],
    ['演示.pptx', 4, 'slide'],
    ['说明.md', 7, 'markdown'],
    ['录音.m4a', 13, 'audio'],
    ['视频.mp4', 14, 'video'],
    ['没有扩展名的文本', 11, 'text'],
    ['完全没后缀没类型', 999, 'unknown'],
  ]
  let bad = 0
  for (const [title, type, want] of cases) {
    const got = resolve(title, type)
    const ok = got === want
    console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${title.padEnd(20)} type=${String(type).padEnd(4)} -> ${got}${ok ? '' : ' (期望 ' + want + ')'}`)
    if (!ok) bad++
  }
  console.log(`\n通过 ${cases.length - bad} / ${cases.length}`)
})()
