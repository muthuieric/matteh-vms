import { createClient } from '@supabase/supabase-js';

// Access the environment variables we just set in .env.local
// The '!' at the end tells TypeScript that we guarantee these variables exist.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single, reusable connection to your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);