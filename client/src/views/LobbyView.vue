<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { signInAnon } from '../composables/useSupabase'
import {
  joinLobby,
  sendInvite,
  listenForInvites,
  listenForInviteResponses,
  sendInviteResponse,
  updateLobbyStatus,
  type LobbyPlayer,
  type GameInvite,
  type InviteResponse,
} from '../composables/useLobby'

const router = useRouter()
const players = ref<LobbyPlayer[]>([])
const myId = ref('')
const myName = ref('')
const incomingInvite = ref<GameInvite | null>(null)
const sentInvites = ref<Set<string>>(new Set())

let lobbyChannel: ReturnType<typeof joinLobby> | null = null

function invitePlayer(target: LobbyPlayer) {
  if (!lobbyChannel) return
  const gameId = crypto.randomUUID()
  sendInvite(lobbyChannel, {
    gameId,
    hostName: myName.value,
    hostId: myId.value,
    targetId: target.userId,
  })
  sentInvites.value.add(target.userId)

  updateLobbyStatus(lobbyChannel, 'in_game', gameId)

  router.push(`/game/${gameId}`)
}

function acceptInvite() {
  if (!lobbyChannel || !incomingInvite.value) return
  const invite = incomingInvite.value

  sendInviteResponse(lobbyChannel, {
    gameId: invite.gameId,
    joinerId: myId.value,
    joinerName: myName.value,
    accepted: true,
  })

  updateLobbyStatus(lobbyChannel, 'in_game', invite.gameId)
  incomingInvite.value = null
  router.push(`/game/${invite.gameId}`)
}

function declineInvite() {
  if (!lobbyChannel || !incomingInvite.value) return
  sendInviteResponse(lobbyChannel, {
    gameId: incomingInvite.value.gameId,
    joinerId: myId.value,
    joinerName: myName.value,
    accepted: false,
  })
  incomingInvite.value = null
}

onMounted(async () => {
  myId.value = await signInAnon()
  myName.value = `Player_${myId.value.slice(0, 4)}`

  lobbyChannel = joinLobby(myId.value, myName.value, {
    onPlayersUpdate: (p) => {
      players.value = p
    },
  })

  listenForInvites(lobbyChannel, (invite) => {
    if (invite.targetId === myId.value) {
      incomingInvite.value = invite
    }
  })

  listenForInviteResponses(lobbyChannel, (response) => {
    if (response.accepted) {
      sentInvites.value.delete(response.joinerId)
    }
  })
})
</script>

<template>
  <div>
    <h1>Lobby</h1>
    <p>You: {{ myName }} ({{ myId.slice(0, 8) }}...)</p>

    <h2>Players ({{ players.length }}):</h2>
    <ul>
      <li v-for="p in players" :key="p.userId">
        {{ p.name }}
        <span v-if="p.userId === myId">(you)</span>
        <span v-else-if="p.status === 'in_game'">🎮 in game</span>
        <button v-else-if="!sentInvites.has(p.userId)" @click="invitePlayer(p)">
          Invite
        </button>
        <span v-else>⏳ invited...</span>
      </li>
    </ul>

    <div v-if="incomingInvite" class="invite-popup">
      <p>{{ incomingInvite.hostName }} invites you to a game</p>
      <button @click="acceptInvite">Accept</button>
      <button @click="declineInvite">Decline</button>
    </div>
  </div>
</template>

<style scoped>
.invite-popup {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.invite-popup button {
  margin: 0 0.25rem;
}
</style>
