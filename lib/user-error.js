/**
 * 用户可见的错误文案层。
 *
 * 原则（来自产品验收清单）：
 *   出错不说错误码，说**人话 + 下一步怎么办**。
 *
 * 这个文件是唯一出口：所有要显示给用户的错误都必须过 userMessage()。
 * 技术细节（原始 message、错误码、堆栈）只进日志，绝不进界面。
 */

/** 网络类：连不上、超时 */
const NETWORK_HINTS = [
  [/ENOTFOUND|EAI_AGAIN|getaddrinfo/i, '网络连不上。检查一下网络，然后重试。'],
  [/ECONNREFUSED/i, '连接被拒绝了。请重试；一直不行就重启一下 DSH。'],
  [/ETIMEDOUT|timeout|timed out/i, '等太久了没响应。检查网络后重试。'],
  [/ECONNRESET|socket hang up/i, '连接中断了。重试一次通常就好。'],
  [/network|fetch failed/i, '网络请求没成功。检查网络后重试。'],
]

/** 凭证类 */
const AUTH_HINTS = [
  [/skill auth failed|凭证验证未通过/i, 'ima 授权没通过。请重新绑定，或去 ima 开放平台确认密钥还在。'],
  [/empty access token|凭证已失效|not bound|尚未绑定/i, 'ima 授权已失效，需要重新绑定。'],
  [/permission|权限|220030/i, '这个内容 ima 不开放读取（订阅类知识库），换一个库试试。'],
]

/** 文件类 */
const FILE_HINTS = [
  [/ENOENT|no such file|找不到.*文件|cannot find/i, '找不到这个文件。确认路径没写错，或文件被移走了。'],
  [/EACCES|EPERM|permission denied/i, '没有权限读写这个文件。换个位置，或用管理员权限试试。'],
  [/EISDIR/i, '这里要的是文件，不是文件夹。'],
  [/ENOSPC/i, '磁盘空间不够了。清理一下再试。'],
  [/文件太大|too large|payload/i, '文件太大了（上限约 30MB）。换个小一点的，或先压缩。'],
]

/** ima 接口类 */
const IMA_HINTS = [
  [/request.*frequency|频率|200001/i, '操作太频繁了，等十几秒再试。'],
  [/duplicate|重名|已存在/i, '这个文件已经有了。ima 不支持覆盖，可以改名后重传。'],
  [/invalid media_type|不支持的格式/i, '这个格式传不了。支持 PDF / Word / PPT / Excel / Markdown / 图片 / TXT 等常用格式。'],
  [/文件上传失败|UPLOAD_FAILED/i, '文件没传上去。检查网络后重试；大文件请先确认没超过 30MB。'],
]

const ALL_HINTS = [].concat(NETWORK_HINTS, AUTH_HINTS, FILE_HINTS, IMA_HINTS)

/**
 * 把任意异常翻译成用户能看懂的一句话。
 *
 * @param {Error|string} e 原始异常
 * @param {object} opts
 *   - action: 用户刚才想做什么（"读取文件" / "上传" / "绑定账号"），拼进兜底文案
 *   - fallback: 完全兜底时用的话
 * @returns {string} 只有人话，不含错误码与技术细节
 */
function userMessage(e, opts) {
  const o = opts || {}
  const raw = String((e && e.message) || e || '')
  const code = e && e.code

  // 1. 已经是我们自己写好的中文提示（不含技术特征）→ 直接用
  //    判断依据：有中文、且不含英文异常关键字
  const isHuman = /[\u4e00-\u9fff]/.test(raw) &&
    !/Error:|at \w+\.|undefined is not|Unexpected|JSON|stack|ENOENT|ECONN/.test(raw)
  if (isHuman && raw.length <= 200) return raw

  // 2. 按特征匹配已知失败类型
  for (const [re, msg] of ALL_HINTS) {
    if (re.test(raw) || (code && re.test(String(code)))) return msg
  }

  // 3. 兜底：说清楚"哪一步没成 + 该怎么办"，不提技术细节
  const action = o.action || '操作'
  return o.fallback || `${action}没成功。稍后再试一次；一直不行就重启一下 DSH。`
}

module.exports = { userMessage }
