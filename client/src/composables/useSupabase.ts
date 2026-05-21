import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

let cachedUserId: string | null = null

export async function signInAnon(): Promise<string> {
  if (cachedUserId) return cachedUserId

  const { data: sessionData } = await supabase.auth.getSession()
  if (sessionData.session?.user) {
    cachedUserId = sessionData.session.user.id
    return cachedUserId
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) throw error ?? new Error('No user')
  cachedUserId = data.user.id
  return cachedUserId
}
