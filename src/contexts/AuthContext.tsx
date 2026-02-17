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

    // ── 1. Get initial session ──
    const initSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Fetch profile in its own try/catch — must never skip finally
        if (currentSession?.user) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('id, email, username, role, avatar_url')
              .eq('id', currentSession.user.id)
              .single();

            if (!isMounted) return;

            if (error) {
              console.error('[AuthContext] Profile fetch error during init:', error.message);
              setProfile(null);
            } else {
              setProfile(data as UserProfile);
            }
          } catch (profileErr) {
            console.error('[AuthContext] Profile fetch threw during init:', profileErr);
            if (isMounted) setProfile(null);
          }
        }
      } catch (err) {
        if (isAbortError(err)) {
          console.warn('[AuthContext] getSession aborted (Web Lock / Strict Mode). Treating as no session.');
        } else {
          console.error('[AuthContext] Failed to get session:', err);
        }
      } finally {
        // ALWAYS release the loading gate — even on abort or profile failure
        clearTimeout(failsafeTimer);
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    // ── 2. Listen for auth changes ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // ── 3. Visibility handler: prevent stale-connection hangs ──
    // When tab hides → stop auto-refresh (kills internal timers/listeners)
    // When tab returns → restart auto-refresh on a fresh connection
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

    // ── 4. Cleanup: unsubscribe + cancel failsafe + remove listener ──
    return () => {
      isMounted = false;
      clearTimeout(failsafeTimer);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchProfile]);

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
