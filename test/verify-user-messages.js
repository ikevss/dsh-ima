/**
 * 界面文案自检：用户可见的错误里不允许出现技术细节。
 *
 * 规则（产品验收清单）：出错不说错误码，说人话 + 下一步怎么办。
 * 这个脚本扫全部代码，找出任何把技术错误直接送进用户可见字段的地方。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
let bad = 0
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`)
  if (!ok) bad++
}

// ── 1. 翻译层存在且可用 ──
console.log('=== 1. 错误翻译层 ===')
const { userMessage } = require(path.join(ROOT, 'lib', 'user-error.js'))
check('user-error.js 可加载', typeof userMessage === 'function')

const TECH_WORDS = /Error|at \w+\.\w+|Unexpected|JSON|ENOENT|ECONN|undefined|TypeError|stack|media_type/i
const CASES = [
  'ECONNREFUSED 127.0.0.1:9333',
  'Unexpected token o, "not found" is not valid JSON',
  'ENOENT: no such file or directory',
  'TypeError: Cannot read properties of undefined (reading "x") at foo.js:12',
  'invalid media_type. You MUST correct the value',
  'request frequency limit',
  '',
]
let leak = 0
for (const raw of CASES) {
  const out = userMessage(new Error(raw), { action: '上传文件' })
  if (TECH_WORDS.test(out) || /[\u4e00-\u9fff]/.test(out) === false) {
    console.log(`        泄漏: "${raw.slice(0, 30)}" -> "${out}"`)
    leak++
  }
}
check(`${CASES.length} 种技术错误都翻成人话（无泄漏）`, leak === 0)
check('人话原文不重复加工', userMessage(new Error('ima 授权已失效，请重新绑定。')) === 'ima 授权已失效，请重新绑定。')

// ── 2. 宿主代码里不再有裸 e.message 进用户字段 ──
console.log('\n=== 2. 宿主半 ===')
const hostSrc = fs.readFileSync(path.join(ROOT, 'lib', 'index.js'), 'utf8')
// 注意：acquireState.message 是「已经翻译过的状态文本」，转发给前端不算泄漏
const rawMsg = hostSrc.split('\n')
  .map((l, i) => ({ l, i: i + 1 }))
  .filter(({ l }) => {
    if (/userMessage|console\.|acquireState\.message/.test(l)) return false
    return /(message|errMsg)\s*[:=][^;]*e\.message/.test(l)
  })
check('无裸 e.message 进入用户可见字段', rawMsg.length === 0, rawMsg.length ? `${rawMsg.length} 处：${rawMsg[0].i} 行` : '')
check('已接入 userMessage', hostSrc.includes('userMessage('))
check('已引入翻译模块', hostSrc.includes("require('./user-error')"))

// ── 3. 浏览器半 ──
console.log('\n=== 3. 浏览器自动化 ===')
const brSrc = fs.readFileSync(path.join(ROOT, 'lib', 'ima-browser.js'), 'utf8')
check('启动失败给人话', brSrc.includes('没能启动浏览器。确认装了 Chrome 或 Edge'))
check('异常兜底给人话', brSrc.includes('自动绑定没成功。可以再试一次，或改用手动填写。'))
check('技术细节只进 console', brSrc.includes("console.warn('[dsh-ima] 自动绑定异常：'"))
const bareInBr = brSrc.split('\n').filter((l) => /message:\s*[^,}]*e\.message/.test(l) && !/console/.test(l))
check('无裸 e.message 进 message 字段', bareInBr.length === 0, bareInBr.length ? bareInBr[0].trim().slice(0, 80) : '')

// ── 4. 客户端 ──
console.log('\n=== 4. 界面层 ===')
const clSrc = fs.readFileSync(path.join(ROOT, 'build', 'client.src.js'), 'utf8')
check('有 errText 翻译函数', clSrc.includes('function errText'))
check('catch 里用 errText', clSrc.includes("setErrMsg(errText(e, '自动绑定'))"))
// errText(e, ...) 本身就是翻译，不算裸传；要查的是「没经过翻译」的
const bareInCl = clSrc.split('\n').filter((l) =>
  /setErrMsg\(\s*(String\()?e(\.message)?\b/.test(l) && !/errText/.test(l),
)
check('无裸 e 进 setErrMsg（必须过 errText）', bareInCl.length === 0, bareInCl.length ? bareInCl[0].trim().slice(0, 80) : '')
check('friendlyAcquireError 仍在', clSrc.includes('function friendlyAcquireError'))

// ── 5. 构建产物 ──
console.log('\n=== 5. 构建产物 ===')
const bundle = fs.readFileSync(path.join(ROOT, 'lib', 'client.js'), 'utf8')
check('bundle 含 errText', bundle.includes('function errText'))
check('bundle 含 friendlyAcquireError', bundle.includes('friendlyAcquireError'))

console.log(`\n${bad === 0 ? '全部通过' : bad + ' 项失败'}`)
process.exit(bad ? 1 : 0)
