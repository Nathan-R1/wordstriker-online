import { z } from 'zod'

const FireWordSchema = z.object({
  type: z.literal('fire_word'),
  word: z.string().max(50).regex(/^[a-zA-Z]+$/).transform(w => w.toLowerCase()),
  word_id: z.string().uuid(),
  timestamp: z.number().positive(),
})

const HitSchema = z.object({
  type: z.literal('hit'),
  word_id: z.string().uuid(),
  timestamp: z.number().positive(),
})

const MissSchema = z.object({
  type: z.literal('miss'),
  word_id: z.string().uuid(),
})

const HealthUpdateSchema = z.object({
  type: z.literal('health_update'),
  health: z.number().int().min(0).max(100),
})

const ScoreUpdateSchema = z.object({
  type: z.literal('score_update'),
  score: z.number().int().min(0),
})

const GameOverSchema = z.object({
  type: z.literal('game_over'),
  winner: z.string(),
  stats: z.object({
    words_typed: z.number().int().min(0),
    accuracy: z.number().min(0).max(1),
    duration_sec: z.number().positive(),
  }),
})

const GameInitSchema = z.object({
  type: z.literal('game_init'),
  word_list: z.array(z.string().regex(/^[a-zA-Z]+$/).max(50)),
  seed: z.number().int(),
  player_id: z.string(),
})

const PlayerReadySchema = z.object({
  type: z.literal('player_ready'),
  player_id: z.string(),
  player_name: z.string(),
})

export const GameMessageSchema = z.discriminatedUnion('type', [
  GameInitSchema,
  FireWordSchema,
  HitSchema,
  MissSchema,
  HealthUpdateSchema,
  ScoreUpdateSchema,
  GameOverSchema,
  PlayerReadySchema,
])

export type GameMessage = z.infer<typeof GameMessageSchema>

export function parseGameMessage(data: unknown): GameMessage | null {
  const result = GameMessageSchema.safeParse(data)
  return result.success ? result.data : null
}
