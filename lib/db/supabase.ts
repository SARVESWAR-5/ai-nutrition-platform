import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Browser-safe Supabase client for client-side components.
 */
export function createBrowserClient() {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Default client instance for standard queries.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
    supabaseUrl !== "https://placeholder.supabase.co" &&
    supabaseAnonKey &&
    supabaseAnonKey !== "placeholder-anon-key"
  );
}

export const supabase = createBrowserClient();
