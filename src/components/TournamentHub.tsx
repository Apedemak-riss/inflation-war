import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Plus, Calendar, DollarSign, X, Radio, Link as LinkIcon, Settings2, ShieldQuestion } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { createTournament, registerParticipant } from '../services/challongeService';

export const TournamentHub: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [profile, setProfile] = useState<any>(null);
    const [tournaments, setTournaments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Phase 30 & 31 States
    const [captainRoster, setCaptainRoster] = useState<any>(null);
    const [isRegistering, setIsRegistering] = useState<string | null>(null);
    const [registeredTournaments, setRegisteredTournaments] = useState<Set<string>>(new Set());

    // Form State
    const [formTitle, setFormTitle] = useState('');
    const [formChallongeUrl, setFormChallongeUrl] = useState('');
    const [formPrizePool, setFormPrizePool] = useState('');
    const [formPrize1st, setFormPrize1st] = useState('');
    const [formPrize2nd, setFormPrize2nd] = useState('');
    const [formPrize3rd, setFormPrize3rd] = useState('');
    const [formStatus, setFormStatus] = useState('upcoming');
    const [formRegistrationUrl, setFormRegistrationUrl] = useState('');
    
    // **NEW PHASE 29 STATES**
    const [formTournamentType, setFormTournamentType] = useState('single elimination');
    const [formGroupStages, setFormGroupStages] = useState(false);
    // Error feedback
    const [creationError, setCreationError] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchHubData = async () => {
            if (user?.id) {
                const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                setProfile(data);
                
                // Fetch roster if user is a captain
                const { data: rosterData } = await supabase.from('rosters').select('*').eq('captain_id', user.id).single();
                if (rosterData) {
                    setCaptainRoster(rosterData);
                    
                    // Fetch existing registrations for this roster
                    const { data: regs } = await supabase
                        .from('tournament_registrations')
                        .select('tournament_id')
                        .eq('roster_id', rosterData.id);
                        
                    if (regs) {
                        setRegisteredTournaments(new Set(regs.map(r => r.tournament_id)));
                    }
                }
            }
            fetchTournaments();
        };
        fetchHubData();
        
        // 🌟 Subscribe to Real-Time Tournament Updates 🌟
        const channel = supabase.channel('hub-tournaments')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tournaments' },
                () => {
                    console.log("Real-time tournament update received. Refreshing Hub...");
                    fetchTournaments(false);
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchTournaments = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            try {
                // Fetch Challonge index data to extract active match progress counts
                const { data: cData } = await supabase.functions.invoke('challonge-proxy', {
                    body: { endpoint: '/tournaments.json', method: 'GET' }
                });
                
                if (cData && Array.isArray(cData)) {
                    const mergedData = data.map(t => {
                        const ct = cData.find((item: any) => item.tournament.url === t.challonge_url)?.tournament;
                        return {
                            ...t,
                            matches_count: ct?.matches_count || 0,
                            completed_matches_count: ct?.completed_matches_count || 0
                        };
                    });
                    setTournaments(mergedData);
                } else {
                    setTournaments(data);
                }
            } catch (e) {
                console.error("Failed to sync proxy stats", e);
                setTournaments(data);
            }
        }
        if (showLoading) setLoading(false);
    };

    const handleCreateTournament = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setCreationError('');
        
        try {
            // 1. Create on Challonge first
            await createTournament({
                name: formTitle,
                url: formChallongeUrl,
                tournamentType: formTournamentType,
                groupStagesEnabled: formGroupStages
            });

            // 2. Mirror into Staging Database
            const { error: dbError } = await supabase.from('tournaments').insert([{
                title: formTitle,
                challonge_url: formChallongeUrl,
                prize_pool: formPrizePool || null,
                prize_1st: formPrize1st || null,
                prize_2nd: formPrize2nd || null,
                prize_3rd: formPrize3rd || null,
                status: formStatus,
                registration_url: formRegistrationUrl || null
            }]);

            if (dbError) throw dbError;

            // 3. Success cleanup
            setShowCreateModal(false);
            setFormTitle('');
            setFormChallongeUrl('');
            setFormPrizePool('');
            setFormPrize1st('');
            setFormPrize2nd('');
            setFormPrize3rd('');
            setFormStatus('upcoming');
            setFormRegistrationUrl('');
            setFormTournamentType('single elimination');
            setFormGroupStages(false);
            // DO NOT call fetchTournaments here; the realtime subscription handles it!
            
        } catch (error: any) {
            console.error("Tournament Creation Framework Error:", error);
            // Surface Challonge specific validation errors directly inside the Modal
            setCreationError(error.message || "Unknown proxy error.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterTeam = async (tournament: any) => {
        if (!captainRoster) return;
        setIsRegistering(tournament.id);
        
        try {
            // Phase 31: Use the 5-letter TAG instead of the full name for clean brackets
            const newParticipantId = await registerParticipant(tournament.challonge_url, captainRoster.tag);
            
            // Phase 31: Insert into the new junction table instead of overwriting the roster
            const { error: insertError } = await supabase
                .from('tournament_registrations')
                .insert([{ 
                    tournament_id: tournament.id,
                    roster_id: captainRoster.id,
                    challonge_participant_id: newParticipantId.toString()
                }]);
                
            if (insertError) throw insertError;
            
            setRegisteredTournaments(prev => new Set(prev).add(tournament.id));
            alert('Team successfully registered!');
        } catch (error: any) {
            console.error("Registration Error:", error);
            alert("Failed to register team: " + error.message);
        } finally {
            setIsRegistering(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#050b14] p-4 md:p-8 flex flex-col relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-8 max-w-[1200px] mx-auto w-full">
                <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 font-bold uppercase tracking-widest text-xs"
                >
                    <ArrowLeft size={16} /> MAIN MENU
                </button>
                
                <h1 className="text-2xl md:text-4xl font-black text-white flex items-center gap-3 md:gap-4 tracking-tighter drop-shadow-2xl">
                    <div className="p-3 md:p-4 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                        <Trophy className="text-white w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    TOURNAMENT ARCHIVES
                </h1>
                
                <div className="w-[100px] md:w-[130px]" /> {/* Spacer */}
            </div>

            {/* Content Container */}
            <div className="flex-1 w-full max-w-[1200px] mx-auto relative z-10 animate-fade-in flex flex-col items-center">
                
                {/* Moderator Controls */}
                {profile?.role === 'moderator' && (
                    <div className="w-full flex justify-center mb-10">
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(192,38,211,0.4)] hover:shadow-[0_0_40px_rgba(192,38,211,0.6)] transition-all hover:scale-105 active:scale-95"
                        >
                            <Plus size={20} />
                            INITIALIZE NEW TOURNAMENT
                        </button>
                    </div>
                )}

                {/* Grid */}
                {loading ? (
                    <div className="text-slate-400 animate-pulse font-mono tracking-widest mt-20">DECRYPTING ARCHIVES...</div>
                ) : tournaments.length === 0 ? (
                    <div className="text-slate-500 font-mono tracking-widest mt-20 border border-slate-800 bg-slate-900/50 p-8 rounded-2xl">NO TOURNAMENTS FOUND IN DATABANKS</div>
                ) : (
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {tournaments.map((t) => {
                            const isLive = t.status === 'active';
                            const isCompleted = t.status === 'completed';
                            const isUpcoming = t.status === 'upcoming';
                            
                            // Card Styling Dynamics
                            let cardStyle = "border-slate-800 bg-slate-900/40 hover:border-slate-700";
                            if (isLive) cardStyle = "border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] bg-[#0a1020] hover:border-blue-400 hover:shadow-[0_0_50px_rgba(59,130,246,0.3)]";
                            if (isCompleted) cardStyle = "border-yellow-600/40 bg-[#141005] hover:border-yellow-500/60";
                            
                            // Winner Parsing
                            let winnerName = null;
                            if (isCompleted && t.winner_snapshot) {
                                try {
                                    const snap = typeof t.winner_snapshot === 'string' ? JSON.parse(t.winner_snapshot) : t.winner_snapshot;
                                    if (snap?.roster_name) {
                                        winnerName = `${snap.roster_name} [${snap.roster_tag || ''}]`;
                                    }
                                } catch (e) { console.error('Failed to parse winner snapshot', e); }
                            }

                            return (
                                <div 
                                    key={t.id} 
                                    onClick={() => navigate(`/tournament/${t.challonge_url}`)}
                                    className={`relative cursor-pointer transition-all duration-300 rounded-2xl p-6 border flex flex-col min-h-[220px] group hover:scale-[1.02] ${cardStyle}`}
                                >
                                    {/* LIVE Badge */}
                                    {isLive && (
                                        <div className="absolute -top-3 -right-3 flex items-center gap-2 bg-red-950/90 border border-red-500/50 rounded-full px-3 py-1 shadow-[0_0_20px_rgba(239,68,68,0.4)] z-20">
                                            <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                                            <div className="w-2 h-2 rounded-full bg-red-500 absolute"></div>
                                            <span className="text-red-400 font-black text-[10px] tracking-widest pl-1">LIVE</span>
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        <h3 className={`text-xl font-black mb-3 pr-8 ${isLive ? 'text-blue-100' : isCompleted ? 'text-yellow-100' : 'text-slate-300'}`}>
                                            {t.title}
                                        </h3>
                                        
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                                <Calendar size={14} className={isLive ? 'text-blue-400' : ''} />
                                                <span>{new Date(t.start_date).toLocaleDateString()}</span>
                                            </div>
                                            
                                            {t.prize_pool && (
                                                <div className="flex items-center gap-2 text-emerald-400/80 text-sm font-bold">
                                                    <DollarSign size={14} />
                                                    <span>{t.prize_pool}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tournament Progress Bar */}
                                    {t.matches_count > 0 && (
                                        <div className="w-full mt-4">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progress</span>
                                                <span className="text-[10px] font-bold text-cyan-400">
                                                    {Math.round((t.completed_matches_count / t.matches_count) * 100) || 0}% Complete
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                                                    style={{ width: `${(t.completed_matches_count / t.matches_count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom Section */}
                                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                        {isCompleted ? (
                                            <div className="flex items-center gap-2 w-full">
                                                <div className="p-1.5 bg-yellow-500/10 rounded-lg">
                                                    <Trophy size={16} className="text-yellow-500" />
                                                </div>
                                                <span className="text-yellow-500/90 font-bold text-sm truncate uppercase tracking-wide">
                                                    {winnerName || 'CONCLUDED'}
                                                </span>
                                            </div>
                                        ) : isUpcoming ? (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-slate-500 font-bold text-sm tracking-widest uppercase">UPCOMING</span>
                                                <div className="flex items-center gap-2">
                                                    {captainRoster && (
                                                        registeredTournaments.has(t.id) ? (
                                                            <div className="text-xs bg-black/40 border border-fuchsia-500/30 text-fuchsia-400 px-4 py-2 rounded-lg font-bold tracking-wider flex items-center gap-2 uppercase">
                                                                <Trophy size={14} className="text-fuchsia-500" /> REGISTERED
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleRegisterTeam(t); }}
                                                                disabled={isRegistering === t.id}
                                                                className="text-xs bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-lg font-bold tracking-wider transition-colors shadow-[0_0_15px_rgba(192,38,211,0.4)] disabled:opacity-50 flex items-center gap-2 uppercase"
                                                            >
                                                                {isRegistering === t.id ? (
                                                                    <><div className="w-3 h-3 border-2 border-white rounded-full animate-spin border-t-transparent" /> REGISTERING...</>
                                                                ) : 'REGISTER MY TEAM'}
                                                            </button>
                                                        )
                                                    )}
                                                    {t.registration_url && (
                                                        <a 
                                                            href={t.registration_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-xs bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-bold tracking-wider transition-colors"
                                                        >
                                                            INFO
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full flex justify-end">
                                                <button className="text-blue-400 font-black text-xs tracking-widest uppercase flex items-center gap-1 group-hover:text-blue-300">
                                                    ENTER BRACKET &rarr;
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Tournament Glassmorphism Modal */}
            {profile?.role === 'moderator' && showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
                    <div className="relative bg-[#0a101f] border border-fuchsia-500/30 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(192,38,211,0.15)] flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
                        
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h2 className="text-xl font-black text-white flex items-center gap-2 tracking-widest">
                                <Plus className="text-fuchsia-400" /> NEW TOURNAMENT
                            </h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="create-tournament-form" onSubmit={handleCreateTournament} className="flex flex-col gap-5">
                                <div>
                                    <label className="block text-slate-400 text-xs font-bold tracking-widest mb-2">TOURNAMENT TITLE <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="e.g. Season 1: Winter Clash"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500/50 focus:bg-fuchsia-500/5 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold tracking-widest mb-2 flex items-center gap-1">
                                        <LinkIcon size={12} /> CHALLONGE URL (SUBDOMAIN) <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        required
                                        value={formChallongeUrl}
                                        onChange={(e) => setFormChallongeUrl(e.target.value)}
                                        placeholder="e.g. cocelitetest1"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-fuchsia-500/50 focus:bg-fuchsia-500/5 transition-colors"
                                    />
                                    <p className="text-slate-500 text-[10px] mt-1 italic">The alphanumeric ID at the end of the Challonge URL.</p>
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold tracking-widest mb-2 flex items-center gap-1">
                                        <DollarSign size={12} /> TOTAL PRIZE POOL (OPTIONAL)
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formPrizePool}
                                        onChange={(e) => setFormPrizePool(e.target.value)}
                                        placeholder="e.g. $500 + Exclusive Roles"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-colors mb-3"
                                    />
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold tracking-widest mb-1 text-center">1ST PLACE</label>
                                            <input type="text" value={formPrize1st} onChange={(e) => setFormPrize1st(e.target.value)} placeholder="e.g. $300" className="w-full bg-black/50 border border-yellow-500/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/80 text-center transition-colors focus:bg-yellow-500/5" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold tracking-widest mb-1 text-center">2ND PLACE</label>
                                            <input type="text" value={formPrize2nd} onChange={(e) => setFormPrize2nd(e.target.value)} placeholder="e.g. $150" className="w-full bg-black/50 border border-slate-400/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-slate-400/80 text-center transition-colors focus:bg-slate-400/5" />
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold tracking-widest mb-1 text-center">3RD PLACE</label>
                                            <input type="text" value={formPrize3rd} onChange={(e) => setFormPrize3rd(e.target.value)} placeholder="e.g. $50" className="w-full bg-black/50 border border-amber-700/30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-700/80 text-center transition-colors focus:bg-amber-700/5" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold tracking-widest mb-2">REGISTRATION Link (OPTIONAL)</label>
                                    <input 
                                        type="url" 
                                        value={formRegistrationUrl}
                                        onChange={(e) => setFormRegistrationUrl(e.target.value)}
                                        placeholder="https://forms.gle/..."
                                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-400 text-xs font-bold tracking-widest mb-3">INITIAL STATUS</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormStatus('upcoming')}
                                            className={`py-3 px-2 rounded-xl text-xs font-black tracking-wider uppercase border transition-all flex flex-col items-center gap-1 ${formStatus === 'upcoming' ? 'bg-slate-800 border-slate-500 text-white' : 'bg-black/30 border-white/5 text-slate-500 hover:bg-white/5'}`}
                                        >
                                            <Radio size={14} className={formStatus === 'upcoming' ? 'text-slate-300' : ''} />
                                            UPCOMING
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormStatus('active')}
                                            className={`py-3 px-2 rounded-xl text-xs font-black tracking-wider uppercase border transition-all flex flex-col items-center gap-1 ${formStatus === 'active' ? 'bg-blue-900/30 border-blue-500/50 text-blue-100 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-black/30 border-white/5 text-slate-500 hover:bg-white/5'}`}
                                        >
                                            <Radio size={14} className={formStatus === 'active' ? 'text-blue-400' : ''} />
                                            ACTIVE
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormStatus('completed')}
                                            className={`py-3 px-2 rounded-xl text-xs font-black tracking-wider uppercase border transition-all flex flex-col items-center gap-1 ${formStatus === 'completed' ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/30 border-white/5 text-slate-500 hover:bg-white/5'}`}
                                        >
                                            <Trophy size={14} className={formStatus === 'completed' ? 'text-yellow-500' : ''} />
                                            COMPLETED
                                        </button>
                                    </div>
                                </div>

                                {/* 29: Format Controls */}
                                <div className="pt-4 border-t border-white/5 space-y-4">
                                    <div>
                                        <label className="block text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-2"><Settings2 size={14}/> Bracket Format</label>
                                        <select 
                                            value={formTournamentType}
                                            onChange={e => setFormTournamentType(e.target.value)}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-fuchsia-500 outline-none appearance-none"
                                        >
                                            <option value="single elimination">Single Elimination</option>
                                            <option value="double elimination">Double Elimination</option>
                                            <option value="round robin">Round Robin</option>
                                            <option value="swiss">Swiss System</option>
                                        </select>
                                    </div>

                                    <label className="flex items-center gap-3 bg-black/40 border border-white/5 p-4 rounded-xl cursor-pointer hover:border-fuchsia-500/30 transition-colors">
                                        <div className="relative flex items-center">
                                            <input 
                                                type="checkbox" 
                                                checked={formGroupStages}
                                                onChange={e => setFormGroupStages(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-5 h-5 border-2 border-slate-600 rounded bg-black peer-checked:bg-fuchsia-500 peer-checked:border-fuchsia-500 transition-colors"></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-sm tracking-widest">ENABLE GROUP STAGES</span>
                                            <span className="text-slate-500 text-xs">A two-stage tournament: Groups into Bracket</span>
                                        </div>
                                    </label>
                                </div>

                                {creationError && (
                                    <div className="mt-4 bg-red-950/40 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                                        <ShieldQuestion className="text-red-500 shrink-0 mt-0.5" size={16} />
                                        <div className="text-red-200 text-sm font-mono">{creationError}</div>
                                    </div>
                                )}
                            </form>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-4">
                            <button 
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-3 text-slate-400 font-bold text-sm tracking-widest hover:text-white transition-colors"
                            >
                                CANCEL
                            </button>
                            <button 
                                type="submit"
                                form="create-tournament-form"
                                disabled={isSubmitting || !formTitle.trim() || !formChallongeUrl.trim()}
                                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-8 py-3 rounded-xl font-black tracking-widest text-sm shadow-[0_0_20px_rgba(192,38,211,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-fuchsia-600 flex items-center gap-2"
                            >
                                {isSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> INITIALIZING</> : 'INITIALIZE'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
