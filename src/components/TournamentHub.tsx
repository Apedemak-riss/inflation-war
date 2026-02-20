import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { CustomBracket } from './CustomBracket';

export const TournamentHub: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#050b14] p-4 md:p-8 flex flex-col relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-yellow-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-8 max-w-[1600px] mx-auto w-full">
                <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 font-bold uppercase tracking-widest text-xs"
                >
                    <ArrowLeft size={16} /> MAIN MENU
                </button>
                
                <h1 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3 md:gap-4 tracking-tighter drop-shadow-2xl">
                    <div className="p-3 md:p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                        <Trophy className="text-black w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    OFFICIAL TOURNAMENT BRACKET
                </h1>
                
                <div className="w-[100px] md:w-[130px]" /> {/* Empty div for centering balance */}
            </div>

            {/* Content Container */}
            <div className="flex-1 w-full max-w-[1600px] mx-auto flex flex-col items-center justify-center relative z-10 animate-fade-in">
                
                {/* Embedded Bracket Container */}
                <div className="w-full h-[850px] rounded-2xl overflow-hidden border border-yellow-500/20 shadow-[0_0_50px_rgba(234,179,8,0.05)] relative group bg-[#0a101f] transition-all duration-500 hover:border-yellow-500/40 hover:shadow-[0_0_80px_rgba(234,179,8,0.1)]">
                    <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/5 to-transparent pointer-events-none opacity-50"></div>
                    
                    <div className="relative z-10 w-full h-full p-4">
                        <CustomBracket tournamentUrl="cocelitetest1" />
                    </div>
                </div>
                
                <div className="mt-8 text-center bg-yellow-500/5 border border-yellow-500/20 py-3 px-6 rounded-full inline-flex items-center gap-2 animate-pulse-slow">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
                    <span className="text-yellow-500/80 text-[10px] uppercase font-black tracking-[0.2em] font-mono">LIVE BRACKET UPDATE</span>
                </div>
            </div>
        </div>
    );
};
