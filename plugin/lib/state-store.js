import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Write JSON atomically: full temp file first, then rename over the target. */
export async function writeJsonFile(file, value) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${nextTempId()}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporary, file)
}

let tempCounter = 0
function nextTempId() {
  tempCounter = (tempCounter + 1) % 1_000_000
  return `${tempCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** Read JSON, returning `undefined` when the file is absent or unreadable. */
export async function readJsonFile(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * Small durable JSON store with serialized writes.
 *
 * Plugin memory is a derived cache: everything here can be rebuilt from the
 * chat id plus the user's commands, so a lost file only costs a re-pairing.
 */
export class JsonStateStore {
  #file
  #defaults
  #state
  #loadPromise
  #queue = Promise.resolve()

  constructor(file, defaults) {
    this.#file = file
    this.#defaults = defaults
  }

  async load() {
    this.#loadPromise ??= readJsonFile(this.#file).then((stored) => {
      this.#state = { ...structuredClone(this.#defaults), ...(stored && typeof stored === 'object' ? stored : {}) }
      return this.#state
    })
    return this.#loadPromise
  }

  get state() {
    if (this.#state === undefined) throw new Error('JsonStateStore.load() must be awaited first')
    return this.#state
  }

  /**
   * Apply one mutation and persist the result. Mutations run in call order.
   * @param {(state: Record<string, unknown>) => unknown} mutate
   */
  update(mutate) {
    this.#queue = this.#queue.then(async () => {
      await this.load()
      mutate(this.#state)
      await writeJsonFile(this.#file, this.#state)
      return this.#state
    })
    return this.#queue
  }
}
