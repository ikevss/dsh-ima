/**
 * 用用户提供的这组凭证直接打一次 ima 接口，看真实失败原因。
 * 凭证只从环境变量读，不落盘、不写进任何文件。
 */
const CID = process.env.T_CID
const KEY = process.env.T_KEY

if (!CID || !KEY) {
  console.log('缺少测试凭证（通过环境变量传入）')
  process.exit(1)
}

console.log('=== 凭证形态检查 ===')
console.log(`  Client ID 长度: ${CID.length}（32 位十六进制? ${/^[0-9a-f]{32}$/i.test(CID)}）`)
console.log(`  API Key   长度: ${KEY.length}`)
console.log(`  API Key 含空格/换行: ${/[\s]/.test(KEY)}`)
console.log(`  API Key 含不可见字符: ${/[\u0000-\u001f\u200b-\u200f\ufeff]/.test(KEY)}`)
console.log(`  API Key 结尾: ...${KEY.slice(-4)}`)

async function call(path, body) {
  const res = await fetch('https://ima.qq.com/' + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ima-openapi-clientid': CID,
      'ima-openapi-apikey': KEY,
      'ima-openapi-ctx': 'skill_version=probe',
    },
    body: JSON.stringify(body || {}),
  })
  const t = await res.text()
  return { status: res.status, raw: t.slice(0, 300) }
}

;(async () => {
  console.log('\n=== 直接调用 listKnowledgeBases ===')
  const r = await call('openapi/wiki/v1/search_knowledge_base', { query: '', limit: 1, cursor: '' })
  console.log(`  HTTP ${r.status}`)
  console.log(`  响应: ${r.raw}`)
})()
