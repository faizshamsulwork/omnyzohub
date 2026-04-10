import { createClient } from '@supabase/supabase-js'

// Kod ini akan mengambil kunci rahsia dari fail .env.local yang kau buat tadi
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Ini adalah "jambatan" rasmi yang akan kita gunakan di seluruh platform
export const supabase = createClient(supabaseUrl, supabaseKey)