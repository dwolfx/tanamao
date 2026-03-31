import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bieixouswzpcnebkhcjr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZWl4b3Vzd3pwY25lYmtoY2pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MTMxNjksImV4cCI6MjA5MDQ4OTE2OX0.yPQLiZ6bvBwzNyWiksiYCtfEv1qggdp_vH5_oEmCtVc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
