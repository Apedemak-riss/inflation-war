import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Shield, Users, Crown, UserPlus, LogOut, Trash2, Copy, Check, X, Lock, Unlock, ArrowRightLeft, UserMinus, AlertTriangle, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { confirmToast } from '../utils/confirmToast';

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

    // Substitution States
    const [subSwapSource, setSubSwapSource] = useState<string | null>(null); // user_id of the player being swapped out

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
                        toast.error('You have been removed from the team.');
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
                        toast.error('Your team has been disbanded.');
                        setMyTeam(null);
                        setTeamMembers([]);
                    }
                }
            )
            // 3. Listen for roster lock/unlock changes
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'rosters',
                    filter: `id=eq.${myTeam.id}`
                },
                (payload) => {
                    setMyTeam((prev: any) => ({ ...prev, ...payload.new }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [myTeam?.id, user?.id, navigate]);

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

    const handleCreateTeam = async () => {
        if (!createName || !createTag) { toast.error('Name and Tag required.'); return; }
        if (createTag.length > 5) { toast.error('Tag too long (max 5 chars).'); return; }

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
                if (rosterError.code === '23505' || rosterError.message?.includes('unique constraint')) {
                    if (rosterError.message?.includes('rosters_tag_key') || rosterError.details?.includes('tag')) {
                        toast.error(`Unit Tag "${createTag}" is already claiming territory. Choose a unique identifier.`);
                    } else if (rosterError.message?.includes('rosters_name_key') || rosterError.details?.includes('name')) {
                        toast.error(`Unit Name "${createName}" is already registered. Choose a unique designation.`);
                    } else {
                        toast.error('Unit Identity conflict. Name or Tag is already in use.');
                    }
                    setLoading(false);
                    return;
                }
                throw rosterError;
            }

            // 2. Add Self as Member (role defaults to 'player')
            const { error: memberError } = await supabase
                .from('roster_members')
                .insert({
                    roster_id: roster.id,
                    user_id: user.id
                });
            
            if (memberError) throw memberError;

            // Success
            await fetchTeamMembers(roster.id);
            setMyTeam(roster);
        } catch (err: any) {
            toast.error('Command Failure: ' + (err.message || 'Unknown Error'));
        } finally {
            setLoading(false);
        }
    };

    const handleJoinTeam = async () => {
        if (!joinCode) { toast.error('Invite code required.'); return; }

        try {
            setLoading(true);
            // Use server-side RPC that auto-assigns role (player if < 3, sub if < 2, full otherwise)
            const { data, error } = await supabase.rpc('join_roster_secure', { p_invite_code: joinCode });

            if (error) throw error;

            const assignedRole = data?.role || 'player';
            if (assignedRole === 'sub') {
                toast.success('Joined as a substitute! The roster already has 3 active players.');
            } else {
                toast.success('Joined as an active player!');
            }

            // Refresh
            checkTeamStatus();
        } catch (err: any) {
            toast.error('Error joining team: ' + err.message);
            setLoading(false);
        }
    };

    const handleLeaveTeam = async () => {
        if (myTeam?.is_locked) {
            toast.error('Roster is locked for a tournament. You cannot leave.');
            return;
        }
        if (!(await confirmToast('Are you sure you want to leave this team?'))) return;
        try {
            const { error } = await supabase
                .from('roster_members')
                .delete()
                .eq('user_id', user.id);
            if (error) throw error;
            setMyTeam(null);
            setTeamMembers([]);
        } catch (err: any) {
            toast.error('Error leaving team: ' + err.message);
        }
    };

    const handleKickMember = async (targetUserId: string) => {
        if (myTeam?.is_locked) {
            toast.error('Roster is locked for a tournament. Use substitution instead.');
            return;
        }
        if (!(await confirmToast('Kick this operative?'))) return;
        try {
            const { error } = await supabase
                .from('roster_members')
                .delete()
                .eq('user_id', targetUserId)
                .eq('roster_id', myTeam.id); 
            if (error) throw error;
        } catch (err: any) {
            toast.error('Error kicking member: ' + err.message);
        }
    };

    const handleDisbandTeam = async () => {
        if (myTeam?.is_locked) {
            toast.error('Cannot disband a team during an active tournament.');
            return;
        }
        if (!(await confirmToast('WARNING: Disbanding will delete the team permanently. Continue?'))) return;
        try {
            const { error } = await supabase
                .from('rosters')
                .delete()
                .eq('id', myTeam.id);
            if (error) throw error;
            setMyTeam(null);
            setTeamMembers([]);
        } catch (err: any) {
            toast.error('Error disbanding team: ' + err.message);
        }
    };

    const copyInviteCode = () => {
        if (myTeam?.invite_code) {
            navigator.clipboard.writeText(myTeam.invite_code);
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
        }
    };

    // --- SUBSTITUTION HANDLERS ---
    const handleSubstitute = async (playerUserId: string, subUserId: string) => {
        const playerMember = teamMembers.find(m => m.user_id === playerUserId);
        const subMember = teamMembers.find(m => m.user_id === subUserId);
        const playerName = playerMember?.profiles?.username || 'Player';
        const subName = subMember?.profiles?.username || 'Sub';

        if (!(await confirmToast(`Swap ${playerName} (active) with ${subName} (sub)?`))) return;
        
        try {
            const { error } = await supabase.rpc('substitute_player', {
                p_roster_id: myTeam.id,
                p_player_user_id: playerUserId,
                p_sub_user_id: subUserId,
            });
            if (error) throw error;
            toast.success(`${subName} is now active. ${playerName} moved to subs.`);
            setSubSwapSource(null);
            fetchTeamMembers(myTeam.id);
        } catch (err: any) {
            toast.error('Substitution failed: ' + err.message);
        }
    };

    const handlePromoteSub = async (subUserId: string) => {
        const subMember = teamMembers.find(m => m.user_id === subUserId);
        const subName = subMember?.profiles?.username || 'Substitute';
        if (!(await confirmToast(`Promote ${subName} to active player?`))) return;
        try {
            const { error } = await supabase.rpc('promote_sub', {
                p_roster_id: myTeam.id,
                p_sub_user_id: subUserId,
            });
            if (error) throw error;
            toast.success(`${subName} promoted to active player!`);
            fetchTeamMembers(myTeam.id);
        } catch (err: any) {
            toast.error('Promotion failed: ' + err.message);
        }
    };

    const handleToggleLock = async () => {
        const action = myTeam.is_locked ? 'unlock' : 'lock';
        if (!(await confirmToast(`${action === 'lock' ? 'Lock' : 'Unlock'} the roster? ${action === 'lock' ? 'Members won\'t be able to join or leave.' : 'Members will be able to join and leave freely.'}`))) return;
        try {
            const { error } = await supabase.rpc(`${action}_roster`, { p_roster_id: myTeam.id });
            if (error) throw error;
            setMyTeam((prev: any) => ({ ...prev, is_locked: !prev.is_locked }));
            toast.success(`Roster ${action}ed.`);
        } catch (err: any) {
            toast.error(`Failed to ${action} roster: ` + err.message);
        }
    };

    // Derived data
    const isCaptain = myTeam?.captain_id === user?.id;
    const isLocked = myTeam?.is_locked || false;
    const players = teamMembers.filter(m => m.role === 'player');
    const subs = teamMembers.filter(m => m.role === 'sub');

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
                        
                        {/* Roster Locked Banner */}
                        {isLocked && (
                            <div className="bg-gradient-to-r from-amber-900/30 via-red-900/30 to-amber-900/30 border-b border-amber-500/20 px-6 py-3 flex items-center justify-center gap-3 animate-fade-in">
                                <Lock size={14} className="text-amber-500" />
                                <span className="text-amber-400 text-xs font-black uppercase tracking-[0.2em]">Roster Locked — Tournament Active</span>
                                <Lock size={14} className="text-amber-500" />
                            </div>
                        )}

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

                                <div className="flex flex-wrap items-center gap-4">
                                    {isCaptain && (
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

                                    {/* Lock/Unlock Toggle (Captain only) */}
                                    {isCaptain && (
                                        <button
                                            onClick={handleToggleLock}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${
                                                isLocked 
                                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/60' 
                                                    : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 border-white/10 hover:border-white/20'
                                            }`}
                                        >
                                            {isLocked ? <><Unlock size={14} /> Unlock Roster</> : <><Lock size={14} /> Lock Roster</>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Members List */}
                        <div className="p-8 md:p-12 space-y-8">
                            {/* PLAYERS SECTION */}
                            <div>
                                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Users size={16} /> Active Players ({players.length}/3)
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {players.map((member) => {
                                        const memberIsCaptain = member.user_id === myTeam.captain_id;
                                        const isMe = member.user_id === user.id;
                                        const displayName = member.profiles?.username || (isMe ? 'YOU' : `OPERATIVE`);
                                        const isSwapSource = subSwapSource === member.user_id;
                                        
                                        return (
                                            <div key={member.user_id} className={`bg-white/5 border rounded-2xl p-4 flex items-center justify-between group hover:bg-white/10 transition-all ${isSwapSource ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30' : 'border-white/5'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${memberIsCaptain ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-slate-700/50 text-slate-400'}`}>
                                                        {memberIsCaptain ? <Crown size={18} /> : <Users size={18} />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white flex items-center gap-2">
                                                            {displayName}
                                                            {memberIsCaptain && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded border border-yellow-500/20">CPT</span>}
                                                            {isMe && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded border border-blue-500/20">YOU</span>}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-600 uppercase">ID: {member.user_id.slice(0, 8)}...</div>
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-2">
                                                    {/* Swap button (captain only, only when locked and subs exist) */}
                                                    {isCaptain && isLocked && subs.length > 0 && (
                                                        <button 
                                                            onClick={() => setSubSwapSource(isSwapSource ? null : member.user_id)}
                                                            className={`p-2 rounded-lg transition-all ${isSwapSource ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                                                            title="Substitute this player"
                                                        >
                                                            <ArrowRightLeft size={16} />
                                                        </button>
                                                    )}

                                                    {/* Kick button (captain only, not locked, not self) */}
                                                    {isCaptain && !isLocked && !memberIsCaptain && (
                                                        <button 
                                                            onClick={() => handleKickMember(member.user_id)}
                                                            className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                            title="Kick Operative"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* SWAP TARGET SELECTOR (shown when subSwapSource is set) */}
                            {subSwapSource && subs.length > 0 && (
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 animate-fade-in">
                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-4">
                                        <ArrowRightLeft size={14} /> Select Substitute To Swap In
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {subs.map(sub => {
                                            const subName = sub.profiles?.username || 'Sub';
                                            return (
                                                <button
                                                    key={sub.user_id}
                                                    onClick={() => handleSubstitute(subSwapSource, sub.user_id)}
                                                    className="flex items-center gap-3 p-3 bg-black/40 border border-amber-500/20 hover:border-amber-500/60 rounded-xl transition-all hover:bg-amber-500/10 group text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                                                        <UserPlus size={14} />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{subName}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono">Swap in as active player</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => setSubSwapSource(null)} className="mt-3 text-xs text-slate-500 hover:text-white font-bold uppercase tracking-widest transition-colors">Cancel</button>
                                </div>
                            )}

                            {/* SUBS SECTION */}
                            <div className="pt-6 border-t border-white/5">
                                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <UserMinus size={16} className="text-amber-500" /> Substitutes ({subs.length}/2)
                                </h3>

                                {subs.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl bg-black/20">
                                        <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">No substitutes registered</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {subs.map((member) => {
                                            const memberIsCaptain = member.user_id === myTeam.captain_id;
                                            const isMe = member.user_id === user.id;
                                            const displayName = member.profiles?.username || (isMe ? 'YOU' : `SUBSTITUTE`);

                                            return (
                                                <div key={member.user_id} className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex items-center justify-between group hover:border-amber-500/30 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                            <UserMinus size={16} />
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white flex items-center gap-2">
                                                                {displayName}
                                                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 rounded border border-amber-500/20">SUB</span>
                                                                {memberIsCaptain && <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 rounded border border-yellow-500/20">CPT</span>}
                                                                {isMe && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 rounded border border-blue-500/20">YOU</span>}
                                                            </div>
                                                            <div className="text-[10px] font-mono text-slate-600 uppercase">ID: {member.user_id.slice(0, 8)}...</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {/* Promote sub to player (captain only, when < 3 players) */}
                                                        {isCaptain && players.length < 3 && (
                                                            <button 
                                                                onClick={() => handlePromoteSub(member.user_id)}
                                                                className="p-2 text-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                title="Promote to active player"
                                                            >
                                                                <ChevronUp size={18} />
                                                            </button>
                                                        )}
                                                        {/* Kick sub (captain only, only when NOT locked) */}
                                                        {isCaptain && !isLocked && (
                                                            <button 
                                                                onClick={() => handleKickMember(member.user_id)}
                                                                className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                title="Remove Substitute"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Info about adding subs via invite code */}
                                {subs.length < 2 && (
                                    <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                        <UserPlus size={12} className="text-slate-500" />
                                        Subs join using the same invite code — auto-assigned when roster has 3 players
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-4">
                                {isLocked && (
                                    <div className="flex items-center gap-2 text-amber-500/60 text-xs font-bold uppercase tracking-widest">
                                        <AlertTriangle size={14} /> Roster changes restricted during tournament
                                    </div>
                                )}
                                <div className="ml-auto flex gap-3">
                                    {isCaptain ? (
                                        <button 
                                            onClick={handleDisbandTeam}
                                            disabled={isLocked}
                                            className={`flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${isLocked ? 'opacity-30 cursor-not-allowed text-red-500/50' : 'hover:bg-red-500/20 text-red-500'}`}
                                        >
                                            <Trash2 size={16} /> Disband Unit
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={handleLeaveTeam}
                                            disabled={isLocked}
                                            className={`flex items-center gap-2 px-6 py-3 bg-red-500/10 border border-red-500/20 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${isLocked ? 'opacity-30 cursor-not-allowed text-red-500/50' : 'hover:bg-red-500/20 text-red-500'}`}
                                        >
                                            <LogOut size={16} /> Leave Unit
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
