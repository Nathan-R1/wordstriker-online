import { z } from 'zod'

export const PlayerReadySchema = z.object({
  type: z.literal('player_ready'),
  playerId: z.string(),
  playerName: z.string(),
})

export const VerseIncomingSchema = z.object({
  type: z.literal('verse_incoming'),
  verseId: z.string(),
  book: z.string(),
  chapter: z.number().int().positive(),
  verse: z.number().int().positive(),
  text: z.string(),
  timeLeft: z.number().int().positive(),
})

export const GameUpdateSchema = z.object({
  type: z.literal('game_update'),
  playerId: z.string(),
  playerScore: z.number().int().min(0),
})

export const GameMessageSchema = z.discriminatedUnion('type', [
  PlayerReadySchema,
  VerseIncomingSchema,
  GameUpdateSchema,
])

export type GameMessage = z.infer<typeof GameMessageSchema>

export function parseGameMessage(data: unknown): GameMessage | null {
  const result = GameMessageSchema.safeParse(data)
  return result.success ? result.data : null
}
