/**
 * 逐个探测 /api/ima/* 路由，看哪个返回 "not found"。
 * 不带 cookie 时应当统一是 401（准入生效）；
 * 若某个路径返回 not found，说明它没被 prefix 路由命中。
 */
const http = require('http')

const PORT = process.env.DSH_PORT || 64346
const BASE = `http://127.0.0.1:${PORT}`

const PATHS = [
  '/api/ima/status',
  '/api/ima/verify',
  '/api/ima/bind',
  '/api/ima/unbind',
  '/api/ima/detectLocal',
  '/api/ima/adoptLocal',
  '/api/ima/acquire',
  '/api/ima/acquireStatus',
  '/api/ima/knowledgeBases',
  '/api/ima/media',
  '/api/ima/mediaContent',
  '/api/ima/search',
  '/api/ima/upload',
  '/api/ima/addUrl',
]

function probe(p, method) {
  return new Promise((resolve) => {
    const req = http.request(`${BASE}${p}`, { method }, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => resolve({ p, method, status: res.statusCode, body: d.slice(0, 100) }))
    })
    req.on('error', (e) => resolve({ p, method, status: 'ERR', body: e.message.slice(0, 60) }))
    req.setTimeout(8000, () => { req.destroy(); resolve({ p, method, status: 'TIMEOUT', body: '' }) })
    req.end()
  })
}

;(async () => {
  console.log(`探测 ${BASE}\n`)
  for (const p of PATHS) {
    const r = await probe(p, 'GET')
    const flag = r.status === 401 ? 'OK   ' : '★    '
    console.log(`${flag}${String(r.status).padEnd(8)} ${p.padEnd(28)} ${r.body.replace(/\n/g, ' ')}`)
  }

  console.log('\n=== 关键：POST 方式（绑定走 POST）===')
  for (const p of ['/api/ima/acquire', '/api/ima/adoptLocal', '/api/ima/bind']) {
    const r = await probe(p, 'POST')
    console.log(`     ${String(r.status).padEnd(8)} POST ${p.padEnd(22)} ${r.body.replace(/\n/g, ' ')}`)
  }
})()
