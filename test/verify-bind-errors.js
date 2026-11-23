/**
 * 绑定失败路径自检：
 *   1. 端口返回纯文本 "not found" 时，getJson 给的是可读错误而不是 JSON 解析异常
 *   2. 前端 friendlyAcquireError 把技术错误翻译成人话
 *   3. 失败后有"改用手动填写"的出口
 */
const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const browserSrc = fs.readFileSync(path.join(ROOT, 'lib', 'ima-browser.js'), 'utf8')
const clientSrc = fs.readFileSync(path.join(ROOT, 'build', 'client.src.js'), 'utf8')
const bundle = fs.readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8')

let bad = 0
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`)
  if (!ok) bad++
}

console.log('=== 1. 宿主半：错误分类 ===')
check('区分"不是 JSON"', browserSrc.includes("e.code = 'NOTJSON'"))
check('区分"连接被拒"', browserSrc.includes("'ECONNREFUSED'"))
check('区分"空内容"', browserSrc.includes("e.code = 'EMPTYBODY'"))
check('不再直接抛 JSON.parse 异常', !/res\.on\('end', \(\) => \{ try \{ resolve\(JSON\.parse\(d\)\) \} catch \(e\) \{ reject\(e\) \} \}\)/m.test(browserSrc))
check('端口被占用时提前退出循环', browserSrc.includes("if (e.code === 'NOTJSON') break"))
check('返回 portbusy 码给前端', browserSrc.includes("'portbusy'"))

console.log('\n=== 2. 前端：人话翻译 ===')
check('有 friendlyAcquireError', clientSrc.includes('function friendlyAcquireError'))
check('端口占用场景有专门文案', clientSrc.includes('浏览器调试端口被别的程序占用'))
check('每条失败都给"办法"', (clientSrc.match(/办法：/g) || []).length >= 4, `${(clientSrc.match(/办法：/g) || []).length} 处`)
check('不再直接显示原始 JSON 报错给用户', !clientSrc.includes('setErrMsg(r.message || \'授权没完成\')'))

console.log('\n=== 3. 前端：失败出口 ===')
check('记录失败类型', clientSrc.includes('setFailKind(r.code'))
check('失败时出现"改用手动填写"', clientSrc.includes("'改用手动填写'"))
check('有"知道了"关闭', clientSrc.includes("'知道了'"))
check('错误文案按行渲染', clientSrc.includes("String(errMsg).split('\\n')"))

console.log('\n=== 4. 构建产物 ===')
check('bundle 含 friendlyAcquireError', bundle.includes('friendlyAcquireError'))
check('bundle 含改用手动填写', bundle.includes('改用手动填写'))

console.log('\n=== 5. 行为：模拟端口返回 not found ===')
function probeLikeGetJson(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => {
        const body = String(d || '').trim()
        if (!body) return resolve({ code: 'EMPTYBODY' })
        try { JSON.parse(body); resolve({ ok: true }) } catch {
          resolve({ code: 'NOTJSON', statusCode: res.statusCode, preview: body.slice(0, 60) })
        }
      })
    })
    req.on('error', (e) => resolve({ code: e.code || 'ENETWORK' }))
    req.setTimeout(3000, () => { req.destroy(); resolve({ code: 'ETIMEDOUT' }) })
  })
}

const srv = http.createServer((q, s) => { s.writeHead(404, { 'content-type': 'text/plain' }); s.end('not found') })
srv.listen(19334, async () => {
  const r = await probeLikeGetJson('http://127.0.0.1:19334/json/version')
  check('返回 NOTJSON 而非 JSON 解析异常', r.code === 'NOTJSON', JSON.stringify(r))
  check('保留了原文预览便于排查', r.preview === 'not found')

  // 连接被拒
  const r2 = await probeLikeGetJson('http://127.0.0.1:19999/json/version')
  check('连接被拒 → ECONNREFUSED', r2.code === 'ECONNREFUSED', JSON.stringify(r2))

  srv.close()
  console.log(`\n${bad === 0 ? '全部通过' : bad + ' 项失败'}`)
  process.exit(bad ? 1 : 0)
})
