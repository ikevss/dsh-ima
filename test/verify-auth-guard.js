/**
 * 准入检查单测：验证 /api/ima 的 handler 会拒绝未准入的请求。
 *
 * 做法：不启动 DSH，直接取出 apply 里那段逻辑的等价实现跑一遍。
 * 关键断言：
 *   1. connection 不可用 → 整段不注册路由（宁可不给，也不裸奔）
 *   2. isAuthenticated 返回 false → 写 401 且不调用任何业务逻辑
 *   3. isAuthenticated 返回 true → 正常放行
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const SRC = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima', 'lib', 'index.js')
const src = fs.readFileSync(SRC, 'utf8')

let bad = 0
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`)
  if (!ok) bad++
}

console.log('=== 1. 代码层面：准入是必需的 ===')
check('同时注入 webServer 与 connection', src.includes("inject(['webServer', 'connection']"))
check('connection 不可用时不注册路由', src.includes('为安全起见不注册 /api/ima 路由'))
check('检查 isAuthenticated', src.includes('conn.isAuthenticated(req)'))
check('未通过时调用 writeUnauthorized', src.includes('conn.writeUnauthorized(req, res)'))
check('有兜底 401（writeUnauthorized 抛错时）', src.includes("res.writeHead(401"))

console.log('\n=== 2. 顺序：准入在业务逻辑之前 ===')
// 路由表（const routes = {...}）定义在 handler 之前，那是定义不是执行。
// 真正要保证的是：handler 内部，准入检查出现在「解析 action / 调用路由函数」之前。
const handlerStart = src.indexOf("path: '/api/ima'")
const authCheck = src.indexOf('conn.isAuthenticated(req)')
const actionParse = src.indexOf('const fn = routes[action]')
check('isAuthenticated 出现在 handler 内', authCheck > handlerStart && handlerStart > 0)
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
    let authed = false
    try { authed = conn.isAuthenticated(req) } catch (e) { authed = false }
    if (!authed) {
      try { conn.writeUnauthorized(req, res) } catch (e) {
        res.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' })
        res.end('unauthorized\n')
      }
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
  // case A：未准入
  const resA = makeRes()
  let unauthorizedWritten = false
  const connA = {
    isAuthenticated: () => false,
    writeUnauthorized: (req, res) => { unauthorizedWritten = true; res.writeHead(401); res.end() },
  }
  const outA = await makeHandler(connA)({}, resA)
  check('未准入 → 返回 blocked', outA === 'blocked')
  check('未准入 → 调用了 writeUnauthorized', unauthorizedWritten)
  check('未准入 → 响应 401', resA.status === 401)

  // case B：已准入
  const resB = makeRes()
  const connB = { isAuthenticated: () => true, writeUnauthorized: () => {} }
  const outB = await makeHandler(connB)({}, resB)
  check('已准入 → 返回 passed', outB === 'passed')

  // case C：isAuthenticated 抛错 → 视为未准入
  const resC = makeRes()
  const connC = {
    isAuthenticated: () => { throw new Error('boom') },
    writeUnauthorized: (req, res) => { res.writeHead(401); res.end() },
  }
  const outC = await makeHandler(connC)({}, resC)
  check('isAuthenticated 抛错 → 仍拦住（fail-closed）', outC === 'blocked')
  check('isAuthenticated 抛错 → 响应 401', resC.status === 401)

  console.log(`\n${bad === 0 ? '全部通过' : bad + ' 项失败'}`)
  process.exit(bad ? 1 : 0)
})()
