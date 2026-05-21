import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './useSupabase'
import type { GameMessage } from '../game/protocol'

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

export function joinGameRoom(
  userId: string,
  playerName: string,
  gameId: string,
  callbacks: GameCallbacks
): { channel: RealtimeChannel; sendMessage: (msg: GameMessage) => void; leave: () => void } {
  const channel = supabase.channel(`game:${gameId}`)

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const peers: GamePeer[] = Object.values(state).flat() as GamePeer[]
    callbacks.onPeersUpdate(peers)
  })

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    callbacks.onPeerJoin(newPresences[0] as GamePeer)
  })

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    callbacks.onPeerLeave((leftPresences[0] as GamePeer).userId)
  })

  channel.on('broadcast', { event: 'game_message' }, ({ payload }) => {
    callbacks.onMessage(payload.msg as GameMessage, payload.senderId)
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
