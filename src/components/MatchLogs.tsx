import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Trophy, Users, Copy, Check, X, Search } from 'lucide-react';

export const MatchLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('match_logs')
                .select('*')
                .order('played_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopyFeedback(id);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const filteredLogs = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        
        // Search in Lobby Name
        if (log.lobby_name?.toLowerCase().includes(term)) return true;
        
        // Search in Match Data (Teams and Players)
        return log.match_data?.some((team: any) => 
            team.team_name?.toLowerCase().includes(term) ||
            team.players?.some((player: any) => player.name?.toLowerCase().includes(term))
        );
    });

    return (
        <div className="min-h-screen bg-[#050b14] text-white p-6 pb-20 overflow-x-hidden relative animate-fade-in font-sans selection:bg-purple-500/30">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none fixed"></div>
            
            {/* Header */}
            <div className="max-w-7xl mx-auto relative z-10 mb-10">
                <button onClick={() => navigate('/')} className="mb-8 group flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Return to Base
                </button>
                
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-sm mb-2">
                            ARCHIVE
                        </h1>
                        <p className="text-purple-400/60 font-bold tracking-[0.2em] text-[10px] uppercase flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                            Historical Combat Data // Secure Access
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="w-full md:w-96 relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        </div>
                        <input 
                            type="text" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by player, team, or lobby..." 
                            className="w-full bg-[#0a101f] border border-white/10 focus:border-purple-500/50 rounded-xl py-3 pl-11 pr-4 text-sm font-mono text-white placeholder:text-slate-600 outline-none transition-all shadow-inner focus:shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto relative z-10">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5">
                        <p className="text-slate-500 font-mono text-sm tracking-widest uppercase">No matches found matching "{searchTerm}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLogs.map(log => (
                            <div key={log.id} onClick={() => setSelectedMatch(log)} className="glass bg-[#0a101f]/60 hover:bg-[#0a101f] border border-white/5 hover:border-purple-500/30 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-purple-900/20 text-purple-300 px-3 py-1 rounded-lg border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Trophy size={12}/> Match Log
                                    </div>
                                    <div className="text-slate-500 text-[10px] font-mono">{formatDate(log.played_at)}</div>
                                </div>
                                <div className="flex items-center gap-3 text-2xl font-black text-white mb-2 tracking-tight">
                                    {(() => {
                                        const teams = log.match_data || [];
                                        const t1 = teams[0] || {};
                                        const t2 = teams[1] || {};
                                        const s1 = parseInt(t1.score || '0', 10);
                                        const s2 = parseInt(t2.score || '0', 10);
                                        const winnerId = s1 > s2 ? t1.team_id : s2 > s1 ? t2.team_id : null;

                                        return (
                                            <>
                                                <span className={`${winnerId === t1.team_id ? 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-slate-400'} transition-colors flex items-center gap-2`}>
                                                    {winnerId === t1.team_id && <Trophy className="w-5 h-5 text-yellow-500" />}
                                                    {t1.team_name || 'UNK'} <span className="text-sm opacity-60">[{t1.score || 0}]</span>
                                                </span>
                                                <span className="text-slate-600 text-sm font-mono">VS</span>
                                                <span className={`${winnerId === t2.team_id ? 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-slate-400'} transition-colors flex items-center gap-2`}>
                                                    {t2.team_name || 'UNK'} <span className="text-sm opacity-60">[{t2.score || 0}]</span>
                                                    {winnerId === t2.team_id && <Trophy className="w-5 h-5 text-yellow-500" />}
                                                </span>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                    <Users size={12}/>
                                    {log.match_data?.reduce((sum:number, t:any) => sum + (t.players?.length || 0), 0) || 0} Operatives
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedMatch && (
                <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl animate-fade-in" onClick={() => setSelectedMatch(null)}>
                    <div className="glass border border-white/10 rounded-[2rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0a101f] relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div className="p-6 md:p-8 border-b border-white/10 flex justify-between items-center bg-[#0a101f]/95 backdrop-blur-md">
                            <div>
                                <div className="flex items-center gap-4 mb-1">
                                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">MATCH REPORT</h2>
                                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-lg font-mono text-sm font-bold">
                                        COMPLETED
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">
                                    Lobby: <span className="text-white">{selectedMatch.lobby_name}</span> // Date: {formatDate(selectedMatch.played_at)}
                                </p>
                            </div>
                            <button onClick={() => setSelectedMatch(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                                <X size={24}/>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 relative">
                           {/* Background Glows */}
                           <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                           <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none"></div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                                {selectedMatch.match_data?.map((team: any, idx: number) => {
                                    const teams = selectedMatch.match_data;
                                    const otherTeam = teams[idx === 0 ? 1 : 0];
                                    const myScore = parseInt(team.score || '0', 10);
                                    const otherScore = parseInt(otherTeam?.score || '0', 10);
                                    const isWinner = myScore > otherScore;

                                    return (
                                    <div key={idx} className={`relative rounded-3xl p-6 md:p-8 border transition-all ${isWinner ? 'bg-yellow-900/10 border-yellow-500/30 shadow-[0_0_50px_rgba(234,179,8,0.1)]' : 'bg-[#0a101f] border-white/5 opacity-80'}`}>
                                        {isWinner && (
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1 rounded-full text-[10px] font-black tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.5)] z-20 flex items-center gap-2">
                                                <Trophy size={10} className="fill-black" /> VICTORY
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/5">
                                            <h3 className={`text-3xl font-black uppercase tracking-tight flex items-center gap-3 ${isWinner ? 'text-yellow-500 drop-shadow-sm' : 'text-slate-500'}`}>
                                                {team.team_name} <span className={`text-2xl ${isWinner ? 'text-white' : 'text-slate-600'}`}>[{team.score || '-'}]</span>
                                            </h3>
                                            <div className="font-mono text-xl font-bold text-yellow-500">
                                                {team.budget}g
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {team.players?.map((p: any, pIdx: number) => (
                                                <div key={pIdx} className="bg-black/20 rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="font-bold text-lg text-slate-200">{p.name}</div>
                                                        {p.army_link && (
                                                            <button 
                                                                onClick={() => handleCopy(p.army_link, `${idx}-${pIdx}`)}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                    copyFeedback === `${idx}-${pIdx}` 
                                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                                                                }`}
                                                            >
                                                                {copyFeedback === `${idx}-${pIdx}` ? <Check size={12}/> : <Copy size={12}/>}
                                                                {copyFeedback === `${idx}-${pIdx}` ? 'COPIED' : 'COPY'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Army Summary */}
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {p.purchases?.length > 0 ? (
                                                            <>
                                                                {p.purchases.filter((i:any) => i.type === 'hero').map((i:any, k:number) => (
                                                                    <span key={k} className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase">{i.equipped_hero || i.item_name}</span>
                                                                ))}
                                                                {p.purchases.filter((i:any) => i.is_cc).length > 0 && (
                                                                    <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase">CC: {p.purchases.filter((i:any) => i.is_cc).length}</span>
                                                                )}
                                                                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono">
                                                                    {p.purchases.filter((i:any) => !i.is_cc && i.type !== 'hero').length} Units/Spells
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-600 text-[10px] italic">No detected army composition</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
