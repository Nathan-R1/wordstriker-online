import { z } from 'zod'

const PlayerId = z.string().max(100)
const BookName = z.string().max(30)

export const PlayerReadySchema = z.object({
  type: z.literal('player_ready'),
  playerId: PlayerId,
  playerName: z.string().max(30),
})

export const VerseIncomingSchema = z.object({
  type: z.literal('verse_incoming'),
  verseId: z.string().max(64),
  book: BookName,
  chapter: z.number().int().positive(),
  verse: z.number().int().positive(),
  timeLeft: z.number().int().positive(),
})

export const ClearEntrySchema = z.object({
  book: BookName,
  chapter: z.number().int().positive(),
  verse: z.number().int().positive(),
})

export const GameUpdateSchema = z.object({
  type: z.literal('game_update'),
  playerId: PlayerId,
  playerScore: z.number().int().min(0),
  clears: z.array(ClearEntrySchema),
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
