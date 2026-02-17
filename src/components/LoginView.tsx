import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, Wifi, Lock, Zap, KeyRound, AlertTriangle, Eye, EyeOff, Check, Gamepad2, Chrome, Twitch } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export function LoginView() {
  const { supabase } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSocialLogin = async (provider: 'discord' | 'google' | 'twitch') => {
    setSocialLoading(provider);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    }
    setSocialLoading(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setStatus('loading');
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        // Supabase returns a null session when email confirmation is required
        if (!data.session) {
          setSuccessMsg('UPLINK ESTABLISHED. CHECK SECURE COMMS (EMAIL) TO VERIFY IDENTITY.');
          setStatus('success');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      // On success with a session, onAuthStateChange in AuthContext handles the redirect.
      setStatus('idle');
    } catch (err: any) {
      setErrorMsg(err?.message || 'An unexpected error occurred.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Noise Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />

      {/* Ambient glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Glass container */}
        <div className="glass rounded-[2rem] border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">

          {/* Header Section */}
          <div className="border-b border-white/5 p-8 pb-6 text-center">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-[0.3em] uppercase shadow-[0_0_20px_rgba(59,130,246,0.2)] mb-6">
              <Wifi size={12} className="animate-pulse" /> Secure Terminal
            </div>

            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <Lock className="w-7 h-7 text-blue-400" />
              </div>
            </div>

            <h1 className="text-3xl font-black tracking-tighter text-white mb-1">
              INFLATION <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">WAR</span>
            </h1>
            <p className="text-blue-200/40 font-bold tracking-[0.3em] text-[9px] uppercase">
              Authentication Protocol v2.1
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="px-8 pt-6">
            <div className="relative flex bg-[#050b14] rounded-xl border border-white/5 p-1 shadow-inner">
              {/* Sliding indicator */}
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-all duration-300 ease-out ${
                  mode === 'signin'
                    ? 'left-1 bg-blue-500/15 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                    : 'left-[calc(50%+2px)] bg-purple-500/15 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                }`}
              />
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); setStatus('idle'); }}
                className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] transition-colors duration-300 rounded-lg ${
                  mode === 'signin' ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); setStatus('idle'); }}
                className={`relative z-10 flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.25em] transition-colors duration-300 rounded-lg ${
                  mode === 'signup' ? 'text-purple-400' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                Enlist
              </button>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Success Message */}
              {status === 'success' && successMsg && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                  <Check size={16} className="text-green-400 shrink-0" />
                  <p className="text-green-400 text-xs font-bold uppercase tracking-wider">
                    {successMsg}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {status === 'error' && errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-xs font-bold uppercase tracking-wider">
                    {errorMsg}
                  </p>
                </div>
              )}

              {/* Email Input */}
              <div className="relative group/input">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover/input:opacity-40 group-focus-within/input:opacity-60 transition duration-500 blur" />
                <div className="relative flex items-center bg-[#050b14] border border-white/10 rounded-xl overflow-hidden shadow-inner group-focus-within/input:border-blue-500/40 transition-colors">
                  <div className="pl-4 text-slate-500">
                    <Terminal size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-transparent p-4 text-sm font-mono tracking-wider outline-none text-white placeholder:text-slate-700 transition-all"
                    placeholder="operative@command.mil"
                    disabled={status === 'loading'}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="relative group/input">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-0 group-hover/input:opacity-40 group-focus-within/input:opacity-60 transition duration-500 blur" />
                <div className="relative flex items-center bg-[#050b14] border border-white/10 rounded-xl overflow-hidden shadow-inner group-focus-within/input:border-blue-500/40 transition-colors">
                  <div className="pl-4 text-slate-500">
                    <KeyRound size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-transparent p-4 text-sm font-mono tracking-wider outline-none text-white placeholder:text-slate-700 transition-all"
                    placeholder={mode === 'signup' ? 'CREATE PASSPHRASE (6+ CHARS)' : 'ENTER PASSPHRASE'}
                    disabled={status === 'loading'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="pr-4 text-slate-600 hover:text-slate-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>


              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'loading' || !email.trim() || !password}
                className={`w-full group/btn relative overflow-hidden font-black py-4 rounded-xl transition-all duration-300 uppercase tracking-widest text-sm flex items-center justify-center gap-3 mt-2
                  ${status === 'loading'
                    ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30 cursor-wait'
                    : mode === 'signin'
                      ? 'bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_50px_rgba(255,255,255,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
                  }`}
              >
                {status === 'loading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="animate-pulse">
                      {mode === 'signin' ? 'AUTHENTICATING...' : 'REGISTERING OPERATIVE...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>{mode === 'signin' ? 'Authenticate' : 'Enlist Operative'}</span>
                  </>
                )}
              </button>
            </form>

            {/* ─── Social Uplink Divider ─── */}
            <div className="flex items-center gap-4 my-2">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="text-[9px] font-black text-slate-600 tracking-[0.3em] uppercase">Social Uplink</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* ─── Social Login Buttons ─── */}
            <div className="space-y-2.5">
              {/* Discord */}
              <button
                type="button"
                onClick={() => handleSocialLogin('discord')}
                disabled={socialLoading !== null}
                className={`w-full group/social relative overflow-hidden flex items-center justify-center gap-3 py-3.5 rounded-xl border font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300
                  ${socialLoading === 'discord'
                    ? 'bg-[#5865F2]/10 border-[#5865F2]/30 text-[#5865F2] cursor-wait'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-[#5865F2]/15 hover:border-[#5865F2]/40 hover:text-[#5865F2] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2]/0 via-[#5865F2]/5 to-[#5865F2]/0 translate-x-[-100%] group-hover/social:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-3">
                  {socialLoading === 'discord'
                    ? <div className="w-4 h-4 border-2 border-[#5865F2] border-t-transparent rounded-full animate-spin" />
                    : <Gamepad2 size={16} />
                  }
                  Discord
                </span>
              </button>

              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoading !== null}
                className={`w-full group/social relative overflow-hidden flex items-center justify-center gap-3 py-3.5 rounded-xl border font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300
                  ${socialLoading === 'google'
                    ? 'bg-white/5 border-white/20 text-white cursor-wait'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/10 hover:border-white/25 hover:text-white hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover/social:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-3">
                  {socialLoading === 'google'
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Chrome size={16} />
                  }
                  Google
                </span>
              </button>

              {/* Twitch */}
              <button
                type="button"
                onClick={() => handleSocialLogin('twitch')}
                disabled={socialLoading !== null}
                className={`w-full group/social relative overflow-hidden flex items-center justify-center gap-3 py-3.5 rounded-xl border font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300
                  ${socialLoading === 'twitch'
                    ? 'bg-[#6441a5]/10 border-[#6441a5]/30 text-[#9146FF] cursor-wait'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-[#6441a5]/15 hover:border-[#6441a5]/40 hover:text-[#9146FF] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
                  }`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#6441a5]/0 via-[#6441a5]/5 to-[#6441a5]/0 translate-x-[-100%] group-hover/social:translate-x-[100%] transition-transform duration-700" />
                <span className="relative z-10 flex items-center gap-3">
                  {socialLoading === 'twitch'
                    ? <div className="w-4 h-4 border-2 border-[#9146FF] border-t-transparent rounded-full animate-spin" />
                    : <Twitch size={16} />
                  }
                  Twitch
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-white/5 px-8 py-4 flex items-center justify-between">
            <p className="text-[9px] text-slate-600 font-mono tracking-widest uppercase">
              AES-256 // END-TO-END
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
              <span className="text-[9px] text-slate-600 font-bold tracking-widest uppercase">
                Secure
              </span>
            </div>
          </div>
        </div>

        {/* Bottom brand */}
        <div className="mt-8 flex flex-col items-center gap-3 opacity-40 hover:opacity-70 transition-opacity duration-500">
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="flex items-center gap-2">
            <img src="/Logo.png" alt="Logo" className="w-6 h-6 object-contain opacity-80" />
            <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-slate-500">
              Clash of Clans Elite Network
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
