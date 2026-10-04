import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'https://zzsgeyqyhfmfqglcowkd.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2dleXF5aGZtZnFnbGNvd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDk4NzMsImV4cCI6MjA1ODIyNTg3M30.jIndrHU_Uwvj60IkMICZkjb426s1bt7wn-k_fXk'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

  try {
    return createBrowserClient(supabaseUrl, supabaseKey)
  } catch (err) {
    console.error('Failed to initialize Supabase browser client:', err)
    return createBrowserClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY)
  }
}