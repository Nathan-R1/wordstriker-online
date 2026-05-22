import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      import.meta.env.VITE_SUPABASE_URL ?? '',
      import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    )
  }
  return _client
}

let cachedUserId: string | null = null

export async function signInAnon(): Promise<string> {
  if (cachedUserId) return cachedUserId
  const client = getClient()

  const { data: sessionData } = await client.auth.getSession()
  if (sessionData.session?.user) {
    cachedUserId = sessionData.session.user.id
    return cachedUserId
  }

  const { data, error } = await client.auth.signInAnonymously()
  if (error || !data.user) throw error ?? new Error('No user')
  cachedUserId = data.user.id
  return cachedUserId
}
