// Split the extracted English dictionaries into translation chunks.
// usage: node make-chunks.mjs <en-dicts.json> <outDir> [maxKeysPerChunk]
import fs from 'node:fs'
import path from 'node:path'

const [input, outDir, maxKeysArg] = process.argv.slice(2)
if (!input || !outDir) {
  console.error('usage: node make-chunks.mjs <en-dicts.json> <outDir> [maxKeysPerChunk]')
  process.exit(2)
}
const maxKeys = Number(maxKeysArg ?? 300)
const data = JSON.parse(fs.readFileSync(input, 'utf8'))
const namespaces = data.namespaces

const chunks = []
let current = { namespaces: {}, keyCount: 0 }
for (const [ns, dict] of Object.entries(namespaces)) {
  const count = Object.keys(dict).length
  if (current.keyCount > 0 && current.keyCount + count > maxKeys) {
    chunks.push(current)
    current = { namespaces: {}, keyCount: 0 }
  }
  current.namespaces[ns] = { en: dict }
  current.keyCount += count
}
if (current.keyCount > 0) chunks.push(current)

fs.mkdirSync(outDir, { recursive: true })
chunks.forEach((chunk, index) => {
  const name = `chunk-${String(index + 1).padStart(2, '0')}.json`
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(chunk, null, 2))
  console.log(`${name}: ${chunk.keyCount} keys, namespaces: ${Object.keys(chunk.namespaces).join(', ')}`)
})
console.log(`chunks=${chunks.length} totalKeys=${data.keyCount}`)
