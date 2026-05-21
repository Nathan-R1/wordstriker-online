<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { signInAnon } from '../composables/useSupabase'
import { joinLobby, type LobbyPlayer } from '../composables/useLobby'

const players = ref<LobbyPlayer[]>([])
const myId = ref('')
const myName = ref('')

onMounted(async () => {
  myId.value = await signInAnon()
  myName.value = `Player_${myId.value.slice(0, 4)}`
  joinLobby(myId.value, myName.value, {
    onPlayersUpdate: (p) => { players.value = p },
  })
})
</script>

<template>
  <div>
    <h1>Lobby</h1>
    <p>You: {{ myName }} ({{ myId }})</p>
    <h2>Players in lobby:</h2>
    <ul>
      <li v-for="p in players" :key="p.userId">
        {{ p.name }}
        <span v-if="p.userId === myId">(you)</span>
      </li>
    </ul>
  </div>
</template>
