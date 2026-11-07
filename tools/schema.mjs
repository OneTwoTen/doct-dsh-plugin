// Extract endpoint descriptors (jsonSchema lines) from a typert host schema module.
// usage: node schema.mjs <file> <endpoint> [<endpoint>...]
import fs from 'node:fs'

const [file, ...keys] = process.argv.slice(2)
const text = fs.readFileSync(file, 'utf8')

function block(key) {
  const needle = `'${key}': {`
  const start = text.indexOf(needle)
  if (start < 0) return undefined
  let depth = 0
  let i = text.indexOf('{', start)
  const begin = i
  for (; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) break
    }
  }
  return text.slice(begin, i + 1)
}

for (const key of keys) {
  const b = block(key)
  if (!b) {
    console.log(`### ${key}: NOT FOUND`)
    continue
  }
  console.log(`### ${key}`)
  const desc = /description: '(.*?)',\n/.exec(b)
  if (desc) console.log(`desc: ${desc[1]}`)
  // parameters: [{ name, jsonSchema }]
  const re = /name: '(\w+)',[\s\S]*?jsonSchema: (\{.*?\}),\n/g
  let m
  while ((m = re.exec(b))) {
    console.log(`param ${m[1]}: ${m[2]}`)
    // stop at next parameter/result by consuming
  }
  const res = /result: \{[\s\S]*?jsonSchema: (\{.*?\}),\n/.exec(b)
  if (res) console.log(`result: ${res[1]}`)
}
