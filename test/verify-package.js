/**
 * 发布前元数据自检 —— 防止把插件市场用来识别仓库的关键字段改坏。
 *
 * 背景：Open Plugin Market 的审核反馈明确说
 *   「包名 ik-dsh-ima 与仓库名 dsh-ima 不一致，我们是靠 repository 字段绑定到仓库的，
 *     以后千万不要删包里的 repository，否则会认不回来。」
 *
 * 所以 repository 不是"可选元数据"，是硬约束。任何一次 npm publish 之前都必须过这一关。
 */
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

const REPO_OWNER = 'ikevss'
const REPO_NAME = 'dsh-ima'
const EXPECT_URL = `github.com/${REPO_OWNER}/${REPO_NAME}`

let bad = 0
const check = (label, ok, detail) => {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${detail ? '  ' + detail : ''}`)
  if (!ok) bad++
}

console.log('=== 1. repository（市场靠它绑定仓库，不可删）===')
const repo = pkg.repository
check('repository 存在', !!repo)
check('Type 为 git', repo && repo.type === 'git', repo && repo.type)
check(
  `url 指向 ${EXPECT_URL}`,
  !!(repo && String(repo.url).includes(EXPECT_URL)),
  repo && repo.url,
)
check(
  'url 用 git+https 前缀（npm 规范）',
  !!(repo && String(repo.url).startsWith('git+https://')),
  repo && String(repo.url).slice(0, 20),
)
check('directory 字段存在', !!(repo && repo.directory === '.'), repo && JSON.stringify(repo.directory))

console.log('\n=== 2. homepage / bugs ===')
check('homepage 存在', !!pkg.homepage, pkg.homepage)
check('homepage 指向本仓库', !!(pkg.homepage && pkg.homepage.includes(EXPECT_URL)))
check('bugs.url 存在', !!(pkg.bugs && pkg.bugs.url), pkg.bugs && pkg.bugs.url)
check('bugs.url 指向本仓库', !!(pkg.bugs && String(pkg.bugs.url).includes(EXPECT_URL)))

console.log('\n=== 3. 包名与仓库名的一致性约定 ===')
check('包名固定为 ik-dsh-ima', pkg.name === 'ik-dsh-ima', pkg.name)
check('包名与仓库名不一致是既定事实（不是错误）', pkg.name !== REPO_NAME)
console.log('       包名 ik-dsh-ima ←→ 仓库 dsh-ima，市场靠 repository 关联，必须保留')

console.log('\n=== 4. 插件市场识别所需 ===')
check('keywords 含 dsh-plugin', (pkg.keywords || []).includes('dsh-plugin'))
check('keywords 含 dsh', (pkg.keywords || []).includes('dsh'))
check('license 存在', !!pkg.license, pkg.license)
check('version 是正式版（无 -alpha/-beta/-rc）', !/-/.test(pkg.version), pkg.version)

console.log('\n=== 5. 安装期脚本（审阅者会看）===')
const scripts = pkg.scripts || {}
// 只关心「别人装这个包时会不会自动跑脚本」。
// prepublishOnly 是发包前在**作者本机**跑的，不在安装链路里，不算风险。
const RISKY = ['preinstall', 'install', 'postinstall', 'prepare']
const risky = RISKY.filter((s) => scripts[s])
check('无安装期自动执行脚本', risky.length === 0, risky.length ? '发现: ' + risky.join(', ') : '')
console.log('       全部 scripts: ' + (Object.keys(scripts).join(', ') || '(无)'))
console.log('       build / test / verify / prepublishOnly 都是手动触发的，安装时不会跑')

console.log('\n=== 6. 必填文件是否随包发出 ===')
const files = pkg.files || []
;['lib', 'assets', 'cordis.patch.yml', 'README.md', 'CHANGELOG.md', 'LICENSE'].forEach((f) => {
  check(`files 含 ${f}`, files.includes(f))
})
check('assets/logo.svg 实际存在', fs.existsSync(path.join(ROOT, 'assets', 'logo.svg')))
check('assets/logo-256.png 实际存在', fs.existsSync(path.join(ROOT, 'assets', 'logo-256.png')))

console.log(`\n${bad === 0 ? '全部通过 —— 可以发布' : bad + ' 项不通过 —— 不要发布'}`)
if (bad) {
  console.log('\n⚠️ repository 字段是插件市场识别仓库的唯一依据，删了会认不回来。')
}
process.exit(bad ? 1 : 0)
