#!/usr/bin/env node
/**
 * Start the development Web Remote relay.
 *
 *   node tools/dev-relay/index.mjs --port 8787
 *
 * Then set, in the DSH plugin row:
 *
 *   webRemote:
 *     enabled: true
 *     relayUrl: 'http://127.0.0.1:8787'
 *
 * The script prints the WebChat URL (with its one-time dev token) and the
 * pairing URL. This relay is for local development only: in-memory state, no
 * TLS, one user.
 */
import { createRelayServer } from './relay.mjs'
import { generateAccessToken } from './pairing.mjs'
import { networkInterfaces } from 'node:os'

const options = parseArgs(process.argv.slice(2))
const webToken = options['web-token'] ?? generateAccessToken()
const port = numberOption(options.port, 8787)
const host = options.host ?? '127.0.0.1'

const relay = createRelayServer({
  webToken,
  publicUrl: options['public-url'],
  onPairing({ code, device }) {
    console.log(`\n[relay] yÃªu cáº§u ghÃ©p cáº·p: ${device.name} (${device.platform})`)
    console.log(`[relay] mÃ£: ${code}`)
    const bases = [`http://${hostForPrint(host)}:${actualPort}`, ...lanUrls(host, actualPort)]
    for (const value of bases) {
      console.log(`[relay] duyá»‡t táº¡i ${value}/pair?code=${encodeURIComponent(code)}`)
    }
    console.log('')
  },
})

const address = await relay.listen(port, host)
const actualPort = typeof address === 'object' && address !== null ? address.port : port
const base = `http://${hostForPrint(host)}:${actualPort}`

console.log('')
console.log('Dev Web Remote relay')
console.log('--------------------')
console.log(`Relay URL   : ${base}`)
console.log(`WebChat     : ${base}/?token=${encodeURIComponent(webToken)}`)
for (const lan of lanUrls(host, actualPort)) {
  console.log(`  (LAN)     : ${lan}/?token=${encodeURIComponent(webToken)}`)
}
console.log(`Pair page   : ${base}/pair`)
console.log('')
console.log('Cáº¥u hÃ¬nh DSH:')
console.log('  webRemote:')
console.log('    enabled: true')
console.log(`    relayUrl: '${options['public-url'] ?? base}'`)
console.log('')
console.log('Ctrl+C Ä‘á»ƒ dá»«ng.')
console.log('')

let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  console.log('\n[relay] Ä‘ang dá»«ngâ€¦')
  await relay.close()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())

function hostForPrint(value) {
  if (value === '0.0.0.0' || value === '::') return '127.0.0.1'
  return value.includes(':') ? `[${value}]` : value
}

/** When bound to every interface, print the LAN addresses a phone can open. */
function lanUrls(host, port) {
  if (host !== '0.0.0.0' && host !== '::') return []
  const result = []
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        result.push(`http://${address.address}:${port}`)
      }
    }
  }
  return result
}

function numberOption(value, fallback) {
  const number = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) continue
    const [name, inline] = item.slice(2).split('=', 2)
    if (inline !== undefined) {
      result[name] = inline
      continue
    }
    const next = argv[index + 1]
    if (next === undefined || next.startsWith('--')) {
      result[name] = true
    } else {
      result[name] = next
      index += 1
    }
  }
  return result
}
