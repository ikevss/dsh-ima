/**
 * 直接测试 CDP 端口 9333 现在返回什么。
 * 绑定流程第一步就是探测 http://127.0.0.1:9333/json/version，
 * 如果这个端口被别的程序（或残留的浏览器）占着，就会返回非 JSON。
 */
const http = require('http')

function probe(url, timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => resolve({ status: res.statusCode, ctype: res.headers['content-type'], raw: d.slice(0, 200), len: d.length }))
    })
    req.on('error', (e) => resolve({ status: 'ERR', raw: e.message }))
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve({ status: 'TIMEOUT', raw: '' }) })
  })
}

;(async () => {
  console.log('=== 探测 CDP 9333 ===')
  for (const p of ['/json/version', '/json/list']) {
    const r = await probe(`http://127.0.0.1:9333${p}`)
    console.log(`\n${p}`)
    console.log(`  status : ${r.status}`)
    console.log(`  ctype  : ${r.ctype || '(无)'}`)
    console.log(`  len    : ${r.len ?? '-'}`)
    console.log(`  raw    : ${JSON.stringify(r.raw)}`)
    if (r.raw) {
      try { JSON.parse(r.raw); console.log('  可解析为 JSON: 是') } catch (e) { console.log(`  可解析为 JSON: 否 -> ${e.message}`) }
    }
  }

  // 顺便看端口是谁在监听
  console.log('\n=== 端口占用 ===')
  const { execSync } = require('child_process')
  try {
    const out = execSync('netstat -ano | findstr :9333', { encoding: 'utf8', timeout: 8000 })
    console.log(out.trim() || '(无占用)')
  } catch { console.log('(无监听进程)') }
})()
