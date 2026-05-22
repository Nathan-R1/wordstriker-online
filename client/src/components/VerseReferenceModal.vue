<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  BOOK_NAMES,
  BOOK_CATEGORY,
  BOOK_TESTAMENT,
  searchBooks,
  getChapterCount,
  getVerseCount,
  getVerseText,
  resolveBook,
} from '../game/verses'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  confirm: [ref: { book: string; chapter: number; verse: number }]
  cancel: []
}>()

const step = ref<'book' | 'chapter' | 'verse'>('book')
const selectedBook = ref<string | null>(null)
const selectedChapter = ref<number | null>(null)
const selectedVerse = ref<number | null>(null)
const searchQuery = ref('')
const searchFocused = ref(false)

const filteredBooks = computed(() => {
  const all = searchBooks(searchQuery.value)
  return all.sort((a, b) => BOOK_NAMES.indexOf(a) - BOOK_NAMES.indexOf(b))
})

const chapterCount = computed(() =>
  selectedBook.value ? getChapterCount(selectedBook.value) : 0
)

const chapters = computed(() => {
  const n = chapterCount.value
  return Array.from({ length: n }, (_, i) => i + 1)
})

const verseCount = computed(() =>
  selectedBook.value && selectedChapter.value
    ? getVerseCount(selectedBook.value, selectedChapter.value)
    : 0
)

const verses = computed(() => {
  const n = verseCount.value
  return Array.from({ length: n }, (_, i) => i + 1)
})

const preview = computed(() => {
  if (!selectedBook.value) return ''
  let s = selectedBook.value
  if (selectedChapter.value) s += ` ${selectedChapter.value}`
  if (selectedVerse.value) s += `:${selectedVerse.value}`
  return s
})

const canConfirm = computed(() =>
  selectedBook.value !== null && selectedChapter.value !== null && selectedVerse.value !== null
)

const verseText = computed(() => {
  if (!selectedBook.value || !selectedChapter.value || !selectedVerse.value) return ''
  return getVerseText(selectedBook.value, selectedChapter.value, selectedVerse.value) ?? ''
})

const otBooks = computed(() =>
  filteredBooks.value.filter(b => BOOK_TESTAMENT[b] === 'ot')
)
const ntBooks = computed(() =>
  filteredBooks.value.filter(b => BOOK_TESTAMENT[b] === 'nt')
)

const categories = ['Law', 'History', 'Wisdom', 'Prophets'] as const
const ntCategories = ['Gospels', "Paul's Epistles", 'Other Epistles'] as const

function groupedBooks(books: string[], cats: readonly string[]) {
  const groups: { category: string; books: string[] }[] = []
  for (const cat of cats) {
    const bs = books.filter(b => BOOK_CATEGORY[b] === cat)
    if (bs.length > 0) groups.push({ category: cat, books: bs })
  }
  return groups
}

const otGrouped = computed(() => groupedBooks(otBooks.value, categories))
const ntGrouped = computed(() => groupedBooks(ntBooks.value, ntCategories))

function selectBook(name: string) {
  selectedBook.value = name
  selectedChapter.value = null
  selectedVerse.value = null
  step.value = 'chapter'
}

function selectChapter(n: number) {
  selectedChapter.value = n
  selectedVerse.value = null
  step.value = 'verse'
}

function selectVerse(n: number) {
  selectedVerse.value = n
}

function goBack() {
  if (step.value === 'chapter') {
    step.value = 'book'
    selectedBook.value = null
  } else if (step.value === 'verse') {
    step.value = 'chapter'
    selectedVerse.value = null
  }
}

function handleConfirm() {
  if (!canConfirm.value) return
  emit('confirm', {
    book: selectedBook.value!,
    chapter: selectedChapter.value!,
    verse: selectedVerse.value!,
  })
}

function reset() {
  step.value = 'book'
  selectedBook.value = null
  selectedChapter.value = null
  selectedVerse.value = null
  searchQuery.value = ''
}

function handleSearchInput() {
  const q = searchQuery.value.trim()
  if (!q) return

  const refMatch = q.match(/^(.+)\s+(\d+):(\d+)$/)
  if (refMatch) {
    const book = resolveBook(refMatch[1])
    if (book) {
      const ch = Number(refMatch[2])
      const vs = Number(refMatch[3])
      if (getChapterCount(book) >= ch && getVerseCount(book, ch) >= vs) {
        selectedBook.value = book
        selectedChapter.value = ch
        selectedVerse.value = vs
        step.value = 'verse'
        return
      }
    }
  }

  const chMatch = q.match(/^(.+)\s+(\d+)$/)
  if (chMatch) {
    const book = resolveBook(chMatch[1])
    if (book) {
      const ch = Number(chMatch[2])
      if (getChapterCount(book) >= ch) {
        selectedBook.value = book
        selectedChapter.value = ch
        step.value = 'chapter'
        return
      }
    }
  }

  const book = resolveBook(q)
  if (book && step.value === 'book') {
    selectedBook.value = book
    step.value = 'chapter'
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (step.value !== 'book') {
      goBack()
    } else {
      emit('cancel')
    }
  }
  if (e.key === 'Enter' && canConfirm.value) {
    handleConfirm()
  }
}

watch(() => props.show, (val) => {
  if (val) reset()
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-backdrop" @click.self="$emit('cancel')">
      <div class="modal-panel" @click.stop>
        <div class="parchment-bg" />

        <div class="search-area">
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search book or reference…"
            @input="handleSearchInput"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            autofocus
          />
        </div>

        <div class="content-area">
          <!-- Book grid -->
          <div v-if="step === 'book'" class="step-panel books-step">
            <div v-if="searchQuery && filteredBooks.length === 0" class="empty-search">
              No books found
            </div>

            <div v-for="group in otGrouped" :key="'ot-' + group.category" class="book-group">
              <div class="group-label">
                <span class="testament-badge ot">OT</span>
                {{ group.category }}
              </div>
              <div class="book-grid">
                <button
                  v-for="book in group.books"
                  :key="book"
                  class="book-chip"
                  :class="{ selected: selectedBook === book }"
                  @click="selectBook(book)"
                >
                  {{ book }}
                </button>
              </div>
            </div>

            <div class="testament-divider">New Testament</div>

            <div v-for="group in ntGrouped" :key="'nt-' + group.category" class="book-group">
              <div class="group-label">
                <span class="testament-badge nt">NT</span>
                {{ group.category }}
              </div>
              <div class="book-grid">
                <button
                  v-for="book in group.books"
                  :key="book"
                  class="book-chip"
                  :class="{ selected: selectedBook === book }"
                  @click="selectBook(book)"
                >
                  {{ book }}
                </button>
              </div>
            </div>
          </div>

          <!-- Chapter grid -->
          <div v-if="step === 'chapter'" class="step-panel chapter-step">
            <div class="step-header">
              <button class="back-btn" @click="goBack">← Back</button>
              <span class="step-title">{{ selectedBook }}</span>
            </div>
            <div class="number-grid">
              <button
                v-for="ch in chapters"
                :key="ch"
                class="num-btn"
                :class="{ selected: selectedChapter === ch }"
                @click="selectChapter(ch)"
              >
                {{ ch }}
              </button>
            </div>
          </div>

          <!-- Verse grid -->
          <div v-if="step === 'verse'" class="step-panel verse-step">
            <div class="step-header">
              <button class="back-btn" @click="goBack">← Back</button>
              <span class="step-title">{{ selectedBook }} {{ selectedChapter }}</span>
            </div>
            <div class="number-grid">
              <button
                v-for="v in verses"
                :key="v"
                class="num-btn"
                :class="{ selected: selectedVerse === v }"
                @click="selectVerse(v)"
              >
                {{ v }}
              </button>
            </div>
            <div v-if="verseText" class="verse-preview">
              <div class="verse-preview-ref">{{ preview }}</div>
              <div class="verse-preview-text">{{ verseText }}</div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="preview">{{ preview }}</div>
          <div class="footer-actions">
            <button class="btn btn-cancel" @click="$emit('cancel')">Cancel</button>
            <button
              class="btn btn-confirm"
              :disabled="!canConfirm"
              @click="handleConfirm"
            >
              {{ canConfirm ? 'Confirm' : 'Select a verse' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal-panel {
  position: relative;
  width: min(520px, 94vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: #1a1a2e;
  border: 1px solid rgba(201, 168, 76, 0.25);
  border-radius: 16px;
  box-shadow:
    0 0 40px rgba(0, 0, 0, 0.5),
    0 0 80px rgba(201, 168, 76, 0.08);
  overflow: hidden;
}

.parchment-bg {
  position: absolute;
  inset: 0;
  opacity: 0.04;
  background-image: url('https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimg.freepik.com%2Fpremium-photo%2Frustic-parchment-texture-background-digital-art-design_687514-794.jpg&f=1&nofb=1&ipt=beec66f71f827508b8d1b7908820210e5127aaa0add50052a9ec0ae68fee6a72');
  background-size: cover;
  pointer-events: none;
}

.search-area {
  position: relative;
  z-index: 1;
  padding: 1rem 1rem 0.5rem;
  flex-shrink: 0;
}

.search-input {
  width: 100%;
  padding: 0.7rem 1rem;
  border: 1px solid rgba(201, 168, 76, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  color: #e8e0d0;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.search-input::placeholder {
  color: rgba(232, 224, 208, 0.4);
}

.search-input:focus {
  border-color: #c9a84c;
  box-shadow: 0 0 12px rgba(201, 168, 76, 0.15);
}

.content-area {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem 0.5rem;
}

.step-panel {
  animation: fade-slide-in 0.2s ease-out;
}

.empty-search {
  text-align: center;
  padding: 2rem;
  color: rgba(232, 224, 208, 0.5);
  font-style: italic;
}

.book-group {
  margin-bottom: 0.75rem;
}

.group-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(232, 224, 208, 0.5);
  margin-bottom: 0.4rem;
}

.testament-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-weight: 700;
}

.testament-badge.ot {
  background: rgba(201, 168, 76, 0.2);
  color: #c9a84c;
}

.testament-badge.nt {
  background: rgba(100, 180, 255, 0.15);
  color: #64b4ff;
}

.testament-divider {
  text-align: center;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(232, 224, 208, 0.3);
  padding: 0.5rem 0;
  margin: 0.25rem 0;
  border-top: 1px solid rgba(201, 168, 76, 0.12);
  border-bottom: 1px solid rgba(201, 168, 76, 0.12);
}

.book-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.book-chip {
  padding: 0.35rem 0.7rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #e8e0d0;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.book-chip:hover {
  background: rgba(201, 168, 76, 0.15);
  border-color: rgba(201, 168, 76, 0.4);
  box-shadow: 0 0 8px rgba(201, 168, 76, 0.1);
}

.book-chip.selected {
  background: rgba(201, 168, 76, 0.25);
  border-color: #c9a84c;
  box-shadow: 0 0 12px rgba(201, 168, 76, 0.2);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-top: 0.25rem;
}

.back-btn {
  padding: 0.3rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(232, 224, 208, 0.7);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #e8e0d0;
}

.step-title {
  font-size: 1rem;
  font-weight: 600;
  color: #e8e0d0;
}

.number-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.15rem 0;
}

.num-btn {
  width: 2.6rem;
  height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(232, 224, 208, 0.8);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.12s;
  font-family: inherit;
}

.num-btn:hover {
  background: rgba(201, 168, 76, 0.15);
  border-color: rgba(201, 168, 76, 0.35);
}

.num-btn.selected {
  background: rgba(201, 168, 76, 0.25);
  border-color: #c9a84c;
  color: #e8e0d0;
  font-weight: 600;
  box-shadow: 0 0 8px rgba(201, 168, 76, 0.15);
}

.footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(201, 168, 76, 0.15);
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.2);
}

.preview {
  font-size: 0.9rem;
  font-weight: 600;
  color: #c9a84c;
  min-width: 8rem;
}

.footer-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-cancel {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(232, 224, 208, 0.7);
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e8e0d0;
}

.btn-confirm {
  border: none;
  background: #c9a84c;
  color: #1a1a2e;
}

.btn-confirm:hover:not(:disabled) {
  background: #dbb95c;
  box-shadow: 0 0 16px rgba(201, 168, 76, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.verse-preview {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(201, 168, 76, 0.2);
  border-radius: 10px;
  background: rgba(201, 168, 76, 0.06);
  animation: fade-slide-in 0.25s ease-out;
}

.verse-preview-ref {
  font-size: 0.75rem;
  font-weight: 600;
  color: #c9a84c;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.35rem;
}

.verse-preview-text {
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(232, 224, 208, 0.85);
  font-style: italic;
}

@keyframes fade-slide-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
