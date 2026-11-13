/**
 * 用 Chrome 无头模式把 SVG 渲染成 PNG（256 / 512 / 1024）。
 * 不引入 sharp/canvas 之类的原生依赖，用现成的浏览器就行。
 */
const { spawn } = require('child_process')
const http = require('http')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.join(os.homedir(), '.dsh', 'plugins', 'dsh-ima')
const SVG = path.join(ROOT, 'assets', 'logo.svg')
const OUT = path.join(ROOT, 'assets')
const PORT = 9455
const PROFILE = path.join(os.tmpdir(), 'dsh-ima-render')
const EXE = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'

const SIZES = [256, 512, 1024]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { reject(e) } })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => req.destroy(new Error('timeout')))
  })
}

function cdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new globalThis.WebSocket(wsUrl)
    let id = 0
    const pending = new Map()
    ws.addEventListener('message', (ev) => {
      let m; try { m = JSON.parse(ev.data) } catch { return }
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id)
        m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result)
      }
    })
    ws.addEventListener('error', () => reject(new Error('WS error')))
    ws.addEventListener('open', () => resolve({
      send(method, params) {
        const mid = ++id
        return new Promise((res, rej) => {
          pending.set(mid, { resolve: res, reject: rej })
          ws.send(JSON.stringify({ id: mid, method, params: params || {} }))
        })
      },
      close() { try { ws.close() } catch {} },
    }))
  })
}

;(async () => {
  if (!fs.existsSync(SVG)) { console.log('logo.svg 不存在'); process.exit(1) }
  fs.mkdirSync(PROFILE, { recursive: true })

  const proc = spawn(EXE, [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--headless=new', '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars',
    'about:blank',
  ], { detached: true, stdio: 'ignore' })
  proc.unref()

  let ver
  for (let i = 0; i < 40; i++) {
    try { ver = await getJson(`http://127.0.0.1:${PORT}/json/version`); if (ver) break } catch {}
    await sleep(500)
  }
  if (!ver) { console.log('浏览器没起来'); process.exit(1) }
  await sleep(1500)

  const list = await getJson(`http://127.0.0.1:${PORT}/json/list`)
  const page = list.find((t) => t.type === 'page')
  const c = await cdp(page.webSocketDebuggerUrl)
  await c.send('Runtime.enable')

  const svg = fs.readFileSync(SVG, 'utf8')

  for (const size of SIZES) {
    await c.send('Emulation.setDeviceMetricsOverride', {
      width: size, height: size, deviceScaleFactor: 1, mobile: false,
    })
    const html = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`
    await c.send('Runtime.evaluate', {
      expression: `document.open();document.write(${JSON.stringify(html)});document.close();`,
    })
    await sleep(700)

    const shot = await c.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: size, height: size, scale: 1 },
      captureBeyondViewport: false,
      fromSurface: true,
    })
    const file = path.join(OUT, `logo-${size}.png`)
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'))
    console.log(`  ${path.basename(file)}  ${(fs.statSync(file).size / 1024).toFixed(1)}KB`)
  }

  // 额外产出 64px 的 favicon 尺寸
  await c.send('Emulation.setDeviceMetricsOverride', { width: 64, height: 64, deviceScaleFactor: 1, mobile: false })
  const html64 = `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', '<svg width="64" height="64" ')}</body></html>`
  await c.send('Runtime.evaluate', { expression: `document.open();document.write(${JSON.stringify(html64)});document.close();` })
  await sleep(600)
  const shot64 = await c.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 64, height: 64, scale: 1 }, fromSurface: true })
  fs.writeFileSync(path.join(OUT, 'logo-64.png'), Buffer.from(shot64.data, 'base64'))
  console.log(`  logo-64.png  ${(fs.statSync(path.join(OUT, 'logo-64.png')).size / 1024).toFixed(1)}KB`)

  c.close()
  console.log('\n完成')
})()
