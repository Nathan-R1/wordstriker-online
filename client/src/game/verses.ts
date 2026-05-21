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

let cachedVerses: VerseEntry[] | null = null

export async function loadVerses(): Promise<VerseEntry[]> {
  if (cachedVerses) return cachedVerses
  const res = await fetch('/verses.json')
  cachedVerses = (await res.json()) as VerseEntry[]
  return cachedVerses
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

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findVerse(input: string, verses: VerseEntry[]): VerseEntry | null {
  const normalized = normalizeForCompare(input)
  if (normalized.length === 0) return null
  for (const v of verses) {
    if (normalizeForCompare(v.t).startsWith(normalized)) {
      return v
    }
  }
  return null
}
