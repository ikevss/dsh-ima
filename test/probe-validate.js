const path = require('path')
const os = require('os')
const ima = require(path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima', 'lib', 'ima-client.js'))

const cred = {
  clientId: process.env.T_CID,
  apiKey: process.env.T_KEY,
}

;(async () => {
  console.log('=== 直接调用 ima.validate() ===')
  try {
    const v = await ima.validate(cred)
    console.log('  成功:', JSON.stringify(v))
  } catch (e) {
    console.log('  失败!')
    console.log('  name   :', e.name)
    console.log('  code   :', e.code)
    console.log('  message:', e.message)
    console.log('  stack  :', String(e.stack).split('\n').slice(0, 4).join('\n           '))
  }
})()
