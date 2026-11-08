import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Errors a rename can answer with while another process holds the target open. */
const RETRYABLE_WRITE = new Set(['EBUSY', 'EPERM', 'EACCES'])

/** Pause between two write attempts. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms).unref?.()
  })
}

/**
 * Write JSON atomically: full temp file first, then rename over the target.
 *
 * Windows refuses a rename while any reader holds the target open, and both
 * `status.json` and `state.json` are meant to be readable at any moment, so the
 * rename is retried a few times before the write is given up.
 *
 * @param file destination file.
 * @param value the JSON document.
 * @param attempts how many times a transient rename failure is retried.
 */
export async function writeJsonFile(file: string, value: unknown, attempts = 6): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.${nextTempId()}.tmp`
  const text = `${JSON.stringify(value, null, 2)}\n`
  for (let attempt = 1; ; attempt += 1) {
    try {
      await writeFile(temporary, text, 'utf8')
      await rename(temporary, file)
      return
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code ?? ''
      if (attempt >= attempts || !RETRYABLE_WRITE.has(code)) throw error
      await delay(10 * attempt)
    }
  }
}

let tempCounter = 0
function nextTempId(): string {
  tempCounter = (tempCounter + 1) % 1_000_000
  return `${tempCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** Read JSON, returning `undefined` when the file is absent or unreadable. */
export async function readJsonFile(file: string): Promise<unknown> {
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
export class JsonStateStore<S extends object> {
  #file: string
  #defaults: S
  #state: S | undefined
  #loadPromise: Promise<S> | undefined
  #queue: Promise<unknown> = Promise.resolve()

  constructor(file: string, defaults: S) {
    this.#file = file
    this.#defaults = defaults
  }

  async load(): Promise<S> {
    this.#loadPromise ??= readJsonFile(this.#file).then((stored) => {
      const source = stored !== null && typeof stored === 'object' ? (stored as Partial<S>) : {}
      this.#state = { ...structuredClone(this.#defaults), ...source }
      return this.#state
    })
    return this.#loadPromise
  }

  get state(): S {
    if (this.#state === undefined) throw new Error('JsonStateStore.load() must be awaited first')
    return this.#state
  }

  /**
   * Apply one mutation and persist the result. Mutations run in call order.
   * @param mutate the change to apply to the loaded state
   */
  update(mutate: (state: S) => unknown): Promise<S> {
    const next = this.#queue.then(async () => {
      await this.load()
      mutate(this.state)
      await writeJsonFile(this.#file, this.state)
      return this.state
    })
    this.#queue = next
    return next
  }
}
