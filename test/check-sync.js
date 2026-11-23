/**
 * 检查准入修复是否已经同步到两个 profile 的实际安装里。
 * 1.11.4 发布时因为 DSH 在运行、文件被锁，拷贝可能没成功。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const SRC = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima', 'lib', 'index.js')
const srcTxt = fs.readFileSync(SRC, 'utf8')

const marks = [
  ['connection 注入', /inject\(\['webServer', 'connection'\]/],
  ['isAuthenticated 检查', /conn\.isAuthenticated\(req\)/],
  ['writeUnauthorized', /conn\.writeUnauthorized\(req, res\)/],
  ['不可用时不注册', /为安全起见不注册 \/api\/ima 路由/],
]

const check = (label, txt) => {
  const miss = marks.filter(([n, re]) => !re.test(txt)).map(([n]) => n)
  console.log(`  ${miss.length === 0 ? 'OK  ' : 'FAIL'} ${label}`)
  if (miss.length) console.log(`        缺少: ${miss.join(', ')}`)
  return miss.length === 0
}

console.log('=== 源码 ===')
const srcOk = check('lib/index.js（源码）', srcTxt)

console.log('\n=== 两个 profile 的实际安装 ===')
let allOk = srcOk
for (const p of ['web', 'desktop']) {
  const f = path.join(os.homedir(), '.dsh', 'profiles', p, 'node_modules', 'ik-dsh-ima', 'lib', 'index.js')
  if (!fs.existsSync(f)) {
    console.log(`  FAIL ${p}: 文件不存在`)
    allOk = false
    continue
  }
  allOk = check(`${p}`, fs.readFileSync(f, 'utf8')) && allOk
}

console.log(`\n${allOk ? '全部已同步' : '存在未同步项 —— 需要重新拷贝'}`)
process.exit(allOk ? 0 : 1)
