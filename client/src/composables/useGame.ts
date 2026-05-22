import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './useSupabase'
import type { GameMessage } from '../game/protocol'
import { parseGameMessage } from '../game/protocol'

const PLAYER_NAME_RE = /^Player_\d+$/

export type GamePeer = {
  userId: string
  name: string
}

export type GameCallbacks = {
  onPeerJoin: (peer: GamePeer) => void
  onPeerLeave: (peerId: string) => void
  onMessage: (msg: GameMessage, senderId: string) => void
  onPeersUpdate: (peers: GamePeer[]) => void
}

function isValidPeer(data: unknown): data is GamePeer {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.userId !== 'string') return false
  if (typeof d.name !== 'string') return false
  if (!PLAYER_NAME_RE.test(d.name)) return false
  return true
}

export function joinGameRoom(
  userId: string,
  playerName: string,
  gameId: string,
  callbacks: GameCallbacks
): { channel: RealtimeChannel; sendMessage: (msg: GameMessage) => void; leave: () => void } {
  const channel = supabase.channel(`game:${gameId}`)

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const peers = (Object.values(state).flat() as unknown[]).filter(isValidPeer)
    callbacks.onPeersUpdate(peers)
  })

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    const valid = (newPresences as unknown[]).filter(isValidPeer)
    if (valid.length > 0) {
      callbacks.onPeerJoin(valid[0])
    }
  })

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    if (leftPresences.length > 0) {
      const left = leftPresences[0] as unknown as GamePeer
      callbacks.onPeerLeave(left.userId)
    }
  })

  channel.on('broadcast', { event: 'game_message' }, ({ payload }) => {
    const msg = parseGameMessage(payload.msg)
    if (!msg) {
      console.warn('[Game] Dropping invalid message', payload.msg)
      return
    }
    callbacks.onMessage(msg, payload.senderId)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ userId, name: playerName } satisfies GamePeer)
    }
  })

  function sendMessage(msg: GameMessage) {
    channel.send({
      type: 'broadcast',
      event: 'game_message',
      payload: { msg, senderId: userId },
    })
  }

  function leave() {
    channel.untrack()
    channel.unsubscribe()
  }

  return { channel, sendMessage, leave }
}
