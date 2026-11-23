/**
 * 验证「整段粘贴自动拆」对真实凭证有效。
 * 用用户实际提供的两串（只做解析测试，不发网络请求）。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const SRC = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima', 'build', 'client.src.js')
const src = fs.readFileSync(SRC, 'utf8')

// 从源码里抠出 parseCreds 定义，在沙箱里跑
const m = src.match(/function parseCreds\(text\) \{[\s\S]*?\n\}/)
if (!m) { console.log('找不到 parseCreds'); process.exit(1) }

// 用 Function 把定义体求值出来：定义名是 parseCreds，返回值就是它
const parseCreds = new Function(m[0] + '\nreturn parseCreds')()

const CID = '8010c0aa28095de8b6385791f027fa28'
const KEY = '7v4Y4Zp0PqNiqXLh32eNAfIrevib9o34k5OnRh62VbfTSPTorNwKV1omjFUkKDL3W0jO8B5DZg=='

const CASES = [
  {
    name: 'ima 官方「一键复制」的原始格式（带标签）',
    text: `Client ID: ${CID}\nAPI Key: ${KEY}`,
  },
  {
    name: '两行纯值（无标签）',
    text: `${CID}\n${KEY}`,
  },
  {
    name: '一行空格分隔',
    text: `${CID} ${KEY}`,
  },
  {
    name: '前后带多余说明的整段',
    text: `以下是你的 ima 凭证，请妥善保存：\n\nClient ID：${CID}\nAPI Key：${KEY}\n\n如泄露请到官网重置。`,
  },
  {
    name: 'JSON 格式',
    text: JSON.stringify({ clientId: CID, apiKey: KEY }),
  },
  {
    name: '带首尾空格的粘贴',
    text: `  ${CID}  \n\n  ${KEY}  `,
  },
]

console.log('=== 解析测试（真实凭证）===\n')
let bad = 0
for (const c of CASES) {
  const r = parseCreds(c.text)
  const okCid = r.clientId === CID
  const okKey = r.apiKey === KEY
  const ok = okCid && okKey
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${c.name}`)
  if (!ok) {
    console.log(`       clientId: ${r.clientId === CID ? '对' : `错 (${r.clientId ? r.clientId.slice(0, 20) + '…' : '未识别'})`}`)
    console.log(`       apiKey  : ${r.apiKey === KEY ? '对' : `错 (${r.apiKey ? r.apiKey.slice(0, 20) + '… 长度' + r.apiKey.length : '未识别'})`}`)
    bad++
  }
}

console.log(`\n通过 ${CASES.length - bad} / ${CASES.length}`)
process.exit(bad ? 1 : 0)
