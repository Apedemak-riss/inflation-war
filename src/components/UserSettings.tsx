import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, AlertTriangle, Check, Mail, Lock, Crosshair, Eye, EyeOff } from 'lucide-react';

function getAvatarUrl(seed: string) {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

export function UserSettings({ onBack }: { onBack: () => void }) {
  const { user, profile, supabase, refreshProfile } = useAuth();

  // --- Callsign ---
  const [callsign, setCallsign] = useState(profile?.username || '');
  const [callsignStatus, setCallsignStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [callsignError, setCallsignError] = useState('');

  // --- Email ---
  const [email, setEmail] = useState(user?.email || '');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  // --- Password ---
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [passwordError, setPasswordError] = useState('');

  // --- Deletion ---
  const [showDanger, setShowDanger] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState('');

  // Preview avatar updates live as callsign changes
  const avatarSeed = callsign.trim() || profile?.username || 'unknown';

  // --- Handlers ---
  const handleCallsignSave = async () => {
    const trimmed = callsign.trim();
    if (!trimmed || trimmed.length < 2) {
      setCallsignError('Callsign must be at least 2 characters.');
      setCallsignStatus('error');
      return;
    }
    if (trimmed.length > 20) {
      setCallsignError('Callsign must be 20 characters or fewer.');
      setCallsignStatus('error');
      return;
    }
    if (trimmed === profile?.username) {
      setCallsignError('That\'s already your callsign.');
      setCallsignStatus('error');
      return;
    }

    setCallsignStatus('saving');
    setCallsignError('');

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', profile!.id);

    if (error) {
      setCallsignError(error.code === '23505' ? 'Callsign already taken. Try another.' : error.message);
      setCallsignStatus('error');
    } else {
      await refreshProfile();
      setCallsignStatus('success');
      setTimeout(() => setCallsignStatus('idle'), 3000);
    }
  };

  const handleEmailSave = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError('Email cannot be empty.');
      setEmailStatus('error');
      return;
    }
    if (trimmed === user?.email) {
      setEmailError('That\'s already your email.');
      setEmailStatus('error');
      return;
    }

    setEmailStatus('saving');
    setEmailError('');

    const { error } = await supabase.auth.updateUser({ email: trimmed });

    if (error) {
      setEmailError(error.message);
      setEmailStatus('error');
    } else {
      setEmailStatus('success');
      setEmailError('');
      setTimeout(() => setEmailStatus('idle'), 5000);
    }
  };

  const handlePasswordSave = async () => {
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setPasswordStatus('error');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setPasswordStatus('error');
      return;
    }

    setPasswordStatus('saving');
    setPasswordError('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setPasswordError(error.message);
      setPasswordStatus('error');
    } else {
      setPassword('');
      setConfirmPassword('');
      setPasswordStatus('success');
      setTimeout(() => setPasswordStatus('idle'), 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'CONFIRM') return;
    
    setDeleteStatus('deleting');
    setDeleteError('');

    try {
      const { error } = await supabase.rpc('delete_own_account');
      
      if (error) throw error;
      
      // Force sign out immediately
      await supabase.auth.signOut();
      window.location.href = '/'; // Hard reload to clear all state
      
    } catch (err: any) {
      console.error('Deletion failed:', err);
      setDeleteError(err.message || 'Failed to delete account.');
      setDeleteStatus('error');
    }
  };

  const inputClasses = "w-full bg-[#050b14] border border-white/10 rounded-xl p-4 text-sm font-bold text-white placeholder:text-slate-700 outline-none transition-colors focus:border-blue-500/40";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24 md:p-4 relative overflow-x-hidden bg-[#050b14]">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay" />
      </div>

      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500" />

      <div className="relative z-10 w-full max-w-lg space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white">
              SETTINGS
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Operative Configuration</p>
          </div>
        </div>

        {/* ─── Avatar Card ─── */}
        <div className="glass rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl opacity-30 group-hover:opacity-60 blur transition-opacity" />
              <img
                src={getAvatarUrl(avatarSeed)}
                alt="Avatar"
                className="relative z-10 w-20 h-20 rounded-2xl bg-[#0a101f] border border-white/10 p-1 shadow-xl"
              />
            </div>
            <div>
              <p className="text-white text-lg font-black tracking-tight">{profile?.username || 'Unknown'}</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                {profile?.role === 'moderator' || profile?.role === 'admin' ? '⚡ Moderator' : '○ Operative'}
              </p>
              <p className="text-slate-600 text-[10px] font-mono mt-2 truncate max-w-[200px]">{user?.email}</p>
            </div>
          </div>
          <p className="text-slate-600 text-[10px] mt-4 text-center italic">
            Avatar generated from your callsign — it updates automatically.
          </p>
        </div>

        {/* ─── Callsign Section ─── */}
        <div className="glass rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Crosshair size={14} className="text-yellow-400" />
            <span className="text-xs font-black uppercase tracking-widest text-yellow-400">Callsign</span>
          </div>

          <div className="relative group/input">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-50 transition duration-500 blur" />
            <input
              type="text"
              value={callsign}
              onChange={e => setCallsign(e.target.value)}
              className={`${inputClasses} relative z-10 text-center tracking-wider focus:border-yellow-500/40`}
              placeholder="VIPER"
              maxLength={20}
            />
          </div>

          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-600 font-mono">{callsign.length}/20</span>
            {callsign.trim().length >= 2 && callsign.trim() !== profile?.username && (
              <span className="text-[10px] text-green-500 font-bold tracking-wider uppercase animate-fade-in">✓ Ready</span>
            )}
          </div>

          {callsignStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{callsignError}</p>
            </div>
          )}
          {callsignStatus === 'success' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
              <Check size={14} className="text-green-400 shrink-0" />
              <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Callsign updated!</p>
            </div>
          )}

          <button
            onClick={handleCallsignSave}
            disabled={callsignStatus === 'saving' || callsign.trim().length < 2 || callsign.trim() === profile?.username}
            className={`w-full font-black py-3 rounded-xl transition-all duration-300 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2
              ${callsignStatus === 'saving'
                ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-500/30 cursor-wait'
                : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
              }`}
          >
            {callsignStatus === 'saving' ? (
              <><div className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /> Updating...</>
            ) : (
              <><Save size={12} /> Update Callsign</>
            )}
          </button>
        </div>

        {/* ─── Email Section ─── */}
        <div className="glass rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={14} className="text-blue-400" />
            <span className="text-xs font-black uppercase tracking-widest text-blue-400">Email</span>
          </div>

          <div className="relative group/input">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-50 transition duration-500 blur" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`${inputClasses} relative z-10 focus:border-blue-500/40`}
              placeholder="operative@example.com"
            />
          </div>

          {emailStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{emailError}</p>
            </div>
          )}
          {emailStatus === 'success' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
              <Check size={14} className="text-green-400 shrink-0" />
              <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Confirmation email sent — check your inbox.</p>
            </div>
          )}

          <button
            onClick={handleEmailSave}
            disabled={emailStatus === 'saving' || !email.trim() || email.trim() === user?.email}
            className={`w-full font-black py-3 rounded-xl transition-all duration-300 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2
              ${emailStatus === 'saving'
                ? 'bg-blue-900/20 text-blue-400 border border-blue-500/30 cursor-wait'
                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
              }`}
          >
            {emailStatus === 'saving' ? (
              <><div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Sending...</>
            ) : (
              <><Mail size={12} /> Update Email</>
            )}
          </button>
        </div>

        {/* ─── Password Section ─── */}
        <div className="glass rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={14} className="text-purple-400" />
            <span className="text-xs font-black uppercase tracking-widest text-purple-400">Password</span>
          </div>

          <div className="relative group/input">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-50 transition duration-500 blur" />
            <div className="relative z-10 flex items-center bg-[#050b14] border border-white/10 rounded-xl overflow-hidden transition-colors focus-within:border-purple-500/40">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="flex-1 bg-transparent p-4 text-sm font-bold text-white placeholder:text-slate-700 outline-none"
                placeholder="New password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-4 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className={`${inputClasses} focus:border-purple-500/40`}
            placeholder="Confirm new password"
          />

          {password && confirmPassword && password === confirmPassword && (
            <p className="text-[10px] text-green-500 font-bold tracking-wider uppercase animate-fade-in px-1">✓ Passwords match</p>
          )}
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-[10px] text-red-400 font-bold tracking-wider uppercase animate-fade-in px-1">✗ Passwords don't match</p>
          )}

          {passwordStatus === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
              <AlertTriangle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{passwordError}</p>
            </div>
          )}
          {passwordStatus === 'success' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
              <Check size={14} className="text-green-400 shrink-0" />
              <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Password updated!</p>
            </div>
          )}

          <button
            onClick={handlePasswordSave}
            disabled={passwordStatus === 'saving' || password.length < 6 || password !== confirmPassword}
            className={`w-full font-black py-3 rounded-xl transition-all duration-300 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2
              ${passwordStatus === 'saving'
                ? 'bg-purple-900/20 text-purple-400 border border-purple-500/30 cursor-wait'
                : 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100'
              }`}
          >
            {passwordStatus === 'saving' ? (
              <><div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Updating...</>
            ) : (
              <><Lock size={12} /> Update Password</>
            )}
          </button>
        </div>

        {/* ─── DANGER ZONE ─── */}
        <div className={`transition-all duration-500 rounded-2xl border bg-black/40 backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.3)] space-y-4 overflow-hidden
          ${showDanger ? 'border-red-500/30 bg-red-900/5' : 'border-white/5 opacity-80 hover:opacity-100 hover:border-red-500/20'}
        `}>
          {!showDanger ? (
            <button 
              onClick={() => setShowDanger(true)}
              className="w-full flex items-center justify-between group"
            >
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-red-500">Danger Zone</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Irreversible account actions</p>
              </div>
              <span className="text-[10px] bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 font-bold uppercase tracking-widest group-hover:bg-red-500/20 transition-colors">
                Open
              </span>
            </button>
          ) : (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-red-500 font-black uppercase tracking-widest text-sm mb-1">Delete Account</h3>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-[280px]">
                    Permanently wipe your profile, callsign, and all game progress. 
                    <span className="block mt-1 text-red-400 font-bold">This action cannot be undone.</span>
                  </p>
                </div>
                <button 
                  onClick={() => setShowDanger(false)}
                  className="text-[10px] text-slate-600 hover:text-white uppercase tracking-widest font-bold"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-4 pt-2 border-t border-red-500/10">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Type <span className="text-white bg-white/10 px-1 rounded">CONFIRM</span> to proceed
                  </label>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    className="w-full bg-red-900/10 border border-red-500/20 rounded-xl p-4 text-sm font-bold text-red-500 placeholder:text-red-500/20 outline-none focus:border-red-500/50 transition-colors text-center tracking-widest"
                    placeholder="CONFIRM"
                    maxLength={7}
                    onPaste={e => e.preventDefault()}
                  />
                </div>

                {deleteStatus === 'error' && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">{deleteError}</p>
                  </div>
                )}

                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteStatus === 'deleting' || deleteConfirm !== 'CONFIRM'}
                  className={`w-full font-black py-4 rounded-xl transition-all duration-300 uppercase tracking-widest text-[11px] flex items-center justify-center gap-2
                    ${deleteConfirm === 'CONFIRM'
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]' 
                      : 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed opacity-50'
                    }
                    ${deleteStatus === 'deleting' && 'cursor-wait opacity-80'}
                  `}
                >
                  {deleteStatus === 'deleting' ? (
                    <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> DELETING ACCOUNT...</>
                  ) : (
                    <><AlertTriangle size={14} /> DELETE MY ACCOUNT</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
