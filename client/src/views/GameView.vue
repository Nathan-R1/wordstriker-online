<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInAnon } from '../composables/useSupabase'
import { joinGameRoom, type GamePeer } from '../composables/useGame'
import { loadVerses, findVerse, verseTimeLimit, parseBookInput } from '../game/verses'

interface IncomingVerse {
  verseId: string
  book: string
  chapter: number
  verse: number
  text: string
  timeLeft: number
  senderId: string
}

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string

const ownUserId = ref('')
const ownName = ref('')
const peers = ref<GamePeer[]>([])
const incomingVerses = ref<IncomingVerse[]>([])
const scores = ref<Record<string, number>>({})
const inputText = ref('')
const inputError = ref('')
const versesLoaded = ref(false)
const error = ref('')

interface FeedEntry {
  playerId: string
  book: string
  chapter: number
  verse: number
}

const feed = ref<FeedEntry[]>([])

let room: ReturnType<typeof joinGameRoom> | null = null
let timerInterval: number | undefined

const opponent = computed(() =>
  peers.value.find(p => p.userId !== ownUserId.value) ?? null
)

const opponentName = computed(() => opponent.value?.name ?? 'Waiting...')

const myScore = computed(() => scores.value[ownUserId.value] ?? 0)
const oppScore = computed(() => (opponent.value ? scores.value[opponent.value.userId] ?? 0 : 0))

const isReady = computed(() => peers.value.length >= 2)

function handleSubmit() {
  const text = inputText.value.trim()
  if (!text || !room || !versesLoaded.value) return
  inputError.value = ''

  const parsed = parseBookInput(text)
  if (parsed) {
    let matching: IncomingVerse[]
    let points: number
    let label: string

    if (parsed.verse) {
      matching = incomingVerses.value.filter(
        v => v.book.toLowerCase() === parsed.book.toLowerCase()
          && v.chapter === parsed.chapter
          && v.verse === parsed.verse
      )
      points = 5
      label = `${parsed.book} ${parsed.chapter}:${parsed.verse}`
    } else if (parsed.chapter) {
      matching = incomingVerses.value.filter(
        v => v.book.toLowerCase() === parsed.book.toLowerCase()
          && v.chapter === parsed.chapter
      )
      points = 2
      label = `${parsed.book} ${parsed.chapter}`
    } else {
      matching = incomingVerses.value.filter(
        v => v.book.toLowerCase() === parsed.book.toLowerCase()
      )
      points = 1
      label = parsed.book
    }

    if (matching.length === 0) {
      inputError.value = `No incoming verses from ${label}`
      inputText.value = ''
      return
    }
    const ids = matching.map(v => v.verseId)
    incomingVerses.value = incomingVerses.value.filter(v => !ids.includes(v.verseId))
    const newScore = myScore.value + matching.length * points
    scores.value = { ...scores.value, [ownUserId.value]: newScore }
    const clears: FeedEntry[] = matching.map(v => ({
      playerId: ownUserId.value,
      book: v.book,
      chapter: v.chapter,
      verse: v.verse,
    }))
    feed.value.push(...clears)
    room.sendMessage({
      type: 'game_update',
      playerId: ownUserId.value,
      playerScore: newScore,
      clears,
    })
    inputText.value = ''
    return
  }

  const words = text.split(/\s+/).filter(w => w.length > 0)
  if (words.length < 3) {
    inputError.value = 'Type at least 3 words to send a verse'
    return
  }

  const match = findVerse(text)
  if (!match) {
    inputError.value = 'Verse not found'
    return
  }

  room.sendMessage({
    type: 'verse_incoming',
    verseId: crypto.randomUUID(),
    book: match.b,
    chapter: match.c,
    verse: match.v,
    text: match.t,
    timeLeft: verseTimeLimit(words.length),
  })
  inputText.value = ''
}

function leaveGame() {
  room?.leave()
  router.push('/')
}

onMounted(async () => {
  try {
    ownUserId.value = await signInAnon()
  } catch {
    error.value = 'Failed to sign in'
    return
  }
  ownName.value = `Player_${ownUserId.value.slice(0, 4)}`

  try {
    await loadVerses()
    versesLoaded.value = true
  } catch {
    error.value = 'Failed to load verses'
    return
  }

  room = joinGameRoom(ownUserId.value, ownName.value, gameId, {
    onPeerJoin: () => {},
    onPeerLeave: () => {
      leaveGame()
    },
    onMessage: (msg, senderId) => {
      if (senderId === ownUserId.value) return
      if (msg.type === 'verse_incoming') {
        incomingVerses.value.push({ ...msg, senderId })
      } else if (msg.type === 'game_update') {
        scores.value = { ...scores.value, [msg.playerId]: msg.playerScore }
        feed.value.push(...msg.clears.map(c => ({ ...c, playerId: msg.playerId })))
      }
    },
    onPeersUpdate: (p) => {
      peers.value = p
    },
  })

  timerInterval = setInterval(() => {
    for (const v of incomingVerses.value) {
      v.timeLeft--
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
  <div v-if="error" class="error">{{ error }}</div>
  <div v-else class="game">
    <div class="header">
      <button class="leave-btn" @click="leaveGame">← Lobby</button>
      <div class="scores">
        <span class="score you">{{ myScore }}</span>
        <span class="vs">vs</span>
        <span class="score opponent">{{ oppScore }}</span>
        <span class="opp-name">{{ opponentName }}</span>
      </div>
      <div class="status">
        <span v-if="!isReady">Waiting for opponent...</span>
      </div>
    </div>

    <div class="main-content">
      <div class="verses-list">
        <div v-if="incomingVerses.length === 0" class="empty">
          No incoming verses yet
        </div>
        <div
          v-for="v in incomingVerses"
          :key="v.verseId"
          class="verse-entry"
        >
          <span class="text">{{ v.text }}</span>
          <span class="timer" :class="{ urgent: v.timeLeft <= 3 }">{{ v.timeLeft }}s</span>
        </div>
      </div>

      <div class="feed-panel">
        <div class="feed-title">Feed</div>
        <div v-if="feed.length === 0" class="empty">No clears yet</div>
        <div v-for="(entry, i) in feed" :key="i" class="feed-entry">
          <span class="who" :class="{ me: entry.playerId === ownUserId }">
            {{ entry.playerId === ownUserId ? 'You' : 'Them' }}
          </span>
          <span class="ref">({{ entry.book }} {{ entry.chapter }}:{{ entry.verse }})</span>
        </div>
      </div>
    </div>

    <div class="input-area">
      <div v-if="inputError" class="input-error">{{ inputError }}</div>
      <div class="input-row">
        <input
          v-model="inputText"
          @keyup.enter="handleSubmit"
          placeholder="Type a verse or book name..."
          :disabled="!isReady"
          autofocus
        />
        <button @click="handleSubmit" :disabled="!isReady">Send</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: var(--sans);
}

.error {
  padding: 2rem;
  text-align: center;
  color: #ef4444;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.leave-btn {
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}

.scores {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  justify-content: center;
}

.score {
  font-family: var(--mono);
  font-size: 1.5rem;
  font-weight: 600;
}

.score.you {
  color: var(--accent);
}

.score.opponent {
  color: var(--text-h);
}

.vs {
  color: var(--text);
  font-size: 0.9rem;
}

.opp-name {
  color: var(--text);
  font-size: 0.85rem;
  margin-left: 0.25rem;
}

.status {
  min-width: 10rem;
  text-align: right;
  color: var(--text);
  font-size: 0.85rem;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.verses-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 1rem;
}

.feed-panel {
  width: 260px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 0.5rem;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}

.feed-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.5rem;
  margin-bottom: 0.25rem;
}

.feed-entry {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  animation: slide-in 0.2s ease-out;
}

.feed-entry .who {
  font-weight: 600;
  flex-shrink: 0;
}

.feed-entry .who.me {
  color: var(--accent);
}

.feed-entry .ref {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--text);
}

.empty {
  text-align: center;
  color: var(--text);
  padding: 2rem 0.5rem;
  font-style: italic;
  font-size: 0.85rem;
}

.verse-entry {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0.25rem;
  border-radius: 6px;
  background: var(--code-bg);
  animation: slide-in 0.2s ease-out;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.text {
  flex: 1;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--text-h);
}

.timer {
  font-family: var(--mono);
  font-size: 0.8rem;
  color: var(--text);
  flex-shrink: 0;
  min-width: 2rem;
  text-align: right;
}

.timer.urgent {
  color: #ef4444;
  font-weight: 600;
}

.input-area {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border);
}

.input-error {
  color: #ef4444;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
  padding: 0.25rem 0;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-row input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.95rem;
  background: var(--bg);
  color: var(--text-h);
  outline: none;
}

.input-row input:focus {
  border-color: var(--accent);
}

.input-row button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--accent);
  border-radius: 4px;
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
}

.input-row button:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
}

.input-row button:disabled,
.input-row input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
