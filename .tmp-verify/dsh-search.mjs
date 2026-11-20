// Bounded search inside the installed DSH ASAR through the Electron runtime.
// usage: node dsh-search.mjs <literal> [maxHits]
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.env.DSH_INSTALL_DIR
const packagesDir = join(root, '..', '..')
const term = process.argv[2]
const maxHits = Number(process.argv[3] ?? 40)
const maxBytes = 1024 * 1024
let hits = 0

function walk(dir, depth) {
  if (depth > 4 || hits >= maxHits) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (hits >= maxHits) return
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      walk(path, depth + 1)
      continue
    }
    if (!/\.(js|mjs|cjs|ts|md|yml|yaml|json)$/.test(entry.name)) continue
    let size = 0
    try {
      size = statSync(path).size
    } catch {
      continue
    }
    if (size > maxBytes) continue
    let text = ''
    try {
      text = readFileSync(path, 'utf8')
    } catch {
      continue
    }
    if (!text.includes(term)) continue
    const lines = text.split('\n')
    const found = []
    lines.forEach((line, index) => {
      if (line.includes(term) && found.length < 6) found.push(`    ${index + 1}: ${line.trim().slice(0, 200)}`)
    })
    console.log(path)
    console.log(found.join('\n'))
    hits += 1
  }
}

console.log('packages dir:', packagesDir)
walk(packagesDir, 0)
console.log('files reporting the term:', hits)
