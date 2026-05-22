import type { RealtimeChannel } from '@supabase/supabase-js'
import { getClient } from './useSupabase'

const PLAYER_NAME_RE = /^Player_\d+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function isValidPlayer(data: unknown): data is LobbyPlayer {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.userId !== 'string') return false
  if (typeof d.name !== 'string') return false
  if (typeof d.status !== 'string') return false
  if (!PLAYER_NAME_RE.test(d.name)) return false
  if (d.status !== 'looking' && d.status !== 'in_game') return false
  return true
}

function isValidInvite(data: unknown): data is GameInvite {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.gameId !== 'string' || !UUID_RE.test(d.gameId)) return false
  if (typeof d.hostName !== 'string' || !PLAYER_NAME_RE.test(d.hostName)) return false
  if (typeof d.hostId !== 'string' || !UUID_RE.test(d.hostId)) return false
  if (typeof d.targetId !== 'string' || !UUID_RE.test(d.targetId)) return false
  return true
}

function isValidInviteResponse(data: unknown): data is InviteResponse {
  if (typeof data !== 'object' || data === null) return false
  const d = data as Record<string, unknown>
  if (typeof d.gameId !== 'string' || !UUID_RE.test(d.gameId)) return false
  if (typeof d.joinerId !== 'string' || !UUID_RE.test(d.joinerId)) return false
  if (typeof d.joinerName !== 'string' || !PLAYER_NAME_RE.test(d.joinerName)) return false
  if (typeof d.accepted !== 'boolean') return false
  return true
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
  const channel = getClient().channel('lobby')

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const players = (Object.values(state).flat() as unknown[]).filter(isValidPlayer)
    callbacks.onPlayersUpdate(players)
  })

  channel.on('presence', { event: 'join' }, ({ newPresences }) => {
    const valid = (newPresences as unknown[]).filter(isValidPlayer)
    if (valid.length > 0) {
      callbacks.onPlayerJoin?.(valid[0])
    }
  })

  channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    if (leftPresences.length > 0) {
      const left = leftPresences[0] as unknown as LobbyPlayer
      callbacks.onPlayerLeave?.(left)
    }
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        userId,
        name: playerName,
        status: 'looking',
      } satisfies LobbyPlayer)

      // Re-read presence after track — no sync fires for our own track
      const state = channel.presenceState()
      const players = (Object.values(state).flat() as unknown[]).filter(isValidPlayer)
      callbacks.onPlayersUpdate(players)
    }
  })

  return channel
}

export function updateLobbyStatus(
  channel: RealtimeChannel,
  userId: string,
  name: string,
  status: LobbyPlayer['status'],
  gameId?: string
) {
  channel.track({ userId, name, status, gameId } satisfies LobbyPlayer)
}

export function sendInvite(channel: RealtimeChannel, invite: GameInvite) {
  channel.send({
    type: 'broadcast',
    event: 'game_invite',
    payload: invite,
  })
}

export function listenForInvites(channel: RealtimeChannel, cb: (invite: GameInvite) => void) {
  channel.on('broadcast', { event: 'game_invite' }, ({ payload }) => {
    if (isValidInvite(payload)) {
      cb(payload)
    }
  })
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
  channel.on('broadcast', { event: 'game_invite_response' }, ({ payload }) => {
    if (isValidInviteResponse(payload)) {
      cb(payload)
    }
  })
}
