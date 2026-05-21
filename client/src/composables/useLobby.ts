import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './useSupabase'

export type LobbyPlayer = {
  userId: string
  name: string
}

export function joinLobby(
  userId: string,
  playerName: string,
  callbacks: {
    onPlayersUpdate: (players: LobbyPlayer[]) => void
    onPlayerJoin?: (p: LobbyPlayer) => void
    onPlayerLeave?: (p: LobbyPlayer) => void
  }
): RealtimeChannel {
  const channel = supabase.channel('lobby')

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const players: LobbyPlayer[] = Object.values(state).flat() as LobbyPlayer[]
    callbacks.onPlayersUpdate(players)
  })

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    callbacks.onPlayerJoin?.(newPresences[0] as LobbyPlayer)
  })

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    callbacks.onPlayerLeave?.(leftPresences[0] as LobbyPlayer)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ userId, name: playerName } satisfies LobbyPlayer)
    }
  })

  return channel
}
