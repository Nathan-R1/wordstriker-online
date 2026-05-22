export const BOOK_NAMES: string[] = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalm', 'Proverbs',
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

export const BOOK_ABBREVIATIONS: Record<string, string> = {
  gen: 'Genesis', ex: 'Exodus', exo: 'Exodus', lev: 'Leviticus',
  num: 'Numbers', nu: 'Numbers', deut: 'Deuteronomy', dt: 'Deuteronomy',
  josh: 'Joshua', judg: 'Judges', jdg: 'Judges', ruth: 'Ruth',
  '1sa': '1 Samuel', '1sam': '1 Samuel',
  '2sa': '2 Samuel', '2sam': '2 Samuel',
  '1ki': '1 Kings', '1kgs': '1 Kings',
  '2ki': '2 Kings', '2kgs': '2 Kings',
  '1ch': '1 Chronicles', '1chr': '1 Chronicles', '1chron': '1 Chronicles',
  '2ch': '2 Chronicles', '2chr': '2 Chronicles', '2chron': '2 Chronicles',
  ezra: 'Ezra', neh: 'Nehemiah', est: 'Esther', esth: 'Esther',
  job: 'Job', ps: 'Psalm', psa: 'Psalm', psalm: 'Psalm', psalms: 'Psalm',
  prov: 'Proverbs', prv: 'Proverbs', ecc: 'Ecclesiastes', eccl: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon',
  isa: 'Isaiah', jer: 'Jeremiah', lam: 'Lamentations',
  ezek: 'Ezekiel', ez: 'Ezekiel', dan: 'Daniel',
  hos: 'Hosea', joel: 'Joel', amos: 'Amos',
  obad: 'Obadiah', ob: 'Obadiah', jonah: 'Jonah', mic: 'Micah',
  nah: 'Nahum', hab: 'Habakkuk', zeph: 'Zephaniah',
  hag: 'Haggai', zech: 'Zechariah', mal: 'Malachi',
  matt: 'Matthew', mt: 'Matthew', mark: 'Mark', mk: 'Mark',
  luke: 'Luke', lk: 'Luke', john: 'John', jn: 'John', jhn: 'John',
  acts: 'Acts', rom: 'Romans',
  '1cor': '1 Corinthians', '1corinthians': '1 Corinthians',
  '2cor': '2 Corinthians', '2corinthians': '2 Corinthians',
  gal: 'Galatians', eph: 'Ephesians',
  phil: 'Philippians', php: 'Philippians', col: 'Colossians',
  '1thess': '1 Thessalonians', '1thessalonians': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2thessalonians': '2 Thessalonians',
  '1tim': '1 Timothy', '2tim': '2 Timothy',
  titus: 'Titus', philem: 'Philemon', phm: 'Philemon',
  heb: 'Hebrews', james: 'James', jas: 'James',
  '1pet': '1 Peter', '2pet': '2 Peter',
  '1jn': '1 John', '2jn': '2 John', '3jn': '3 John',
  jude: 'Jude', rev: 'Revelation',
}

export const BOOK_CATEGORY: Record<string, string> = {
  'Genesis': 'Law', 'Exodus': 'Law', 'Leviticus': 'Law', 'Numbers': 'Law', 'Deuteronomy': 'Law',
  'Joshua': 'History', 'Judges': 'History', 'Ruth': 'History',
  '1 Samuel': 'History', '2 Samuel': 'History', '1 Kings': 'History', '2 Kings': 'History',
  '1 Chronicles': 'History', '2 Chronicles': 'History', 'Ezra': 'History', 'Nehemiah': 'History', 'Esther': 'History',
  'Job': 'Wisdom', 'Psalm': 'Wisdom', 'Proverbs': 'Wisdom', 'Ecclesiastes': 'Wisdom', 'Song of Solomon': 'Wisdom',
  'Isaiah': 'Prophets', 'Jeremiah': 'Prophets', 'Lamentations': 'Prophets', 'Ezekiel': 'Prophets', 'Daniel': 'Prophets',
  'Hosea': 'Prophets', 'Joel': 'Prophets', 'Amos': 'Prophets', 'Obadiah': 'Prophets', 'Jonah': 'Prophets',
  'Micah': 'Prophets', 'Nahum': 'Prophets', 'Habakkuk': 'Prophets', 'Zephaniah': 'Prophets',
  'Haggai': 'Prophets', 'Zechariah': 'Prophets', 'Malachi': 'Prophets',
  'Matthew': 'Gospels', 'Mark': 'Gospels', 'Luke': 'Gospels', 'John': 'Gospels', 'Acts': 'Gospels',
  'Romans': "Paul's Epistles", '1 Corinthians': "Paul's Epistles", '2 Corinthians': "Paul's Epistles",
  'Galatians': "Paul's Epistles", 'Ephesians': "Paul's Epistles", 'Philippians': "Paul's Epistles", 'Colossians': "Paul's Epistles",
  '1 Thessalonians': "Paul's Epistles", '2 Thessalonians': "Paul's Epistles", '1 Timothy': "Paul's Epistles", '2 Timothy': "Paul's Epistles",
  'Titus': "Paul's Epistles", 'Philemon': "Paul's Epistles",
  'Hebrews': 'Other Epistles', 'James': 'Other Epistles',
  '1 Peter': 'Other Epistles', '2 Peter': 'Other Epistles', '1 John': 'Other Epistles', '2 John': 'Other Epistles', '3 John': 'Other Epistles',
  'Jude': 'Other Epistles', 'Revelation': 'Other Epistles',
}

export const BOOK_TESTAMENT: Record<string, 'ot' | 'nt'> = {
  'Genesis': 'ot', 'Exodus': 'ot', 'Leviticus': 'ot', 'Numbers': 'ot', 'Deuteronomy': 'ot',
  'Joshua': 'ot', 'Judges': 'ot', 'Ruth': 'ot', '1 Samuel': 'ot', '2 Samuel': 'ot',
  '1 Kings': 'ot', '2 Kings': 'ot', '1 Chronicles': 'ot', '2 Chronicles': 'ot',
  'Ezra': 'ot', 'Nehemiah': 'ot', 'Esther': 'ot', 'Job': 'ot', 'Psalm': 'ot', 'Proverbs': 'ot',
  'Ecclesiastes': 'ot', 'Song of Solomon': 'ot',
  'Isaiah': 'ot', 'Jeremiah': 'ot', 'Lamentations': 'ot', 'Ezekiel': 'ot', 'Daniel': 'ot',
  'Hosea': 'ot', 'Joel': 'ot', 'Amos': 'ot', 'Obadiah': 'ot', 'Jonah': 'ot', 'Micah': 'ot',
  'Nahum': 'ot', 'Habakkuk': 'ot', 'Zephaniah': 'ot', 'Haggai': 'ot', 'Zechariah': 'ot', 'Malachi': 'ot',
  'Matthew': 'nt', 'Mark': 'nt', 'Luke': 'nt', 'John': 'nt', 'Acts': 'nt',
  'Romans': 'nt', '1 Corinthians': 'nt', '2 Corinthians': 'nt', 'Galatians': 'nt', 'Ephesians': 'nt',
  'Philippians': 'nt', 'Colossians': 'nt', '1 Thessalonians': 'nt', '2 Thessalonians': 'nt',
  '1 Timothy': 'nt', '2 Timothy': 'nt', 'Titus': 'nt', 'Philemon': 'nt', 'Hebrews': 'nt', 'James': 'nt',
  '1 Peter': 'nt', '2 Peter': 'nt', '1 John': 'nt', '2 John': 'nt', '3 John': 'nt', 'Jude': 'nt',
  'Revelation': 'nt',
}

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

const textMap = new Map<string, string>()
const chapterMap = new Map<string, Map<number, number>>()

function refKey(book: string, chapter: number, verse: number): string {
  return `${book}|${chapter}|${verse}`
}

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
  for (const v of raw) {
    textMap.set(refKey(v.b, v.c, v.v), v.t)
    if (!chapterMap.has(v.b)) chapterMap.set(v.b, new Map())
    const cm = chapterMap.get(v.b)!
    if (!cm.has(v.c) || cm.get(v.c)! < v.v) {
      cm.set(v.c, v.v)
    }
  }
}

export function getRandomVerse(): { book: string; chapter: number; verse: number; text: string } | null {
  if (!verseIndex || verseIndex.length === 0) return null
  const entry = verseIndex[Math.floor(Math.random() * verseIndex.length)]
  return { book: entry.b, chapter: entry.c, verse: entry.v, text: entry.t }
}

export function getVerseText(book: string, chapter: number, verse: number): string | undefined {
  return textMap.get(refKey(book, chapter, verse))
}

export function isValidRef(book: string, chapter: number, verse: number): boolean {
  return textMap.has(refKey(book, chapter, verse))
}

export function getChapterCount(book: string): number {
  const cm = chapterMap.get(book)
  return cm ? Math.max(...cm.keys()) : 0
}

export function getVerseCount(book: string, chapter: number): number {
  const cm = chapterMap.get(book)
  return cm?.get(chapter) ?? 0
}

export function searchBooks(query: string): string[] {
  const q = query.toLowerCase().trim()
  if (!q) return BOOK_NAMES
  const exact = BOOK_NAMES.filter(n => n.toLowerCase().includes(q))
  if (exact.length > 0) return exact
  const abbrev = BOOK_ABBREVIATIONS[q]
  if (abbrev) return [abbrev]
  return BOOK_NAMES.filter(n => n.toLowerCase().startsWith(q[0]))
}

export function parseRef(input: string): { book: string; chapter: number; verse: number } | null {
  const q = input.toLowerCase().trim()
  const parts = q.split(/[\s:]+/).filter(Boolean)
  if (parts.length < 1) return null

  const book = resolveBook(q)
  if (!book) return null

  const rest = q.slice(q.indexOf(parts[parts.length - (parts.length > 1 ? 2 : 1)]))
  const match = rest.match(/(\d+):(\d+)$/)
  if (match && parts.length >= 3) {
    return { book, chapter: Number(match[1]), verse: Number(match[2]) }
  }

  return null
}

export function resolveBook(input: string): string | null {
  const lower = input.toLowerCase().trim()
  for (const name of BOOK_NAMES_SORTED) {
    if (lower.startsWith(name.toLowerCase())) return name
  }
  const abbrev = BOOK_ABBREVIATIONS[lower]
  if (abbrev) return abbrev
  const words = lower.split(/\s+/)
  for (let i = words.length; i >= 1; i--) {
    const partial = words.slice(0, i).join(' ')
    const a = BOOK_ABBREVIATIONS[partial]
    if (a) return a
  }
  return null
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

export function verseTimeLimit(_wordCount: number): number {
  return 30
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
