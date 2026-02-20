import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Shield, Users, Crown, UserPlus, LogOut, Trash2, Copy, Check, X } from 'lucide-react';

export const TeamHub = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [myTeam, setMyTeam] = useState<any>(null);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    
    // Form States
    const [createName, setCreateName] = useState('');
    const [createTag, setCreateTag] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [copyFeedback, setCopyFeedback] = useState(false);

    useEffect(() => {
        checkTeamStatus();
    }, []);

    // Real-time Subscriptions
    useEffect(() => {
        if (!myTeam || !user) return;

        // Initial Fetch
        fetchTeamMembers(myTeam.id);

        const channel = supabase.channel(`team_hub_${myTeam.id}`)
            // 1. Listen for Roster Changes (The Doorbell)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'roster_members',
                    filter: `roster_id=eq.${myTeam.id}`
                },
                (payload) => {
                    // Refetch the full list (with profiles) on ANY change
                    fetchTeamMembers(myTeam.id);

                    // Check if I was kicked/removed
                    if (payload.eventType === 'DELETE' && payload.old.user_id === user.id) {
                        alert('You have been removed from the team.');
                        setMyTeam(null);
                        setTeamMembers([]);
                        // Do NOT navigate away. Show "Create/Join" view.
                    }
                }
            )
            // 2. Listen for Team Disbandment
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'rosters',
                    filter: `id=eq.${myTeam.id}`
                },
                (payload) => {
                    if (payload.old.id === myTeam.id) {
                        alert('Your team has been disbanded.');
                        setMyTeam(null);
                        setTeamMembers([]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [myTeam?.id, user?.id, navigate]); // Depend on IDs, not full objects if possible, but keep simple for now

    const checkTeamStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/');
                return;
            }
            setUser(user);

            // Check if user is in a team
            const { data: memberData } = await supabase
                .from('roster_members')
                .select('*, rosters(*)')
                .eq('user_id', user.id)
                .maybeSingle();

            if (memberData && memberData.rosters) {
                setMyTeam(memberData.rosters);
                // fetchTeamMembers will be called by the realtime effect once myTeam is set
            } else {
                setMyTeam(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamMembers = async (rosterId: string) => {
        const { data } = await supabase
            .from('roster_members')
            .select('*, profiles(username, avatar_url)') 
            .eq('roster_id', rosterId);
            
        if (data) {
            setTeamMembers(data);
        }
    };
    
    // Helper to get best available name
    // Priority: Metadata Username > Metadata Callsign > Email > Default
    const getPlayerName = (u: any) => {
        return u.user_metadata?.username || u.user_metadata?.callsign || u.email?.split('@')[0] || 'Operative';
    };

    const handleCreateTeam = async () => {
        if (!createName || !createTag) return alert("Name and Tag required.");
        if (createTag.length > 5) return alert("Tag too long (max 5 chars).");

        try {
            setLoading(true);
            // 1. Create Roster
            const { data: roster, error: rosterError } = await supabase
                .from('rosters')
                .insert({
                    name: createName,
                    tag: createTag.toUpperCase(),
                    captain_id: user.id
                })
                .select()
                .single();

            if (rosterError) {
                // Check for unique violations (Postgres code 23505) OR explicitly check the message text
                if (rosterError.code === '23505' || rosterError.message?.includes('unique constraint')) {
                    if (rosterError.message?.includes('rosters_tag_key') || rosterError.details?.includes('tag')) {
                        alert(`Unit Tag "${createTag}" is already claiming territory. Request denied. Choose a unique identifier.`);
                    } else if (rosterError.message?.includes('rosters_name_key') || rosterError.details?.includes('name')) {
                        alert(`Unit Name "${createName}" is already registered in the database. Choose a unique designation.`);
                    } else {
                        alert("Unit Identity conflict. Name or Tag is already in use.");
                    }
                    setLoading(false); // Ensure loading is reset on specific errors
                    return;
                }
                throw rosterError;
            }

            // 2. Add Self as Member
            const { error: memberError } = await supabase
                .from('roster_members')
                .insert({
                    roster_id: roster.id,
                    user_id: user.id
                });
            
            if (memberError) throw memberError;

            // Success - Refetch or wait for realtime
            await fetchTeamMembers(roster.id);
            setMyTeam(roster);
        } catch (err: any) {
             // Fallback for other errors
            alert("Command Failure: " + (err.message || "Unknown Error"));
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!joinCode) return alert("Invite code required.");

        try {
            setLoading(true);
            // 1. Find Roster by Code
            const { data: roster, error: rosterError } = await supabase
                .from('rosters')
                .select('id')
                .eq('invite_code', joinCode)
                .single();

            if (rosterError || !roster) throw new Error("Invalid Invite Code");

            // 2. Join
            const { error: joinError } = await supabase
                .from('roster_members')
                .insert({
                    roster_id: roster.id,
                    user_id: user.id
                });

            if (joinError) throw joinError;

            // Refresh
            checkTeamStatus();
        } catch (err: any) {
            alert("Error joining team: " + err.message);
            setLoading(false);
        }
    };

    const handleLeaveTeam = async () => {
        if (!confirm("Are you sure you want to leave this team?")) return;
        try {
            const { error } = await supabase
                .from('roster_members')
                .delete()
                .eq('user_id', user.id);
            if (error) throw error;
            setMyTeam(null);
            setTeamMembers([]);
        } catch (err: any) {
            alert("Error leaving team: " + err.message);
        }
    };

    const handleKickMember = async (targetUserId: string) => {
        if (!confirm("Kick this operative?")) return;
        try {
            const { error } = await supabase
                .from('roster_members')
                .delete()
                .eq('user_id', targetUserId)
                .eq('roster_id', myTeam.id); 
            if (error) throw error;
            // No need to fetchTeamMembers here, real-time subscription will catch it
        } catch (err: any) {
            alert("Error kicking member: " + err.message);
        }
    };

    const handleDisbandTeam = async () => {
        if (!confirm("WARNING: Disbanding will delete the team permanent. Continue?")) return;
        try {
            const { error } = await supabase
                .from('rosters')
                .delete()
                .eq('id', myTeam.id);
            if (error) throw error;
            setMyTeam(null);
            setTeamMembers([]);
        } catch (err: any) {
            alert("Error disbanding team: " + err.message);
        }
    };

    const copyInviteCode = () => {
        if (myTeam?.invite_code) {
            navigator.clipboard.writeText(myTeam.invite_code);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-[#050b14] text-white p-6 pb-20 overflow-x-hidden relative animate-fade-in font-sans selection:bg-purple-500/30">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none fixed"></div>
            
            {/* Header */}
            <div className="max-w-7xl mx-auto relative z-10 mb-10">
                <button onClick={() => navigate('/')} className="mb-8 group flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/> Return to Base
                </button>
                
                <div className="border-b border-white/5 pb-8">
                     <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 drop-shadow-sm mb-2">
                        TEAM HUB
                    </h1>
                     <p className="text-emerald-400/60 font-bold tracking-[0.2em] text-[10px] uppercase flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        Unit Management // Persistent Identity
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : !myTeam ? (
                    // VIEW A: NO TEAM
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Team Card */}
                        <div className="glass bg-[#0a101f]/80 p-8 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-colors duration-300 group relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Shield size={120} />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                                <Crown className="text-emerald-500" /> CREATE UNIT
                            </h2>
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <label className="block text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider">Unit Name</label>
                                    <input 
                                        type="text" 
                                        value={createName}
                                        onChange={e => setCreateName(e.target.value)}
                                        placeholder="e.g. Shadow Vanguard"
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider">Tag (Max 5)</label>
                                    <input 
                                        type="text" 
                                        value={createTag}
                                        onChange={e => setCreateTag(e.target.value.toUpperCase())}
                                        placeholder="e.g. SHDW"
                                        maxLength={5}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none font-bold tracking-widest"
                                    />
                                </div>
                                <button 
                                    onClick={handleCreateTeam}
                                    className="w-full bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black border border-emerald-500/50 rounded-xl py-4 font-black uppercase tracking-widest transition-all mt-4"
                                >
                                    Initialize Unit
                                </button>
                            </div>
                        </div>

                        {/* Join Team Card */}
                        <div className="glass bg-[#0a101f]/80 p-8 rounded-3xl border border-white/5 hover:border-cyan-500/30 transition-colors duration-300 group relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Users size={120} />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                                <UserPlus className="text-cyan-500" /> JOIN UNIT
                            </h2>
                            <div className="space-y-4 relative z-10">
                                <div>
                                    <label className="block text-xs font-mono text-slate-500 mb-1 uppercase tracking-wider">Access Code</label>
                                    <input 
                                        type="text" 
                                        value={joinCode}
                                        onChange={e => setJoinCode(e.target.value)}
                                        placeholder="Enter Invite Code"
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-cyan-500 outline-none font-mono tracking-widest text-center text-lg"
                                    />
                                </div>
                                <button 
                                    onClick={handleJoinTeam}
                                    className="w-full bg-cyan-500/10 hover:bg-cyan-500 text-cyan-500 hover:text-black border border-cyan-500/50 rounded-xl py-4 font-black uppercase tracking-widest transition-all mt-4"
                                >
                                    Join Existing Unit
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // VIEW B: HAS TEAM
                    <div className="glass bg-[#0a101f]/90 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl relative">
                        {/* Team Header */}
                        <div className="bg-gradient-to-r from-emerald-900/40 via-cyan-900/40 to-[#0a101f] p-8 md:p-12 border-b border-white/10 relative">
                             <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                                <Shield size={300} />
                            </div>
                            
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 rounded-full border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Active Roster
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-2">
                                    {myTeam.name}
                                </h1>
                                <div className="text-2xl md:text-3xl font-bold text-slate-500 tracking-widest mb-8">
                                    [{myTeam.tag}]
                                </div>

                                {myTeam.captain_id === user.id && (
                                    <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10 inline-flex flex-col gap-2 max-w-sm">
                                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Invite Code</div>
                                        <button 
                                            onClick={copyInviteCode}
                                            className="flex items-center gap-4 text-xl font-mono text-cyan-400 hover:text-white transition-colors group"
                                        >
                                            <span className="tracking-[0.2em]">{myTeam.invite_code}</span>
                                            {copyFeedback ? <Check size={18} className="text-green-500"/> : <Copy size={18} className="opacity-50 group-hover:opacity-100"/>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Members List */}
                        <div className="p-8 md:p-12">
                            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Users size={16} /> Operatives ({teamMembers.length})
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {teamMembers.map((member, idx) => {
                                    const isCaptain = member.user_id === myTeam.captain_id;
                                    const isMe = member.user_id === user.id;
                                    // Use joined profile data
                                    const displayName = member.profiles?.username || (isMe ? 'YOU' : `OPERATIVE ${idx + 1}`);
                                    
                                    return (
                                        <div key={member.user_id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCaptain ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-slate-700/50 text-slate-400'}`}>
                                                    {isCaptain ? <Crown size={18} /> : <Users size={18} />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        {displayName}
                                                        {/* Placeholder for name since we lack public profile table */}
                                                        {isCaptain && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded border border-yellow-500/20">CPT</span>}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-slate-600 uppercase">ID: {member.user_id.slice(0, 8)}...</div>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            {myTeam.captain_id === user.id && !isCaptain && (
                                                <button 
                                                    onClick={() => handleKickMember(member.user_id)}
                                                    className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Kick Operative"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-4">
                                {myTeam.captain_id === user.id ? (
                                    <button 
                                        onClick={handleDisbandTeam}
                                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ml-auto"
                                    >
                                        <Trash2 size={16} /> Disband Unit
                                    </button>
                                ) : (
                                    <button 
                                        onClick={handleLeaveTeam}
                                        className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ml-auto"
                                    >
                                        <LogOut size={16} /> Leave Unit
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
