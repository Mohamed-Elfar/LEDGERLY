import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Single shared Supabase client for the app
const SUPABASE_URL = "https://tvsuxxfdpswbxyodomea.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oj45WS1BrM2q6D0l8K4zDg_I5araqBQ";

// Use AsyncStorage so sessions persist across app reloads (required for React Native/Expo).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
