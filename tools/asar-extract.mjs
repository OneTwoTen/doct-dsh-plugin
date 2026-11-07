// Minimal ASAR extractor: extract selected entries from an Electron .asar archive.
// usage: node asar-extract.mjs <archive> <outDir> [substring-filter...]
import fs from 'node:fs'
import path from 'node:path'

const [archive, outDir, ...filters] = process.argv.slice(2)
if (!archive || !outDir) {
  console.error('usage: node asar-extract.mjs <archive> <outDir> [filters...]')
  process.exit(2)
}

const fd = fs.openSync(archive, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(4)
const jsonSize = head.readUInt32LE(12)
const jsonBuf = Buffer.alloc(jsonSize)
fs.readSync(fd, jsonBuf, 0, jsonSize, 16)
const header = JSON.parse(jsonBuf.toString('utf8'))
const contentOffset = 8 + headerSize

let written = 0
const want = (rel) => filters.length === 0 || filters.some((f) => rel.includes(f))

function walk(node, rel) {
  if (!node || typeof node !== 'object') return
  if (node.files) {
    for (const [name, child] of Object.entries(node.files)) walk(child, rel ? `${rel}/${name}` : name)
    return
  }
  if (typeof node.offset === 'string' && typeof node.size === 'number') {
    const relPath = rel.replaceAll('/', path.sep)
    if (!want(relPath)) return
    const target = path.join(outDir, relPath)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    const data = Buffer.alloc(node.size)
    const strt = contentOffset + Number(node.offset)
    let read = 0
    while (read < node.size) {
      const n = fs.readSync(fd, data, read, node.size - read, strt + read)
      if (n <= 0) break
      read += n
    }
    fs.writeFileSync(target, data.subarray(0, read))
    written++
  }
}

walk(header, '')
fs.closeSync(fd)
console.log(`extracted ${written} file(s) to ${outDir}`)
