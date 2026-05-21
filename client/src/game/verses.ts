export const BOOK_NAMES: string[] = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
  '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
]

const BOOK_NAMES_SORTED = [...BOOK_NAMES].sort((a, b) => b.length - a.length)

export interface VerseEntry {
  b: string
  c: number
  v: number
  t: string
}

interface IndexedVerse extends VerseEntry {
  normalized: string
}

let verseIndex: IndexedVerse[] | null = null

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[[\]'"]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function loadVerses(): Promise<void> {
  if (verseIndex) return
  const res = await fetch(`${import.meta.env.BASE_URL}verses.json`)
  const raw: VerseEntry[] = await res.json()
  verseIndex = raw.map(v => ({
    ...v,
    normalized: normalizeForMatch(v.t),
  }))
}

export function getBookName(input: string): string | null {
  const lower = input.toLowerCase().trim()
  for (const book of BOOK_NAMES_SORTED) {
    if (lower.startsWith(book.toLowerCase())) return book
  }
  return null
}

export function isBookName(input: string): boolean {
  return getBookName(input) !== null
}

export type BookInput = {
  book: string
  chapter?: number
  verse?: number
}

export function parseBookInput(input: string): BookInput | null {
  const book = getBookName(input)
  if (!book) return null
  const rest = input.slice(book.length)
  const chVer = rest.match(/^\s*(\d+):(\d+)/)
  if (chVer) return { book, chapter: Number(chVer[1]), verse: Number(chVer[2]) }
  const ch = rest.match(/^\s*(\d+)/)
  if (ch) return { book, chapter: Number(ch[1]) }
  return { book }
}

export function verseTimeLimit(wordCount: number): number {
  return Math.max(10, 60 - (wordCount - 3) * 5)
}

export function findVerse(input: string): VerseEntry | null {
  if (!verseIndex) return null
  const needle = normalizeForMatch(input)
  if (needle.length === 0) return null
  for (const v of verseIndex) {
    if (v.normalized.includes(needle)) return v
  }
  return null
}
