// Extract locale dictionaries (namespace -> English keys) from the packaged DSH ASAR.
// usage: node extract-dicts.mjs <archive> <outJson>
import fs from 'node:fs'

const [archive, outJson] = process.argv.slice(2)
if (!archive || !outJson) {
  console.error('usage: node extract-dicts.mjs <archive> <outJson>')
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

function readEntry(node) {
  const data = Buffer.alloc(node.size)
  const start = contentOffset + Number(node.offset)
  let read = 0
  while (read < node.size) {
    const n = fs.readSync(fd, data, read, node.size - read, start + read)
    if (n <= 0) break
    read += n
  }
  return data.toString('utf8')
}

const files = []
function walk(node, rel) {
  if (!node || typeof node !== 'object') return
  if (node.files) {
    for (const [name, child] of Object.entries(node.files)) walk(child, rel ? `${rel}/${name}` : name)
    return
  }
  if (typeof node.offset !== 'string' || typeof node.size !== 'number') return
  files.push({ rel, node })
}
walk(header, '')

function skipWs(text, i) {
  while (i < text.length && /\s/.test(text[i])) i++
  return i
}

function skipString(text, i) {
  const quote = text[i]
  let j = i + 1
  while (j < text.length) {
    const ch = text[j]
    if (ch === '\\') { j += 2; continue }
    if (quote === '`' && ch === '$' && text[j + 1] === '{') { j = scanBalanced(text, j + 1) + 1; continue }
    if (ch === quote) return j + 1
    j++
  }
  throw new Error('unterminated string')
}

function scanBalanced(text, i) {
  const open = text[i]
  const close = open === '{' ? '}' : open === '(' ? ')' : open === '[' ? ']' : null
  if (close === null) throw new Error(`not a delimiter at ${i}: ${open}`)
  let depth = 0
  let j = i
  while (j < text.length) {
    const ch = text[j]
    if (ch === '"' || ch === "'" || ch === '`') { j = skipString(text, j); continue }
    if (ch === '/' && text[j + 1] === '/') {
      const nl = text.indexOf('\n', j)
      j = nl < 0 ? text.length : nl + 1
      continue
    }
    if (ch === '/' && text[j + 1] === '*') {
      const end = text.indexOf('*/', j + 2)
      j = end < 0 ? text.length : end + 2
      continue
    }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return j
    }
    j++
  }
  throw new Error('unbalanced')
}

function splitTopLevel(text, from, to) {
  const parts = []
  let start = from
  let j = from
  const depthStack = []
  while (j < to) {
    const ch = text[j]
    if (ch === '"' || ch === "'" || ch === '`') { j = skipString(text, j); continue }
    if (ch === '/' && text[j + 1] === '/') {
      const nl = text.indexOf('\n', j)
      j = nl < 0 ? to : nl + 1
      continue
    }
    if (ch === '/' && text[j + 1] === '*') {
      const end = text.indexOf('*/', j + 2)
      j = end < 0 ? to : end + 2
      continue
    }
    if (ch === '{' || ch === '(' || ch === '[') depthStack.push(ch)
    else if (ch === '}' || ch === ')' || ch === ']') depthStack.pop()
    else if (ch === ',' && depthStack.length === 0) {
      parts.push([start, j])
      start = j + 1
    }
    j++
  }
  if (to > start) parts.push([start, to])
  return parts
}

const EMPTY = Object.freeze({})

/** A JavaScript evaluator that resolves bundle-local identifiers on demand. */
function createEvaluator(text) {
  const declarations = new Map()
  const declRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/g
  let match
  while ((match = declRe.exec(text)) !== null) {
    const name = match[1]
    const start = match.index + match[0].length
    if (text[start] !== '{') continue
    let end
    try {
      end = scanBalanced(text, start)
    } catch {
      continue
    }
    const list = declarations.get(name) ?? []
    list.push({ name, pos: match.index, src: text.slice(start, end + 1) })
    declarations.set(name, list)
  }
  // Array declarations, for packs that register `[[locale, dict], ...]` pairs.
  const arrays = []
  const arrayRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g
  while ((match = arrayRe.exec(text)) !== null) {
    const start = match.index + match[0].length - 1
    let end
    try {
      end = scanBalanced(text, start)
    } catch {
      continue
    }
    arrays.push({ name: match[1], pos: match.index, src: text.slice(start, end + 1) })
  }
  const cache = new Map()
  const proxy = new Proxy(Object.create(null), {
    has: (_target, key) => typeof key === 'string',
    get: (_target, key) => {
      if (typeof key !== 'string') return undefined
      const list = declarations.get(key)
      if (list === undefined) return EMPTY
      const decl = list[list.length - 1]
      if (cache.has(decl)) return cache.get(decl)
      cache.set(decl, EMPTY)
      const value = evaluate(decl.src, decl.pos)
      cache.set(decl, value)
      return value
    },
  })
  function evaluate(src, pos) {
    try {
      return new Function('__scope__', `with (__scope__) { return (${src}) }`)(proxy)
    } catch {
      try {
        return new Function(`return (${src})`)()
      } catch {
        return undefined
      }
    }
  }
  return { evaluate, declarations, proxy, arrays }
}

function asDictionary(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const cleaned = {}
  for (const [key, item] of Object.entries(value)) if (typeof item === 'string') cleaned[key] = item
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

const dicts = new Map()
const warnings = []

function record(ns, en, source) {
  if (typeof ns !== 'string' || !ns.length || en === undefined) return
  const existing = dicts.get(ns)
  if (existing === undefined) {
    dicts.set(ns, { en: { ...en }, sources: [source] })
    return
  }
  for (const [key, value] of Object.entries(en)) if (!(key in existing.en)) existing.en[key] = value
  existing.sources.push(source)
}

for (const { rel, node } of files) {
  if (!rel.endsWith('lib/client.js')) continue
  if (!rel.includes('/@deepseek-ai/')) continue
  if (node.size > 12 * 1024 * 1024) continue
  const text = readEntry(node)
  const { evaluate, declarations, arrays } = createEvaluator(text)
  const re = /locale\.register\(/g
  let match
  while ((match = re.exec(text)) !== null) {
    const openParen = match.index + match[0].length - 1
    let closeParen
    try {
      closeParen = scanBalanced(text, openParen)
    } catch {
      continue
    }
    const args = splitTopLevel(text, openParen + 1, closeParen)
    if (args.length < 2) continue
    const nsExpr = text.slice(args[0][0], args[0][1]).trim()
    let ns
    const literal = /^['"`]([^'"`]+)['"`]$/.exec(nsExpr)
    if (literal) ns = literal[1]
    else if (/^[A-Za-z_$][\w$]*$/.test(nsExpr)) {
      const nsRe = new RegExp(`(?:const|let|var)\\s+${nsExpr.replace(/\$/g, '\\$')}\\s*=\\s*['"\`]([^'"\`]+)['"\`]`)
      const found = nsRe.exec(text.slice(0, match.index))
      if (found) ns = found[1]
    }
    if (ns === undefined) {
      warnings.push(`${rel}: unresolved namespace ${nsExpr.slice(0, 60)}`)
      continue
    }
    const argStart = skipWs(text, args[1][0])
    let enDict
    if (text[argStart] === '{') {
      const argEnd = scanBalanced(text, argStart)
      const argSrc = text.slice(argStart, argEnd + 1)
      enDict = asDictionary(evaluate(argSrc, match.index))
      if (enDict === undefined) {
        // The argument is a locale map such as { zh, en, ja } or { en: en$1 }.
        for (const [a, b] of splitTopLevel(text, argStart + 1, argEnd)) {
          const raw = text.slice(a, b)
          const colon = raw.indexOf(':')
          const key = (colon < 0 ? raw : raw.slice(0, colon)).trim().replace(/^['"`]|['"`]$/g, '')
          if (key !== 'en') continue
          const value = (colon < 0 ? raw : raw.slice(colon + 1)).trim()
          const valueStart = skipWs(text, a + (colon < 0 ? raw.indexOf(value) : colon + 1))
          const dict = text[valueStart] === '{'
            ? asDictionary(evaluate(text.slice(valueStart, scanBalanced(text, valueStart) + 1), match.index))
            : asDictionary(evaluate(value, match.index))
          if (dict !== undefined) {
            enDict = dict
            break
          }
        }
      }
    } else {
      // A named dictionary binding such as `const dictionaries = { en: {...} }`.
      const argExpr = text.slice(args[1][0], args[1][1]).trim()
      if (/^[A-Za-z_$][\w$]*$/.test(argExpr)) {
        const value = evaluate(argExpr, match.index)
        if (value !== null && typeof value === 'object') {
          enDict = asDictionary(value.en) ?? asDictionary(value)
        }
      }
    }
    if (enDict === undefined) {
      // Some packs keep `const dictionaries = [[locale, dict], ...]` and
      // register each pair through the three-argument form.
      for (const declaration of arrays) {
        if (declaration.pos >= match.index) continue
        const end = declaration.src.length - 1
        for (const [a, b] of splitTopLevel(declaration.src, 1, end)) {
          const part = declaration.src.slice(a, b).trim()
          if (!part.startsWith('[')) continue
          const innerEnd = part.lastIndexOf(']')
          const items = splitTopLevel(part, 1, innerEnd)
          if (items.length < 2) continue
          const localeExpr = part.slice(items[0][0], items[0][1]).trim()
          const locale = /^['"`]([^'"`]+)['"`]$/.exec(localeExpr)?.[1]
          if (locale !== 'en') continue
          const dictExpr = part.slice(items[1][0], items[1][1]).trim()
          enDict = asDictionary(evaluate(dictExpr, match.index))
          if (enDict !== undefined) break
        }
        if (enDict !== undefined) break
      }
    }
    if (enDict === undefined) {
      warnings.push(`${rel}: could not resolve English dictionary for ${ns}`)
      continue
    }
    record(ns, enDict, rel)
  }
}

fs.closeSync(fd)

let total = 0
const namespaces = [...dicts.keys()].sort()
for (const ns of namespaces) total += Object.keys(dicts.get(ns).en).length
const output = { namespaceCount: namespaces.length, keyCount: total, namespaces: {} }
for (const ns of namespaces) output.namespaces[ns] = dicts.get(ns).en
fs.writeFileSync(outJson, JSON.stringify(output, null, 2))
console.log(`namespaces=${namespaces.length} keys=${total}`)
for (const ns of namespaces) console.log(`  ${ns}: ${Object.keys(dicts.get(ns).en).length}`)
if (warnings.length > 0) {
  console.log(`--- warnings (${warnings.length}) ---`)
  for (const warning of warnings.slice(0, 80)) console.log(warning)
}
