import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './useSupabase'

export type LobbyPlayer = {
  userId: string
  name: string
  status: 'looking' | 'in_game'
  gameId?: string
}

export type GameInvite = {
  gameId: string
  hostName: string
  hostId: string
  targetId: string
}

export type InviteResponse = {
  gameId: string
  joinerId: string
  joinerName: string
  accepted: boolean
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
      await channel.track({
        userId,
        name: playerName,
        status: 'looking',
      } satisfies LobbyPlayer)
    }
  })

  return channel
}

export function updateLobbyStatus(
  channel: RealtimeChannel,
  status: LobbyPlayer['status'],
  gameId?: string
) {
  channel.track({ status, gameId } as Partial<LobbyPlayer>)
}

export function sendInvite(channel: RealtimeChannel, invite: GameInvite) {
  channel.send({
    type: 'broadcast',
    event: 'game_invite',
    payload: invite,
  })
}

export function listenForInvites(channel: RealtimeChannel, cb: (invite: GameInvite) => void) {
  channel.on('broadcast', { event: 'game_invite' }, ({ payload }) => cb(payload as GameInvite))
}

export function sendInviteResponse(channel: RealtimeChannel, response: InviteResponse) {
  channel.send({
    type: 'broadcast',
    event: 'game_invite_response',
    payload: response,
  })
}

export function listenForInviteResponses(
  channel: RealtimeChannel,
  cb: (response: InviteResponse) => void
) {
  channel.on('broadcast', { event: 'game_invite_response' }, ({ payload }) =>
    cb(payload as InviteResponse)
  )
}
