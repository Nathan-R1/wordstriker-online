import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const kjvPath = resolve(__dirname, '..', 'kjv.txt')
const outPath = resolve(__dirname, '..', 'client', 'public', 'verses.json')

const raw = readFileSync(kjvPath, 'utf-8')
const lines = raw.replace(/\r/g, '').split('\n')

const verses = []
const refPattern = /^(.+) (\d+):(\d+)\t(.+)$/

for (const line of lines) {
  const m = line.match(refPattern)
  if (m) {
    verses.push({
      b: m[1].trim(),   // book
      c: Number(m[2]),  // chapter
      v: Number(m[3]),  // verse
      t: m[4].trim(),   // text
    })
  }
}

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(verses))

console.log(`Wrote ${verses.length} verses to ${outPath}`)
