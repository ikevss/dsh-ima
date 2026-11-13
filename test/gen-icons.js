/**
 * 由 icons-raw.json 生成插件图标模块 build/dsh-icons.js。
 * 只导出 dsh-ima 真正用到的图标，避免把 92 个全塞进包里。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const raw = JSON.parse(fs.readFileSync(path.join(os.tmpdir(), 'dsh-ima-icons-raw.json'), 'utf8'))

// dsh-ima 用得到的图标
const WANTED = {
  // 面板/知识库
  'folder-open': '知识库/文件夹（与 ima 文件列表一致的实心文件夹）',
  'folder-open-outline': '文件夹（线性）',
  'folder-close': '折叠的文件夹/关闭态',
  'search-outline': '搜索',
  'refresh-outline': '刷新',
  'plus-outline': '新建/上传',
  'copy-outline': '复制',
  'link-outline': '打开原文/链接',
  'share-outline': '引用到对话',
  'download-outline': '下载原文件',
  'chevron-down-outline': '折叠/展开（下）',
  'chevron-right-outline': '折叠/展开（右）',
  'chevron-left-outline': '返回',
  'close-outline': '关闭',
  'check-outline': '完成/已选',
  'check-circle-outline': '验证通过',
  'warning-outline': '警告',
  'warning-triangle-outline': '风险提示',
  'info-outline': '说明',
  'clock-outline': '最近验证时间',
  // 文件类型图标（每个类型都要有一个，绝不留空）
  'deliver-doc': '文档类（PDF / Word / PPT / 文本）',
  'archive-check-outline': 'Excel / 表格（完成态归档，视觉上像表格）',
  'archive-outline': '压缩包/其它归档',
  'list-pen-outline': 'Markdown 笔记',
  'skill-outline': 'ima 笔记',
  'browse-outline': '图片',
  'globe-outline': '网页/微信文章',
  'database-outline': '数据/表格/知识库',
  'play-outline': '音视频',
  'branch-outline': 'XMind 思维导图',
  'new-chat-outline': '会话记录',
  'code-outline': '代码/HTML',
  'flat-list-outline': '纯文本',
  // 账号与操作
  'user-outline': '账号',
  'loading-outline': '加载中',
  'edit-outline': '编辑',
  'send-outline': '提交',
  'shield-outline': '授权',
  'settings-outline': '设置',
  'trash-outline': '解绑/删除',
  'paperclip-outline': '附件（已改用加号，保留备用）',
}

let out = `/**
 * DSH 内置图标（提取自 DSH 客户端，保持与宿主视觉一致）
 *
 * 来源：dsh-web-frontend bundle 的 ICON_SYMBOLS（内联 SVG，viewBox 0 0 17 17）
 * 特性：stroke="currentColor"，自动跟随 DSH 主题色；regular 线宽 1 / medium 1.5
 *
 * ⚠️ DSH 没有把图标库作为独立包导出，插件无法 require，只能内联。
 *    升级 DSH 后如果宿主图标变了，重跑 test/extract-icons.js 再跑
 *    test/gen-icons.js 即可同步。
 */

var ICON_SYMBOLS = {
`

for (const [name, desc] of Object.entries(WANTED)) {
  const v = raw[name]
  if (!v) { console.log('  缺失:', name); continue }
  // svgBody 是模板字符串体，结算 ${e} 为线宽参数
  const body = JSON.stringify(v.svgBody)
  out += `  // ${desc}\n  ${JSON.stringify(name)}: { size: ${v.size}, tpl: ${body} },\n`
}

out += `}

/** 生成一个图标：返回 { size, html }，html 里已填好线宽 */
function iconSvg(name, opts) {
  var v = ICON_SYMBOLS[name]
  if (!v) return null
  var o = opts || {}
  var stroke = o.stroke == null ? 1 : o.stroke
  return { size: o.size || v.size, html: v.tpl.replace(/\\$\\{e\\}/g, stroke) }
}

function hasIcon(name) { return Object.prototype.hasOwnProperty.call(ICON_SYMBOLS, name) }

exports.ICON_SYMBOLS = ICON_SYMBOLS
exports.iconSvg = iconSvg
exports.hasIcon = hasIcon
`

const outFile = path.join(ROOT, 'lib', 'dsh-icons.js')
fs.writeFileSync(outFile, out)
console.log('已导出', Object.keys(WANTED).length, '个图标 ->', outFile, (out.length / 1024).toFixed(1) + 'KB')
