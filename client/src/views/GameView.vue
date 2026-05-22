<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInAnon } from '../composables/useSupabase'
import { joinGameRoom, type GamePeer } from '../composables/useGame'
import { loadVerses, getVerseText, isValidRef, verseTimeLimit } from '../game/verses'
import IncomingVerseCard from '../components/IncomingVerseCard.vue'
import VerseReferenceModal from '../components/VerseReferenceModal.vue'

export interface IncomingVerse {
  verseId: string
  book: string
  chapter: number
  verse: number
  text: string
  timeLeft: number
  senderId: string
  progress: number
}

interface FeedEntry {
  verseId: string
  playerId: string
  book: string
  chapter: number
  verse: number
  progress: number
  timeLeft: number
}

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string

const ownUserId = ref('')
const ownName = ref('')
const peers = ref<GamePeer[]>([])
const incomingVerses = ref<IncomingVerse[]>([])
const scores = ref<Record<string, number>>({})
const versesLoaded = ref(false)
const error = ref('')
const feed = ref<FeedEntry[]>([])
const expandedVerseId = ref<string | null>(null)
const showPopup = ref(false)
const popupMode = ref<'send' | 'attempt'>('send')
const showFeed = ref(false)
const attemptError = ref('')
const sentToast = ref('')

let room: ReturnType<typeof joinGameRoom> | null = null
let timerInterval: number | undefined

const opponent = computed(() =>
  peers.value.find(p => p.userId !== ownUserId.value) ?? null
)

const opponentName = computed(() => opponent.value?.name ?? 'Empty Lobby')

const myScore = computed(() => scores.value[ownUserId.value] ?? 0)
const oppScore = computed(() => (opponent.value ? scores.value[opponent.value.userId] ?? 0 : 0))

const isReady = computed(() => peers.value.length >= 2)
const expandedVerse = computed(() =>
  incomingVerses.value.find(v => v.verseId === expandedVerseId.value) ?? null
)

function feedIcon(progress: number): string {
  if (progress === 0) return '⏳'
  if (progress === 1) return '❌'
  if (progress === 2) return '⭐'
  if (progress === 3) return '⭐⭐'
  return '✅'
}

function refDisplay(entry: FeedEntry): string {
  const full = `${entry.book} ${entry.chapter}:${entry.verse}`
  if (entry.playerId !== ownUserId.value) return full
  if (entry.timeLeft <= 0) return full
  if (entry.progress >= 4) return full
  if (entry.progress === 3) return `${entry.book} ${entry.chapter}:?`
  if (entry.progress === 2) return `${entry.book} ?:?`
  return '? ?:?'
}

function updateFeedEntry(verseId: string, book: string, chapter: number, verse: number, progress: number, playerId: string, timeLeft: number = 0) {
  const existing = feed.value.find(f => f.verseId === verseId)
  if (existing) {
    existing.progress = progress
    if (progress >= 4) existing.timeLeft = 0
    else if (timeLeft > 0) existing.timeLeft = timeLeft
  } else {
    const tl = progress >= 4 ? 0 : timeLeft
    feed.value.push({ verseId, playerId, book, chapter, verse, progress, timeLeft: tl })
  }
}

function handleSendRef(ref: { book: string; chapter: number; verse: number }) {
  if (!room || !versesLoaded.value) return
  const text = getVerseText(ref.book, ref.chapter, ref.verse)
  if (!text) return
  const verseId = crypto.randomUUID()
  const wordCount = text.split(/\s+/).length
  room.sendMessage({
    type: 'verse_incoming',
    verseId,
    book: ref.book,
    chapter: ref.chapter,
    verse: ref.verse,
    timeLeft: verseTimeLimit(wordCount),
  })
  showPopup.value = false
  sentToast.value = `Sent verse ${ref.book} ${ref.chapter}:${ref.verse}`
  setTimeout(() => { sentToast.value = '' }, 2500)

  updateFeedEntry(verseId, ref.book, ref.chapter, ref.verse, 0, opponent.value?.userId ?? '', verseTimeLimit(wordCount))
}

function handleAttemptRef(ref: { book: string; chapter: number; verse: number }) {
  attemptError.value = ''
  if (!expandedVerse.value) {
    showPopup.value = false
    return
  }
  const ev = expandedVerse.value

  if (
    ref.book.toLowerCase() === ev.book.toLowerCase() &&
    ref.chapter === ev.chapter &&
    ref.verse === ev.verse
  ) {
    incomingVerses.value = incomingVerses.value.filter(v => v.verseId !== ev.verseId)
    const newScore = (scores.value[ownUserId.value] ?? 0) + 5
    scores.value = { ...scores.value, [ownUserId.value]: newScore }
    updateFeedEntry(ev.verseId, ev.book, ev.chapter, ev.verse, 4, ownUserId.value)
    room?.sendMessage({
      type: 'game_update',
      playerId: ownUserId.value,
      playerScore: newScore,
      clears: [{ verseId: ev.verseId, book: ev.book, chapter: ev.chapter, verse: ev.verse, progress: 4 }],
    })
    expandedVerseId.value = null
    showPopup.value = false
  } else {
    let newProgress = 1
    let msg = ''
    if (ref.book.toLowerCase() === ev.book.toLowerCase()) {
      newProgress = 2
      if (ref.chapter === ev.chapter) {
        newProgress = 3
        msg = 'Right chapter! 📖 (wrong verse)'
      } else {
        msg = 'Right book! 📓 (wrong chapter)'
      }
    } else {
      msg = 'Wrong book 🎁'
    }
    if (newProgress > (ev.progress || 0)) {
      const verse = incomingVerses.value.find(v => v.verseId === ev.verseId)
      if (verse) verse.progress = newProgress
      updateFeedEntry(ev.verseId, ev.book, ev.chapter, ev.verse, newProgress, ownUserId.value)
      room?.sendMessage({
        type: 'game_update',
        playerId: ownUserId.value,
        playerScore: scores.value[ownUserId.value] ?? 0,
        clears: [{ verseId: ev.verseId, book: ev.book, chapter: ev.chapter, verse: ev.verse, progress: newProgress }],
      })
    }
    showPopup.value = false
    attemptError.value = msg
    setTimeout(() => { attemptError.value = '' }, 3000)
  }
}

function sendVerse() {
  popupMode.value = 'send'
  showPopup.value = true
}

function attemptVerse() {
  if (!expandedVerse.value) return
  popupMode.value = 'attempt'
  showPopup.value = true
}

function toggleVerse(id: string) {
  expandedVerseId.value = expandedVerseId.value === id ? null : id
}

function leaveGame() {
  room?.leave()
  router.push('/')
}

onMounted(async () => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gameId)) {
    error.value = 'Invalid game ID'
    return
  }

  try {
    ownUserId.value = await signInAnon()
  } catch {
    error.value = 'Failed to sign in'
    return
  }
  ownName.value = `Player_${ownUserId.value.replace(/\D/g, '').slice(0, 4)}`

  try {
    await loadVerses()
    versesLoaded.value = true
  } catch {
    error.value = 'Failed to load verses'
    return
  }

  room = joinGameRoom(ownUserId.value, ownName.value, gameId, {
    onPeerJoin: () => {},
    onPeerLeave: () => {},
    onMessage: (msg, senderId) => {
      if (senderId === ownUserId.value) return
      if (msg.type === 'verse_incoming') {
        if (!isValidRef(msg.book, msg.chapter, msg.verse)) return
        incomingVerses.value.push({
          ...msg,
          text: getVerseText(msg.book, msg.chapter, msg.verse) ?? '',
          senderId,
          progress: 0,
        })
        updateFeedEntry(msg.verseId, msg.book, msg.chapter, msg.verse, 0, ownUserId.value, msg.timeLeft)
      } else if (msg.type === 'game_update') {
        scores.value = { ...scores.value, [msg.playerId]: msg.playerScore }
        const valid = msg.clears.filter(c => isValidRef(c.book, c.chapter, c.verse))
        for (const c of valid) {
          updateFeedEntry(c.verseId, c.book, c.chapter, c.verse, c.progress ?? 4, msg.playerId)
        }
      }
    },
    onPeersUpdate: (p) => {
      const me = p.find(peer => peer.userId === ownUserId.value)
      const firstOther = p.find(peer => peer.userId !== ownUserId.value)
      peers.value = [me, firstOther].filter(Boolean) as GamePeer[]
    },
  })

  timerInterval = setInterval(() => {
    for (const v of incomingVerses.value) {
      v.timeLeft--
    }
    for (const f of feed.value) {
      if (f.timeLeft > 0) f.timeLeft--
    }
    const expired = incomingVerses.value.filter(v => v.timeLeft <= 0)
    for (const v of expired) {
      const p = v.progress ?? 0
      if (p === 0) {
        updateFeedEntry(v.verseId, v.book, v.chapter, v.verse, 1, ownUserId.value)
        room?.sendMessage({
          type: 'game_update',
          playerId: ownUserId.value,
          playerScore: scores.value[ownUserId.value] ?? 0,
          clears: [{ verseId: v.verseId, book: v.book, chapter: v.chapter, verse: v.verse, progress: 1 }],
        })
      } else if (p === 2) {
        const newScore = (scores.value[ownUserId.value] ?? 0) + 1
        scores.value = { ...scores.value, [ownUserId.value]: newScore }
        updateFeedEntry(v.verseId, v.book, v.chapter, v.verse, 2, ownUserId.value)
        room?.sendMessage({
          type: 'game_update',
          playerId: ownUserId.value,
          playerScore: newScore,
          clears: [{ verseId: v.verseId, book: v.book, chapter: v.chapter, verse: v.verse, progress: 2 }],
        })
      } else if (p === 3) {
        const newScore = (scores.value[ownUserId.value] ?? 0) + 2
        scores.value = { ...scores.value, [ownUserId.value]: newScore }
        updateFeedEntry(v.verseId, v.book, v.chapter, v.verse, 3, ownUserId.value)
        room?.sendMessage({
          type: 'game_update',
          playerId: ownUserId.value,
          playerScore: newScore,
          clears: [{ verseId: v.verseId, book: v.book, chapter: v.chapter, verse: v.verse, progress: 3 }],
        })
      }
    }
    incomingVerses.value = incomingVerses.value.filter(v => v.timeLeft > 0)
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timerInterval)
  room?.leave()
})
</script>

<template>
  <div v-if="error" class="error-state">{{ error }}</div>

  <div v-else class="game">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="leaveGame">← Lobby</button>
      <div class="scores">
        <span class="score you">{{ myScore }}</span>
        <span class="vs">vs</span>
        <span class="score opponent">{{ oppScore }}</span>
        <span class="opp-name">{{ opponentName }}</span>
      </div>
      <div class="header-right">
        <span v-if="!isReady" class="waiting">Waiting…</span>
        <button class="feed-toggle" @click="showFeed = !showFeed" title="Toggle feed">
          {{ showFeed ? '✕' : '📋' }}
        </button>
      </div>
    </div>

    <!-- Main area -->
    <div class="main">
      <div class="verses-area">
        <div v-if="!isReady" class="placeholder">
          Waiting for opponent to join…
        </div>
        <div v-else-if="incomingVerses.length === 0" class="placeholder">
          No incoming verses yet
        </div>
        <div v-else class="verses-list">
          <IncomingVerseCard
            v-for="v in incomingVerses"
            :key="v.verseId"
            :verse="v"
            :is-expanded="expandedVerseId === v.verseId"
            :on-toggle="() => toggleVerse(v.verseId)"
          />
        </div>
      </div>

      <!-- Feed panel (desktop sidebar / mobile overlay) -->
      <div class="feed-area" :class="{ 'feed-open': showFeed }">
        <div class="feed-header">
          <span class="feed-title">Feed</span>
          <button class="feed-close" @click="showFeed = false" title="Close feed">✕</button>
        </div>
        <div v-if="feed.length === 0" class="feed-empty">No events yet</div>
        <div v-for="entry in feed" :key="entry.verseId" class="feed-entry">
          <span class="who" :class="{ me: entry.playerId === ownUserId }">
            {{ entry.playerId === ownUserId ? 'You' : 'Them' }}
          </span>
          <span class="feed-icon">{{ feedIcon(entry.progress) }}</span>
          <span v-if="entry.timeLeft > 0" class="timer">({{ entry.timeLeft }}s)</span>
          <span class="ref">{{ refDisplay(entry) }}</span>
        </div>
      </div>
      <div v-if="showFeed" class="feed-overlay-bg" @click="showFeed = false" />
    </div>

    <!-- Bottom buttons -->
    <div class="buttons-div">
      <div v-if="attemptError" class="attempt-error">{{ attemptError }}</div>
      <Transition name="toast">
        <div v-if="sentToast" class="sent-toast">{{ sentToast }}</div>
      </Transition>
      <div class="buttons-row">
        <button
          class="btn btn-send"
          :disabled="!isReady"
          @click="sendVerse"
        >
          Send
        </button>
        <button
          v-if="expandedVerse"
          class="btn btn-attempt"
          @click="attemptVerse"
        >
          Attempt
        </button>
      </div>
    </div>

    <!-- Verse reference popup -->
    <VerseReferenceModal
      :show="showPopup"
      :mode="popupMode"
      @confirm="popupMode === 'send' ? handleSendRef($event) : handleAttemptRef($event)"
      @cancel="showPopup = false"
    />
  </div>
</template>

<style scoped>
.game {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background: #0f0f1a;
  color: #e8e0d0;
  font-family: var(--sans, system-ui, sans-serif);
}

/* --- Header --- */
.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid rgba(201, 168, 76, 0.15);
  flex-shrink: 0;
}

.back-btn {
  padding: 0.3rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(232, 224, 208, 0.7);
  font-size: 0.85rem;
  cursor: pointer;
  transition: 0.15s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e8e0d0;
}

.scores {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}

.score {
  font-family: var(--mono, monospace);
  font-size: 1.5rem;
  font-weight: 600;
}

.score.you { color: #c9a84c; }
.score.opponent { color: #e8e0d0; }

.vs {
  color: rgba(232, 224, 208, 0.35);
  font-size: 0.85rem;
}

.opp-name {
  color: rgba(232, 224, 208, 0.5);
  font-size: 0.8rem;
  margin-left: 0.15rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.waiting {
  font-size: 0.8rem;
  color: rgba(232, 224, 208, 0.5);
  font-style: italic;
}

.feed-toggle {
  padding: 0.3rem 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  display: none;
}

.status-text {
  flex: 1;
  text-align: center;
  font-size: 0.9rem;
  color: rgba(232, 224, 208, 0.6);
  font-style: italic;
}

/* --- Main area --- */
.main {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.verses-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem;
}

.placeholder {
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(232, 224, 208, 0.4);
  font-style: italic;
  font-size: 0.9rem;
}

.verses-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 600px;
  margin: 0 auto;
}

/* --- Feed --- */
.feed-area {
  width: 260px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 0.5rem;
  border-left: 1px solid rgba(201, 168, 76, 0.1);
  display: flex;
  flex-direction: column;
}

.feed-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
}

.feed-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(232, 224, 208, 0.5);
}

.feed-close {
  display: none;
  background: none;
  border: none;
  color: rgba(232, 224, 208, 0.5);
  font-size: 1rem;
  cursor: pointer;
}

.feed-empty {
  text-align: center;
  padding: 1rem 0.5rem;
  color: rgba(232, 224, 208, 0.3);
  font-style: italic;
  font-size: 0.8rem;
}

.feed-entry {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  animation: slide-in 0.2s ease-out;
}

.feed-entry .who {
  font-weight: 600;
  flex-shrink: 0;
}

.feed-entry .who.me { color: #c9a84c; }

.feed-entry .feed-icon {
  flex-shrink: 0;
  font-size: 0.8rem;
}

.feed-entry .ref {
  font-family: var(--mono, monospace);
  font-size: 0.75rem;
  color: rgba(232, 224, 208, 0.5);
}

.feed-overlay-bg {
  display: none;
}

/* --- Buttons bottom --- */
.buttons-div {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(201, 168, 76, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
}

.attempt-error {
  font-size: 0.8rem;
  color: #ef4444;
  text-align: center;
}

.sent-toast {
  font-size: 0.85rem;
  color: #fff;
  text-align: center;
  padding: 0.25rem 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}

.buttons-row {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn {
  padding: 0.6rem 2rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  border: none;
}

.btn-send {
  background: #c9a84c;
  color: #1a1a2e;
}

.btn-send:hover:not(:disabled) {
  background: #dbb95c;
  box-shadow: 0 0 20px rgba(201, 168, 76, 0.25);
}

.btn-send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn-attempt {
  border: 1px solid rgba(201, 168, 76, 0.4);
  background: rgba(201, 168, 76, 0.12);
  color: #c9a84c;
}

.btn-attempt:hover {
  background: rgba(201, 168, 76, 0.2);
  box-shadow: 0 0 16px rgba(201, 168, 76, 0.15);
}

.error-state {
  padding: 2rem;
  text-align: center;
  color: #ef4444;
}

/* --- Mobile --- */
@media (max-width: 768px) {
  .feed-toggle {
    display: inline-flex;
  }

  .feed-area {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 280px;
    z-index: 200;
    background: #0f0f1a;
    border-left: 1px solid rgba(201, 168, 76, 0.25);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.4);
    transform: translateX(100%);
    transition: transform 0.2s ease;
    display: flex;
  }

  .feed-area.feed-open {
    transform: translateX(0);
  }

  .feed-close {
    display: inline-flex;
  }

  .feed-overlay-bg {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 199;
    background: rgba(0, 0, 0, 0.5);
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
