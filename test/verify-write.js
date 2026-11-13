/**
 * 写入能力自检：确认上传相关代码都在、语法可编译、接口能加载。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const vm = require('vm')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')

console.log('=== 1. 客户端 bundle ===')
const client = fs.readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8')
try {
  new vm.Script(client, { filename: 'client.js' })
  console.log('  OK  语法可编译')
} catch (e) {
  console.log('  FAIL', e.message)
  process.exit(1)
}

const clientChecks = [
  ['上传按钮', "'上传'"],
  ['文件选择 input', 'type: \'file\''],
  ['doUpload 处理', 'var doUpload = function'],
  ['FileReader 读取', 'new FileReader()'],
  ['重名确认对话', "window.confirm('知识库里已有同名文件"],
  ['上传进度列表', 'dsh-ima-uplist'],
  ['拖拽上传 onDrop', 'onDrop: function'],
  ['拖拽提示层', 'dsh-ima-drop'],
  ['自动刷新列表', 'setTimeout(function () { loadMedia(curKb, curFolder) }, 600)'],
  ['清空上传记录', '清空记录'],
]
let bad = 0
for (const [label, needle] of clientChecks) {
  const ok = client.includes(needle)
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

console.log('\n=== 2. 宿主半 ===')
const host = require(path.join(ROOT, 'lib', 'index.js'))
console.log('  OK  加载成功, tools inject =', JSON.stringify(host.inject))

const hostSrc = fs.readFileSync(path.join(ROOT, 'lib', 'index.js'), 'utf8')
const hostChecks = [
  ['/api/ima/upload 路由', "'/api/ima/upload'"],
  ['/api/ima/addUrl 路由', "'/api/ima/addUrl'"],
  ['ima_upload_file 工具', "'ima_upload_file'"],
  ['ima_add_url 工具', "'ima_add_url'"],
  ['40MB 请求体', '40 * 1024 * 1024'],
]
for (const [label, needle] of hostChecks) {
  const ok = hostSrc.includes(needle)
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

console.log('\n=== 3. 写入模块 ===')
const ima = require(path.join(ROOT, 'lib', 'ima-client.js'))
const modChecks = [
  ['uploadFile', typeof ima.uploadFile === 'function'],
  ['importUrls', typeof ima.importUrls === 'function'],
  ['checkRepeatedNames', typeof ima.checkRepeatedNames === 'function'],
  ['appendTimestamp', typeof ima.appendTimestamp === 'function'],
  ['支持 23 种格式', ima.supportedExts().length === 23],
]
for (const [label, ok] of modChecks) {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}`)
  if (!ok) bad++
}

console.log(`\n通过 ${clientChecks.length + hostChecks.length + modChecks.length - bad} / ${clientChecks.length + hostChecks.length + modChecks.length}`)
process.exit(bad ? 1 : 0)
