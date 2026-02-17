import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Loader2 } from 'lucide-react';

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: string;
};

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  // --- State 1: Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b14] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 animate-pulse" />
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 relative z-10" />
        </div>
        <div className="text-center relative z-10">
          <p className="text-blue-400 font-black text-sm tracking-[0.3em] uppercase animate-pulse">
            ESTABLISHING UPLINK...
          </p>
          <p className="text-slate-600 text-[10px] tracking-widest uppercase mt-2 font-bold">
            Verifying Clearance Level
          </p>
        </div>
      </div>
    );
  }

  // --- State 2: Not Authenticated ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
        
        <div className="glass p-10 rounded-[2rem] text-center relative z-10 max-w-md w-full border border-red-500/20 bg-black/40 backdrop-blur-xl shadow-2xl animate-fade-in">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 blur-[40px] opacity-40 rounded-full animate-pulse" />
              <div className="relative z-10 bg-[#0a101f] p-4 rounded-2xl border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
                <Lock className="w-10 h-10 text-red-500" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-black tracking-tighter text-white mt-8 mb-2">
            ACCESS <span className="text-red-500">DENIED</span>
          </h2>
          <p className="text-red-400/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4">
            Authentication Required
          </p>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            You must be logged in to access this sector. Please authenticate via the main terminal.
          </p>
          <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
            ERR::AUTH_REQUIRED
          </div>
        </div>
      </div>
    );
  }

  // --- State 3: Wrong Role ---
  if (requiredRole && profile?.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500" />

        <div className="glass p-10 rounded-[2rem] text-center relative z-10 max-w-md w-full border border-yellow-500/20 bg-black/40 backdrop-blur-xl shadow-2xl animate-fade-in">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500 blur-[40px] opacity-40 rounded-full animate-pulse" />
              <div className="relative z-10 bg-[#0a101f] p-4 rounded-2xl border border-yellow-500/30 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
                <Shield className="w-10 h-10 text-yellow-500" strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-black tracking-tighter text-white mt-8 mb-2">
            CLEARANCE <span className="text-yellow-500">INSUFFICIENT</span>
          </h2>
          <p className="text-yellow-400/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-4">
            Role Mismatch Detected
          </p>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Your current clearance level (<span className="text-white font-bold uppercase">{profile?.role || 'unknown'}</span>) does not grant access to this sector.
          </p>
          <p className="text-slate-500 text-xs mb-8">
            Required: <span className="text-yellow-500 font-black uppercase tracking-wider">{requiredRole}</span>
          </p>
          <div className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
            ERR::CLEARANCE_LEVEL_MISMATCH
          </div>
        </div>
      </div>
    );
  }

  // --- State 4: Authorized ---
  return <>{children}</>;
}
