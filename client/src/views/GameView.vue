<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInAnon, supabase } from '../composables/useSupabase'
import { joinGameRoom, type GamePeer } from '../composables/useGame'
import type { GameMessage } from '../game/protocol'

const route = useRoute()
const router = useRouter()
const gameId = route.params.gameId as string

const userId = ref('')
const playerName = ref('')
const peers = ref<GamePeer[]>([])
const messages = ref<{ text: string; from: string }[]>([])
const inputText = ref('')
const ownUserId = ref('')

let room: ReturnType<typeof joinGameRoom> | null = null

const opponentName = computed(() => {
  return peers.value.find(p => p.userId !== ownUserId.value)?.name ?? 'Waiting for opponent...'
})

const isReady = computed(() => peers.value.length >= 2)

function sendChat() {
  if (!inputText.value.trim() || !room) return
  const msg: GameMessage = {
    type: 'fire_word',
    word: inputText.value.trim(),
    word_id: crypto.randomUUID(),
    timestamp: Date.now(),
  }
  room.sendMessage(msg)
  messages.value.push({ text: `[you] ${msg.word}`, from: ownUserId.value })
  inputText.value = ''
}

function leaveGame() {
  room?.leave()
  router.push('/')
}

onMounted(async () => {
  ownUserId.value = await signInAnon()
  userId.value = ownUserId.value
  playerName.value = `Player_${ownUserId.value.slice(0, 4)}`

  room = joinGameRoom(ownUserId.value, playerName.value, gameId, {
    onPeerJoin: (peer) => {
      messages.value.push({ text: `${peer.name} joined`, from: 'system' })
    },
    onPeerLeave: (peerId) => {
      messages.value.push({ text: `player left`, from: 'system' })
      leaveGame()
    },
    onMessage: (msg, senderId) => {
      if (msg.type === 'fire_word') {
        messages.value.push({ text: `[${senderId.slice(0, 4)}] ${msg.word}`, from: senderId })
      }
    },
    onPeersUpdate: (p) => {
      peers.value = p
    },
  })
})

onUnmounted(() => {
  room?.leave()
})
</script>

<template>
  <div class="game">
    <div class="header">
      <button @click="leaveGame">← Lobby</button>
      <span>Game: {{ gameId.slice(0, 8) }}...</span>
      <span v-if="!isReady">⏳ Waiting for opponent...</span>
      <span v-else>⚔️ Playing vs {{ opponentName }}</span>
    </div>

    <div class="chat">
      <div v-for="(m, i) in messages" :key="i" class="msg" :class="{ own: m.from === ownUserId }">
        {{ m.text }}
      </div>
    </div>

    <div class="input-row">
      <input v-model="inputText" @keyup.enter="sendChat" placeholder="Type a word..." :disabled="!isReady" />
      <button @click="sendChat" :disabled="!isReady">Send</button>
    </div>
  </div>
</template>

<style scoped>
.game { display: flex; flex-direction: column; height: 100vh; }
.header { display: flex; gap: 1rem; align-items: center; padding: 0.5rem; border-bottom: 1px solid #ccc; }
.chat { flex: 1; overflow-y: auto; padding: 0.5rem; }
.msg { padding: 0.25rem 0; }
.own { color: #2563eb; }
.input-row { display: flex; padding: 0.5rem; border-top: 1px solid #ccc; }
.input-row input { flex: 1; margin-right: 0.5rem; }
</style>
