/** Google login through Supabase Auth. */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** null when the login is not configured: the app runs without it (development) */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;
export const loginEnabled = supabase !== null;

// Token of the current session, sent by the API client in every request
let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export async function signInWithGoogle(): Promise<void> {
  await supabase?.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

// Offline copies of the user's data: never left behind for the next person on the device
const USER_DATA_PREFIXES = ["sync:shopping:", "sync:workouts:", "sync:settings"];

export async function signOut(): Promise<void> {
  try {
    Object.keys(localStorage)
      .filter((key) => USER_DATA_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // storage unavailable: nothing was saved there
  }
  await supabase?.auth.signOut();
}
