import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// --- Helpers ---
function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  if (err instanceof Error && err.message?.includes('navigator.locks')) return true;
  return false;
}

// --- Types ---
export type UserProfile = {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  avatar_url: string | null;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  supabase: typeof supabase;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Provider ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, username, role, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthContext] Failed to fetch profile:', error.message);
        setProfile(null);
      } else {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      if (isAbortError(err)) {
        console.warn('[AuthContext] Profile fetch aborted (Web Lock). Continuing gracefully.');
      } else {
        console.error('[AuthContext] Unexpected error fetching profile:', err);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    // ── FAILSAFE: Hard timeout guarantees loading ALWAYS resolves ──
    const failsafeTimer = setTimeout(() => {
      if (isMounted) {
        console.warn('[AuthContext] Auth loading timed out after 3s. Forcing loading=false.');
        setLoading(false);
      }
    }, 3000);

    // ── 1. Listen for auth changes (MUST be registered BEFORE getSession) ──
    // This ensures INITIAL_SESSION event is captured even with StrictMode shenanigans
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) return;
        console.log('[AuthContext] onAuthStateChange:', event);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        // CRITICAL: Do NOT await fetchProfile here synchronously.
        // Supabase's auth client blocks updateUser() from resolving until this
        // callback finishes. If we await a DB call inside the callback,
        // we create a deadlock (updateUser waits for callback → callback waits for fetch).
        // Using setTimeout(0) defers the fetch to break the synchronous chain.
        if (newSession?.user) {
          setTimeout(() => {
            if (isMounted) fetchProfile(newSession.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        clearTimeout(failsafeTimer);
        setLoading(false);
      }
    );

    // ── 2. Get initial session (triggers INITIAL_SESSION event above) ──
    supabase.auth.getSession().catch(err => {
      if (isAbortError(err)) {
        console.warn('[AuthContext] getSession aborted (Web Lock / Strict Mode).');
      } else {
        console.error('[AuthContext] Failed to get session:', err);
      }
      clearTimeout(failsafeTimer);
      if (isMounted) setLoading(false);
    });

    // ── 3. Visibility handler: prevent stale-connection hangs ──
    const handleVisibility = () => {
      if (document.hidden) {
        console.log('[AuthContext] Tab hidden → stopping auto-refresh');
        supabase.auth.stopAutoRefresh();
      } else {
        console.log('[AuthContext] Tab visible → starting auto-refresh');
        supabase.auth.startAutoRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // ── 4. Cleanup ──
    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchProfile]);

  // ── Separate effect for realtime profile watching ──
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;

    const timer = setTimeout(() => {
      if (!isMounted) return;
      profileChannel = supabase.channel(`profile-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          (payload) => {
            console.log('[AuthContext] Profile updated in realtime:', payload.new);
            setProfile(payload.new as UserProfile);
          }
        )
        .subscribe();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, [user?.id]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      if (isAbortError(err)) {
        console.warn('[AuthContext] signOut aborted (Web Lock). Clearing state manually.');
      } else {
        console.error('[AuthContext] signOut error:', err);
      }
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signOut, refreshProfile, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Hook ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
