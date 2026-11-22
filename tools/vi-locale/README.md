# Vietnamese language pack tooling

Generates and validates [`plugin/src/client/vi-dictionaries.ts`](../../plugin/src/client/vi-dictionaries.ts),
the translated UI dictionaries of the Vietnamese language pack.

The language pack itself lives in
[`plugin/src/client/vi-language-pack.ts`](../../plugin/src/client/vi-language-pack.ts):
it calls `ctx.locale.addLanguage({ id: 'vi', … })` and registers one Vietnamese
dictionary per Harness locale namespace. Strings it does not translate fall back
to English.

## Where the strings come from

Every Harness client package ships its UI copy as minified JavaScript
dictionaries inside `lib/client.js` and registers them through
`ctx.locale.register(namespace, { en, zh, ja, … })`. `extract-dicts.mjs` reads
the installed `app.asar`, finds those registration calls, resolves the English
dictionary literal (including spreads and variables), and writes one JSON
snapshot of every namespace.

The snapshot for the Harness version this pack was built against covers **76
namespaces and 4,253 strings**.

## Refresh after a Harness upgrade

New Harness versions add keys; the pack keeps working because missing keys fall
back to English, but the new copy stays English until translated again.

```powershell
# 1. Snapshot the new installation's English dictionaries.
node tools/vi-locale/extract-dicts.mjs `
  "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\app.asar" `
  .tmp-verify/en-dicts.json

# 2. See which namespaces gained keys: compare with the JSON in
#    plugin/src/client/vi-dictionaries.ts, or re-run the review script.

# 3. Split the source into translation chunks (optional; existing chunk files in
#    translations/ can also be edited in place).
node tools/vi-locale/make-chunks.mjs .tmp-verify/en-dicts.json .tmp-verify/vi-in 320

# 4. Translate the new/changed strings into the matching files under
#    translations/ (shape: { namespaces: { ns: { vi: { key: value } } } }).

# 5. Validate + assemble. Placeholders, unknown keys, empty values, and
#    zero-width characters are rejected; missing keys are reported and fall
#    back to English.
node tools/vi-locale/assemble.mjs `
  .tmp-verify/en-dicts.json tools/vi-locale/translations `
  plugin/src/client/vi-dictionaries.ts
```

Then rebuild the bundle (`cd plugin && npm run build`) and reinstall it.

## Rules the assembler enforces

| Rule | Why |
|---|---|
| Key sets must be known to the English snapshot | a stale key would never render |
| `{placeholder}` sets must match the English string exactly | a dropped `{count}` breaks interpolation |
| Values must be non-empty | except separator-only strings, copied from English |
| No U+200B / U+FEFF | zero-width characters break search and copy |

## Files

| File | Role |
|---|---|
| `extract-dicts.mjs` | reads `app.asar`, writes the English namespace snapshot |
| `make-chunks.mjs` | splits the snapshot into translation-sized chunks |
| `assemble.mjs` | validates translations and writes `vi-dictionaries.ts` |
| `translations/chunk-NN.json` | the Vietnamese strings, one file per chunk |
