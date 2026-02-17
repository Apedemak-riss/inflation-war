import { useAuth } from '../contexts/AuthContext';
import { LogOut, Settings } from 'lucide-react';

function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

export function ProfileBadge({ onSettings }: { onSettings?: () => void }) {
  const { user, profile, signOut } = useAuth();

  // Only render for authenticated users with a loaded profile
  if (!user || !profile) return null;

  const isMod = profile.role === 'moderator' || profile.role === 'admin';
  const displayName = profile.username || user.email || 'Unknown';
  const avatarSeed = profile.username || user.email || 'unknown';

  return (
    <div className="fixed top-6 right-6 z-50 animate-fade-in">
      <div className="glass flex items-center gap-4 px-6 py-3.5 rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.4)]">

        {/* Avatar */}
        <div className="relative">
          <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center ${isMod ? 'border border-red-500/30 bg-red-500/10' : 'border border-blue-500/30 bg-blue-500/10'}`}>
            <img
              src={getAvatarUrl(avatarSeed)}
              alt={displayName}
              className="w-10 h-10 rounded-lg"
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050b14] shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <span className="text-white text-sm font-black tracking-wide leading-none">
            {displayName}
          </span>
          <div className="flex items-center gap-1.5 mt-1.5">
            {isMod ? (
              <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none text-red-400 bg-red-500/15 border border-red-500/25 px-2 py-0.5 rounded">
                MODERATOR
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] leading-none text-slate-500">
                Operative
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="ml-2 h-8 w-px bg-white/10" />

        {onSettings && (
          <button
            onClick={onSettings}
            className="group flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
            title="Settings"
          >
            <Settings size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline group-hover:text-blue-400">
              CFG
            </span>
          </button>
        )}

        <button
          onClick={signOut}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
          title="Disconnect"
        >
          <LogOut size={16} />
          <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline group-hover:text-red-400">
            DC
          </span>
        </button>
      </div>
    </div>
  );
}
