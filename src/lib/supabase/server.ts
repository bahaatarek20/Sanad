import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const DEFAULT_SUPABASE_URL = 'https://zzsgeyqyhfmfqglcowkd.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6c2dleXF5aGZtZnFnbGNvd2tkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NDk4NzMsImV4cCI6MjA1ODIyNTg3M30.jIndrHU_Uwvj60IkMICZkjb426s1bt7wn-k_fXk'

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

  try {
    return createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // يتم تجاهل هذا الخطأ داخل Server Component
          }
        },
      },
    })
  } catch (err) {
    console.error('Failed to initialize Supabase server client:', err)
    // عميل بديل آمن يمنع تعطل الصفحة (500 Error)
    return createServerClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    })
  }
}