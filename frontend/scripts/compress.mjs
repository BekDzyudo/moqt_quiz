// Build'dan keyin: dist ichidagi matnli fayllarning .gz nusxasi (eng yuqori daraja).
// nginx `gzip_static on` bilan ularni tayyor holda beradi — har so'rovda CPU sarflanmaydi.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync, constants } from 'node:zlib'

const DIST = new URL('../dist/', import.meta.url).pathname
const EXT = /\.(js|css|html|svg|json|txt|mjs)$/

async function* walk(dir) {
  for (const name of await readdir(dir)) {
    const path = join(dir, name)
    if ((await stat(path)).isDirectory()) yield* walk(path)
    else yield path
  }
}

let before = 0
let after = 0
for await (const path of walk(DIST)) {
  if (!EXT.test(path)) continue
  const data = await readFile(path)
  if (data.length < 1024) continue
  const gz = gzipSync(data, { level: constants.Z_BEST_COMPRESSION })
  await writeFile(`${path}.gz`, gz)
  before += data.length
  after += gz.length
}
console.log(`gzip: ${(before / 1024).toFixed(0)} KB -> ${(after / 1024).toFixed(0)} KB`)
