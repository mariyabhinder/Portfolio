// Bakes src/assets/meadow/sit-flow.json: the dense alignment between her neighbouring sit-up pictures (see sit-flow-browser.js for what it computes).
// Run it again whenever the pictures or the landmarks (SIT_POSES in src/components/meadow/landing.ts) change:
//   1. start the dev server (npm run dev) and note its port;   2. node scripts/bake-sit-flow.cjs [port]
// It drives a headless Chrome (no other dependencies) and takes about a minute.
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const port = process.argv[2] || '5173'
const root = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(root, 'src/components/meadow/landing.ts'), 'utf8').split('\r').join('')
const posesText = src.match(/const K0[\s\S]*?\n\]\n/)[0].replace('export const SIT_POSES', 'const SIT_POSES')
const poses = eval(posesText + ';SIT_POSES')
const files = ['landing-girl', 'position2', 'position5', 'position6', 'j1', 'j2', 'j3', 'j4', 'j5']
const pics = poses.map((p, k) => ({ url: `/src/assets/meadow/${files[k]}.webp`, w: p.w, h: p.h, s: p.s, hip: p.hip, marks: p.marks }))

const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p))
if (!chromePath) throw new Error('Chrome not found')
const debugPort = 9337
const chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${path.join(os.tmpdir(), 'bake-sit-flow')}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

;(async () => {
  let list
  for (let i = 0; i < 40; i++) { try { list = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json(); if (list.length) break } catch {} await sleep(250) }
  const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pend = {}
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) pend[m.id](m) }
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) })
  // a page on the dev server's origin, so the pictures can be fetched and read back
  await send('Page.navigate', { url: `http://127.0.0.1:${port}${pics[1].url}` })
  await sleep(1500)
  const fn = fs.readFileSync(path.join(__dirname, 'sit-flow-browser.js'), 'utf8')
  const r = await send('Runtime.evaluate', { expression: `${fn}(${JSON.stringify({ pics, G: 48, Q: 1 })})`, awaitPromise: true, returnByValue: true, timeout: 600000 })
  if (r.result.exceptionDetails) { console.error(JSON.stringify(r.result.exceptionDetails, null, 1)); process.exitCode = 1 } else {
    const res = JSON.parse(r.result.result.value)
    // Int16 quantised (1/8 px) -> base64, to keep the asset small
    const b64 = (a) => Buffer.from(new Int16Array(a).buffer).toString('base64')
    const out = { G: res.G, scale: 8, fields: res.fields.map((f) => ({ fwd: f.fwd && b64(f.fwd), bwd: f.bwd && b64(f.bwd) })) }
    fs.writeFileSync(path.join(root, 'src/assets/meadow/sit-flow.json'), JSON.stringify(out))
    console.log(JSON.stringify(res.log, null, 1))
    console.log('wrote src/assets/meadow/sit-flow.json', fs.statSync(path.join(root, 'src/assets/meadow/sit-flow.json')).size, 'bytes')
  }
  ws.close(); chrome.kill(); process.exit()
})()
