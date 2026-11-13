/**
 * 端到端：模拟界面上的「上传」按钮，走 /api/ima/upload 背后的同一条链路。
 * 直接调 uploadFile（HTTP 路由层只是转发），确认重名保护也生效。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const ima = require(path.join(ROOT, 'lib', 'ima-client.js'))
const KB = process.env.IMA_KB_ID || 'ima_kb_REPLACE_ME'

;(async () => {
  const c = ima.loadCredentials()
  if (!c) { console.log('未绑定'); return }

  const buf = fs.readFileSync(path.join(ROOT, 'README.md'))

  console.log('=== A. 首次上传 README.md ===')
  const r1 = await ima.uploadFile(c, KB, { name: 'ima读写能力说明.md', buffer: buf, size: buf.length })
  console.log(' ', JSON.stringify(r1).slice(0, 300))

  console.log('\n=== B. 再传一次同名（应被重名保护拦下）===')
  const r2 = await ima.uploadFile(c, KB, { name: 'ima读写能力说明.md', buffer: buf, size: buf.length })
  console.log(' ', JSON.stringify(r2).slice(0, 400))

  console.log('\n=== C. 重名 + 自动改名（应成功）===')
  const r3 = await ima.uploadFile(c, KB, { name: 'ima读写能力说明.md', buffer: buf, size: buf.length }, { rename: true })
  console.log(' ', JSON.stringify(r3).slice(0, 300))

  console.log('\n=== 最终库内容 ===')
  const list = await ima.listMedia(c, KB, { folderId: '' })
  const items = list.items || []
  items.forEach((x) => console.log(`  - ${x.title}  (${x.typeLabel})`))
})()
