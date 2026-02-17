import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Global Fetch Timeout ──
// Kill any network request that takes longer than 10 seconds.
// Prevents "zombie" requests from hanging the UI after tab-switch.
const fetchWithTimeout = (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  const existingSignal = options.signal;
  if (existingSignal) {
    existingSignal.addEventListener('abort', () => controller.abort());
  }

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
};

// ── Supabase Client (Singleton) ──
// - fetchWithTimeout: kills stalled requests after 10s
// - No-op lock: prevents navigator.locks deadlocks that break the site entirely
// - autoRefreshToken: enabled (Supabase handles refresh, fetchWithTimeout protects)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: fetchWithTimeout as unknown as typeof fetch,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
      // No-op lock: navigator.locks causes deadlocks that break the entire site
      return await fn();
    },
  },
});
