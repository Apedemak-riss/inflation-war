import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Crosshair, Save, AlertTriangle } from 'lucide-react';

export function CallsignModal() {
  const { profile, supabase, refreshProfile } = useAuth();
  const [callsign, setCallsign] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Only show if profile exists and username is still a default
  if (!profile || !profile.username?.startsWith('Recruit_')) {
    return null;
  }

  const handleSave = async () => {
    const trimmed = callsign.trim();
    if (!trimmed || trimmed.length < 2) {
      setErrorMsg('Callsign must be at least 2 characters.');
      setStatus('error');
      return;
    }
    if (trimmed.length > 20) {
      setErrorMsg('Callsign must be 20 characters or fewer.');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setErrorMsg('');

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', profile.id);

    if (error) {
      if (error.code === '23505') {
        setErrorMsg('Callsign already taken. Try another.');
      } else {
        setErrorMsg(error.message);
      }
      setStatus('error');
    } else {
      // Refresh profile in-place instead of reloading the page
      await refreshProfile();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      {/* Overlay noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

      {/* Modal Card */}
      <div className="relative w-full max-w-md glass rounded-[2rem] border border-yellow-500/20 bg-[#0a101f]/95 backdrop-blur-xl shadow-[0_0_80px_rgba(234,179,8,0.1)] overflow-hidden animate-slide-up">

        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500" />

        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500 blur-[30px] opacity-30 rounded-full" />
              <div className="relative z-10 bg-yellow-500/10 p-3 rounded-2xl border border-yellow-500/30 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                <Crosshair className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-black tracking-tighter text-white mb-1">
            SET YOUR <span className="text-yellow-400">CALLSIGN</span>
          </h2>
          <p className="text-yellow-400/50 text-[10px] font-bold uppercase tracking-[0.3em]">
            Operative Identity Configuration
          </p>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 space-y-5">
          <p className="text-slate-400 text-sm text-center leading-relaxed">
            You are currently identified as <span className="text-white font-mono font-bold bg-white/5 px-2 py-0.5 rounded">{profile.username}</span>. Choose a permanent callsign for the battlefield.
          </p>

          <div className="relative group/input">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-0 group-hover/input:opacity-40 group-focus-within/input:opacity-60 transition duration-500 blur" />
            <div className="relative flex items-center bg-[#050b14] border border-white/10 rounded-xl overflow-hidden shadow-inner group-focus-within/input:border-yellow-500/40 transition-colors">
              <div className="pl-4 text-slate-500">
                <Crosshair size={18} />
              </div>
              <input
                type="text"
                value={callsign}
                onChange={e => setCallsign(e.target.value)}
                className="w-full bg-transparent p-4 text-lg font-black text-center uppercase tracking-wider outline-none text-white placeholder:text-slate-700"
                placeholder="VIPER"
                maxLength={20}
                autoFocus
              />
            </div>
          </div>

          {/* Character count */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-600 font-mono">{callsign.length}/20</span>
            {callsign.trim().length >= 2 && (
              <span className="text-[10px] text-green-500 font-bold tracking-wider uppercase animate-fade-in">✓ Valid</span>
            )}
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-bold uppercase tracking-wider">
                {errorMsg}
              </p>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={status === 'saving' || callsign.trim().length < 2}
            className={`w-full font-black py-4 rounded-xl transition-all duration-300 uppercase tracking-widest text-sm flex items-center justify-center gap-3
              ${status === 'saving'
                ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 cursor-wait'
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:shadow-[0_0_50px_rgba(234,179,8,0.4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
              }`}
          >
            {status === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                <span className="animate-pulse">Registering Callsign...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Confirm Identity</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
