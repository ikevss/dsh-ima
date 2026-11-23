/**
 * 准入检查单测：验证 /api/ima 的 handler 会拒绝未准入的请求。
 *
 * 做法：不启动 DSH，直接取出 apply 里那段逻辑的等价实现跑一遍。
 * 关键断言：
 *   1. connection 不可用 → 整段不注册路由（宁可不给，也不裸奔）
 *   2. requestRejection 返回 401/403 或抛错 → 拒绝
 *   3. requestRejection 返回 undefined → 正常放行
 */
const fs = require('fs')
const path = require('path')
const SRC = path.join(__dirname, '..', 'lib', 'index.js')
const src = fs.readFileSync(SRC, 'utf8')

let bad = 0
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`)
  if (!ok) bad++
}

console.log('=== 1. 代码层面：准入是必需的 ===')
check('同时注入 webServer 与 connection', src.includes("inject(['webServer', 'connection']"))
check('connection 不可用时不注册路由', src.includes('为安全起见不注册 /api/ima 路由'))
check('检查公开准入方法', src.includes("typeof conn.requestRejection !== 'function'"))
check('仅在准入结果为 undefined 时继续', src.includes('if (rejection !== undefined)'))
check('准入异常时返回 401', src.includes('catch {\n          rejection = 401'))

console.log('\n=== 2. 顺序：准入在业务逻辑之前 ===')
// 路由表（const routes = {...}）定义在 handler 之前，那是定义不是执行。
// 真正要保证的是：handler 内部，准入检查出现在「解析 action / 调用路由函数」之前。
const handlerStart = src.indexOf("path: '/api/ima'")
const authCheck = src.indexOf('conn.requestRejection(req)')
const actionParse = src.indexOf('const fn = routes[action]')
check('requestRejection 出现在 handler 内', authCheck > handlerStart && handlerStart > 0)
check(
  '准入检查早于「查路由表并调用」',
  authCheck > 0 && actionParse > 0 && authCheck < actionParse,
  `auth@${authCheck} < 调用路由@${actionParse}`,
)
check(
  '准入检查早于参数解析（new URL）',
  authCheck < src.indexOf("url = new URL(req.url", handlerStart),
)

console.log('\n=== 3. 行为验证：模拟请求 ===')
// 提取 handler 里准入那一段等价逻辑，跑一次
function makeHandler(conn) {
  return async (req, res) => {
    // 与 index.js 里一致的准入逻辑
    let rejection
    try { rejection = conn.requestRejection(req) } catch { rejection = 401 }
    if (rejection !== undefined) {
      const status = rejection === 401 ? 401 : 403
      res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(status === 401 ? 'unauthorized\n' : 'forbidden\n')
      return 'blocked'
    }
    return 'passed'
  }
}

function makeRes() {
  const r = { status: null, ended: false, body: null }
  r.writeHead = (code, headers) => { r.status = code; r.headers = headers }
  r.end = (b) => { r.ended = true; r.body = b }
  return r
}

;(async () => {
  for (const status of [401, 403]) {
    const res = makeRes()
    const conn = { requestRejection: () => status }
    const out = await makeHandler(conn)({}, res)
    check('未准入 → 返回 blocked', out === 'blocked')
    check('未准入 → 响应 ' + status, res.status === status && res.ended)
  }

  // case B：已准入
  const resB = makeRes()
  const connB = { requestRejection: () => undefined }
  const outB = await makeHandler(connB)({}, resB)
  check('已准入 → 返回 passed', outB === 'passed')

  // 准入服务异常
  const resC = makeRes()
  const connC = { requestRejection: () => { throw new Error('boom') } }
  const outC = await makeHandler(connC)({}, resC)
  check('requestRejection 抛错 → 仍拦住（fail-closed）', outC === 'blocked')
  check('requestRejection 抛错 → 响应 401', resC.status === 401 && resC.ended)

  console.log(`\n${bad === 0 ? '全部通过' : bad + ' 项失败'}`)
  process.exit(bad ? 1 : 0)
})()
