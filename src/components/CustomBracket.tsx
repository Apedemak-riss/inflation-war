import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw, LayoutList, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { SingleEliminationBracket, DoubleEliminationBracket, Match, SVGViewer, createTheme } from '@g-loot/react-tournament-brackets';
import { StyleSheetManager } from 'styled-components';
import { NeonBracketMatch } from './NeonBracketMatch';
import { fetchParticipants, fetchOpenMatches, fetchTournamentDetails } from '../services/challongeService'; 
import toast from 'react-hot-toast';
import { transformChallongeData } from '../utils/bracketTransforms';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BracketContext } from '../contexts/BracketContext';

interface CustomBracketProps {
    tournamentUrl: string;
    isModerator?: boolean;
}

export const CustomBracket: React.FC<CustomBracketProps> = ({ tournamentUrl, isModerator = false }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [matches, setMatches] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]); // Added to cache for standings
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userChallongeId, setUserChallongeId] = useState<string | null>(null);
    const [isCaptain, setIsCaptain] = useState<boolean>(false);
    const [activeMatches, setActiveMatches] = useState<Record<string, string>>({});
    const [tournamentType, setTournamentType] = useState<string>('single elimination');
    const [groupStagesEnabled, setGroupStagesEnabled] = useState(false);
    const [groupStageState, setGroupStageState] = useState<string>(''); // 'group_stages_underway', 'group_stages_finalized', etc.
    
    // Phase 33: Registration Map
    const [rosterMap, setRosterMap] = useState<Record<string, string>>({});
    // Phase 49: Participant Names Map
    const [nameMap, setNameMap] = useState<Record<string, string>>({});

    // Container ref for positioning
    const containerRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const fetchUserChallongeId = async () => {
            if (user?.id) {
                // 1. Find if the current user is a captain of a roster
                const { data: captainData, error: captainError } = await supabase
                    .from('rosters')
                    .select('id')
                    .eq('captain_id', user.id)
                    .single();
                
                if (!captainError && captainData?.id) {
                    // Note: This variable is named userChallongeId for context compatibility, but it now stores the native Roster ID
                    setUserChallongeId(captainData.id);
                    setIsCaptain(true);
                } else {
                    // 2. If not a captain, check if they are a member
                    const { data: memberData, error: memberError } = await supabase
                        .from('roster_members')
                        .select('roster_id')
                        .eq('user_id', user.id)
                        .single();
                        
                    if (!memberError && memberData?.roster_id) {
                        setUserChallongeId(memberData.roster_id);
                        setIsCaptain(false); // Can't start lobbies but can see matches
                    }
                }
            }
        };
        fetchUserChallongeId();
    }, [user]);

    useEffect(() => {
        const fetchActiveMatches = async () => {
            const { data: liveLobbies } = await supabase
                .from('lobbies')
                .select('challonge_match_id, code')
                .not('challonge_match_id', 'is', null);

            if (liveLobbies) {
                const liveMap: Record<string, string> = {};
                liveLobbies.forEach(lobby => {
                    if (lobby.challonge_match_id && lobby.code) {
                        liveMap[lobby.challonge_match_id] = lobby.code;
                    }
                });
                setActiveMatches(liveMap);
            }
        };

        fetchActiveMatches();

        // Set up real-time listener for new bracket lobbies synchronously
        const channel = supabase.channel('bracket_lobbies_events')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lobbies' },
                (payload) => {
                    console.log('Bracket realtime event:', payload);
                    const newRecord = payload.new as any;
                    if (newRecord && newRecord.challonge_match_id && newRecord.code) {
                        setActiveMatches(prev => ({
                            ...prev,
                            [newRecord.challonge_match_id]: newRecord.code
                        }));
                    }
                }
            )
            .subscribe((status) => {
                console.log('Bracket realtime status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadBracket = async () => {
        if (!tournamentUrl) return;
        setLoading(true);
        try {
            // We MUST use the v1 API for matches because v2.1 explicitly destroys all `prerequisite_match_ids` needed for tree maps.
            const matchesPromise = fetchOpenMatches(tournamentUrl);

            const [matchesRes, participantsData] = await Promise.all([
                matchesPromise,
                fetchParticipants(tournamentUrl)
            ]);
            
            setParticipants(participantsData);
            
            const { data: tData } = await supabase.from('tournaments')
                .select('id, tournament_type, group_stages_enabled')
                .eq('challonge_url', tournamentUrl)
                .single();
            
            if (tData) {
                if (tData.tournament_type) {
                    setTournamentType(tData.tournament_type.toLowerCase());
                }
                setGroupStagesEnabled(!!tData.group_stages_enabled);

                // Fetch Challonge tournament state for group stage status
                if (tData.group_stages_enabled) {
                    try {
                        const challongeDetails = await fetchTournamentDetails(tournamentUrl);
                        const state = challongeDetails?.attributes?.state || '';
                        setGroupStageState(state);
                    } catch (e) {
                        console.warn('Could not fetch tournament state from Challonge:', e);
                    }
                } else {
                    setGroupStageState('');
                }

                const { data: regs } = await supabase.from('tournament_registrations')
                    .select('challonge_participant_id, roster_id, rosters(name)')
                    .eq('tournament_id', tData.id);
                    
                if (regs) {
                    const rMap: Record<string, string> = {};
                    const nMap: Record<string, string> = {};
                    regs.forEach(r => {
                        rMap[r.challonge_participant_id] = r.roster_id;
                        const rosterData = r.rosters as any;
                        if (rosterData && rosterData.name) {
                            nMap[r.challonge_participant_id] = rosterData.name;
                        }
                    });
                    setRosterMap(rMap);
                    setNameMap(nMap);
                }
            }

            // Using the updated v2.1 transformations
            const transformed = transformChallongeData(participantsData, matchesRes);
            setMatches(transformed.matches);
            setError(null);
        } catch (err: any) {
            console.error("Bracket Load Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshBracket = async () => {
        setIsRefreshing(true);
        await loadBracket();
        setIsRefreshing(false);
    };

    useEffect(() => {
        loadBracket();
    }, [tournamentUrl]);

    if (loading) {
        return <div className="text-slate-400 animate-pulse flex items-center justify-center p-12">DECRYPTING BRACKET ARCHIVES...</div>;
    }

    if (error) {
        return <div className="text-red-500 p-8 border border-red-500/30 rounded-2xl bg-black/40">ERROR LOADING BRACKET: {error}</div>;
    }

    if (matches.length === 0) {
        return <div className="text-slate-500 p-12 text-center text-xs tracking-widest uppercase">No Bracket Data Found</div>;
    }

    // Modern Dark Theme matching Inflation War
    const theme = createTheme({
        fontFamily: '"Outfit", sans-serif',
        textColor: {
            main: '#ffffff',
            highlighted: '#ffffff',
            dark: '#94a3b8'
        },
        matchBackground: {
            wonColor: '#050b14',      // Dark background
            lostColor: '#050b14'
        },
        score: {
            background: {
                wonColor: 'rgba(34, 197, 94, 0.1)', // Green tint
                lostColor: 'rgba(239, 68, 68, 0.1)' // Red tint
            },
            text: {
                highlightedWonColor: '#22c55e',
                highlightedLostColor: '#ef4444'
            }
        },
        border: {
            color: 'rgba(255,255,255,0.05)',
            highlightedColor: 'rgba(255,255,255,0.2)'
        },
        roundHeader: {
            backgroundColor: '#0a101f',
            fontColor: '#ffffff'
        },
        connectorColor: 'rgba(255,255,255,0.1)',
        connectorColorHighlight: '#ef4444',
        svgBackground: '#050b14'
    });

    // Determine Bracket Layout Types
    const isDoubleElimination = tournamentType === 'double elimination';
    const isRoundRobin = tournamentType === 'round robin';

    const commonBracketOptions = {
        style: {
            roundHeader: { 
                backgroundColor: '#0a101f', 
                fontColor: '#FBBF24', 
                fontFamily: '"Outfit", sans-serif',
                marginBottom: 20 
            },
            connectorColor: 'rgba(255,255,255,0.1)',
            connectorColorHighlight: '#ef4444',
            width: 440,
            matchWidth: 440,
            boxHeight: 260,
            canvasPadding: 80
        }
    };

    const renderBracketOrStandings = () => {
        // ============================================
        // GROUP STAGE VIEW — Show group standings tables
        // ============================================
        if (groupStagesEnabled && groupStageState === 'group_stages_underway') {
            // Parse groups from match data — Challonge v1 includes group_id on matches
            const groupMap: Record<string, Set<string>> = {};
            const rawMatches = matches.length > 0 ? matches : [];
            
            // Build participant groups from match pairings
            // For v1 API matches, the group_id field indicates which group a match belongs to
            // For participants, group_id is on the participant object
            participants.forEach((p: any) => {
                const pid = (p.id || p.attributes?.id)?.toString();
                const groupId = p.attributes?.group_id || p.group_id || 'A';
                const gKey = `Group ${String.fromCharCode(65 + (parseInt(groupId) - 1) || 0)}`;
                if (!groupMap[gKey]) groupMap[gKey] = new Set();
                if (pid) groupMap[gKey].add(pid);
            });

            // If no groups detected, show all participants in one group
            if (Object.keys(groupMap).length === 0) {
                groupMap['Group A'] = new Set(participants.map((p: any) => (p.id || p.attributes?.id)?.toString()).filter(Boolean));
            }

            // Calculate stats per participant from matches
            const allStats: Record<string, { name: string; wins: number; losses: number; points: number; group: string }> = {};
            
            participants.forEach((p: any) => {
                const pid = (p.id || p.attributes?.id)?.toString();
                const pName = p.attributes?.name || p.name || nameMap[pid] || `Team ${pid}`;
                const groupId = p.attributes?.group_id || p.group_id || '1';
                const gKey = `Group ${String.fromCharCode(65 + (parseInt(groupId) - 1) || 0)}`;
                if (pid) {
                    allStats[pid] = { name: pName, wins: 0, losses: 0, points: 0, group: gKey };
                }
            });

            // Count wins/losses from completed matches
            rawMatches.forEach((m: any) => {
                const matchData = m.match || m;
                if (matchData.state !== 'complete') return;
                const winnerId = matchData.winner_id?.toString();
                const p1 = matchData.player1_id?.toString();
                const p2 = matchData.player2_id?.toString();
                if (winnerId && p1 && p2) {
                    const loserId = winnerId === p1 ? p2 : p1;
                    if (allStats[winnerId]) { allStats[winnerId].wins++; allStats[winnerId].points += 3; }
                    if (allStats[loserId]) { allStats[loserId].losses++; }
                }
            });

            // Organize into groups
            const groups: Record<string, typeof allStats[string][]> = {};
            Object.values(allStats).forEach(stat => {
                if (!groups[stat.group]) groups[stat.group] = [];
                groups[stat.group].push(stat);
            });

            // Sort each group by points desc, then wins desc
            Object.keys(groups).forEach(g => {
                groups[g].sort((a, b) => b.points - a.points || b.wins - a.wins);
            });

            const sortedGroupKeys = Object.keys(groups).sort();

            return (
                <div className="p-6 space-y-6">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-950/40 border border-amber-500/30 rounded-xl">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            <span className="text-amber-400 font-black text-xs tracking-[0.2em] uppercase">Group Stage in Progress</span>
                        </div>
                    </div>
                    <div className={`grid gap-6 ${sortedGroupKeys.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
                        {sortedGroupKeys.map(groupName => (
                            <div key={groupName} className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
                                <div className="px-5 py-3 bg-gradient-to-r from-fuchsia-950/40 to-transparent border-b border-white/5">
                                    <h3 className="text-white font-black tracking-[0.15em] uppercase text-sm">{groupName}</h3>
                                </div>
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="text-left px-5 py-3 font-mono">#</th>
                                            <th className="text-left px-5 py-3 font-mono">Team</th>
                                            <th className="text-center px-3 py-3 font-mono">W</th>
                                            <th className="text-center px-3 py-3 font-mono">L</th>
                                            <th className="text-center px-3 py-3 font-mono">PTS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groups[groupName].map((stat, idx) => (
                                            <tr key={stat.name} className={`border-t border-white/5 transition-colors hover:bg-white/5 ${idx < 2 ? 'bg-emerald-950/10' : ''}`}>
                                                <td className="px-5 py-3 text-slate-600 font-mono text-sm">{idx + 1}</td>
                                                <td className="px-5 py-3">
                                                    <span className="text-white font-bold text-sm tracking-wide">{stat.name}</span>
                                                </td>
                                                <td className="text-center px-3 py-3 text-emerald-400 font-mono font-bold">{stat.wins}</td>
                                                <td className="text-center px-3 py-3 text-red-400 font-mono font-bold">{stat.losses}</td>
                                                <td className="text-center px-3 py-3 text-amber-400 font-mono font-black">{stat.points}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (isRoundRobin) {
            // ============================================
            // STANDINGS ALGORITHM (For formats @g-loot doesn't support natively)
            // ============================================
            
            // 1. Calculate Stats
            const stats = participants.map(p => {
                let wins = 0;
                let losses = 0;
                let ties = 0;
                let points = 0;
                
                matches.forEach(m => {
                    if (m.state !== 'complete') return;
                    
                    const p1 = m.participants[0];
                    const p2 = m.participants[1];
                    
                    if (p1 && p1.id === p.id) {
                        if (p1.isWinner) { wins++; points += 3; }
                        else if (!p2?.isWinner && p1.resultText === p2?.resultText && p1.resultText !== null) { ties++; points += 1; }
                        else { losses++; }
                    } else if (p2 && p2.id === p.id) {
                        if (p2.isWinner) { wins++; points += 3; }
                        else if (!p1?.isWinner && p1?.resultText === p2.resultText && p2.resultText !== null) { ties++; points += 1; }
                        else { losses++; }
                    }
                });
                
                return {
                    ...p,
                    stats: { wins, losses, ties, points },
                    rank: p.final_rank || p.seed || 999 
                };
            });

            // 2. Sort Standings
            stats.sort((a, b) => {
                if (a.rank !== b.rank) return a.rank - b.rank;
                if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
                return b.stats.wins - a.stats.wins;
            });
            
            return (
                <div className="p-4 md:p-8 w-full max-w-6xl mx-auto space-y-8 md:space-y-12 min-h-[85vh] bg-[#050b14] overflow-y-auto">
                    {/* Standings Table */}
                    <div className="bg-[#0a101f] border border-white/5 shadow-2xl rounded-2xl overflow-hidden">
                        <div className="bg-gradient-to-r from-red-600/20 to-orange-500/20 px-4 py-4 md:px-8 md:py-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-3">
                                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                                <h3 className="text-sm md:text-xl font-bold font-outfit tracking-wider text-white uppercase">{tournamentType} STANDINGS</h3>
                            </div>
                            <div className="text-slate-400 text-xs md:text-sm tracking-widest font-medium uppercase">
                                Top {stats.length} Teams
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-black/40 text-slate-400 text-[10px] md:text-sm uppercase tracking-wider font-semibold border-b border-white/5">
                                        <th className="py-3 px-3 md:py-4 md:px-8 w-12 md:w-24 text-center">Rank</th>
                                        <th className="py-3 px-3 md:py-4 md:px-8">Team</th>
                                        <th className="py-3 px-3 md:py-4 md:px-8 text-center w-16 md:w-32">W-L-T</th>
                                        <th className="py-3 px-3 md:py-4 md:px-8 text-center w-14 md:w-32">Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map((team, index) => {
                                        const rosterId = rosterMap[team.id];
                                        const displayName = nameMap[team.id] || team.name || `Team ${team.id}`;
                                        const isMyTeam = userChallongeId && String(userChallongeId) === String(rosterId);
                                        
                                        return (
                                            <tr key={team.id} className={`border-b border-white/5 transition-colors ${
                                                isMyTeam ? 'bg-red-500/10 hover:bg-red-500/20' : 'hover:bg-white/5'
                                            }`}>
                                                <td className="py-3 px-3 md:py-5 md:px-8 text-center">
                                                    <div className={`inline-flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full text-xs md:text-sm font-bold ${
                                                        index === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/50' :
                                                        index === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/50' :
                                                        index === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/50' :
                                                        'bg-white/5 text-slate-400'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 md:py-5 md:px-8">
                                                    <span className={`font-semibold tracking-wide text-xs md:text-base ${isMyTeam ? 'text-red-400' : 'text-slate-200'}`}>
                                                        {displayName}
                                                    </span>
                                                    {isMyTeam && (
                                                        <span className="ml-2 md:ml-3 text-[8px] md:text-[10px] uppercase tracking-wider font-bold text-red-500 bg-red-500/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-sm border border-red-500/20">Your Team</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 md:py-5 md:px-8 text-center font-mono text-xs md:text-base text-slate-300">
                                                    {team.stats.wins}-{team.stats.losses}-{team.stats.ties}
                                                </td>
                                                <td className="py-3 px-3 md:py-5 md:px-8 text-center font-bold text-white text-sm md:text-lg">
                                                    {team.stats.points}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Chronological Matches (List instead of Bracket) */}
                    <div>
                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6 px-2">
                            <LayoutList className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
                            <h3 className="text-sm md:text-xl font-bold font-outfit tracking-wider text-white uppercase">Match Schedule</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {matches.map(match => {
                                const matchIsOpen = match.state === 'SCHEDULED' || match.state === 'open' || match.state === 'pending';
                                const topRosterId = rosterMap[match.participants[0]?.id];
                                const bottomRosterId = rosterMap[match.participants[1]?.id];
                                const isPlayerInMatch = Boolean(userChallongeId && (topRosterId === userChallongeId || bottomRosterId === userChallongeId));
                                const liveLobbyCode = activeMatches[match.id];

                                return (
                                    <div key={match.id} className="relative transform hover:scale-[1.02] transition-all duration-300">
                                        <div className="bg-black/40 border border-[#3b4b68]/50 rounded-xl p-4 shadow-lg flex flex-col justify-around gap-2 h-28 relative">
                                            {/* Top Participant */}
                                            <div className={`flex justify-between items-center px-3 py-1.5 rounded-md ${match.participants[0]?.isWinner ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-transparent'}`}>
                                                <span className={`font-semibold font-outfit truncate pr-2 ${match.participants[0]?.isWinner ? 'text-green-400' : 'text-slate-300'}`}>
                                                    {match.participants[0]?.name || 'TBD'}
                                                </span>
                                                <span className={`font-mono font-bold ${match.participants[0]?.isWinner ? 'text-green-400' : 'text-slate-500'}`}>
                                                    {match.participants[0]?.resultText || '-'}
                                                </span>
                                            </div>
                                            {/* Bottom Participant */}
                                            <div className={`flex justify-between items-center px-3 py-1.5 rounded-md ${match.participants[1]?.isWinner ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-transparent'}`}>
                                                <span className={`font-semibold font-outfit truncate pr-2 ${match.participants[1]?.isWinner ? 'text-green-400' : 'text-slate-300'}`}>
                                                    {match.participants[1]?.name || 'TBD'}
                                                </span>
                                                <span className={`font-mono font-bold ${match.participants[1]?.isWinner ? 'text-green-400' : 'text-slate-500'}`}>
                                                    {match.participants[1]?.resultText || '-'}
                                                </span>
                                            </div>
                                            {/* Match Round Label */}
                                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0a101f] border border-[#3b4b68] text-yellow-500 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                                                {match.tournamentRoundText || 'Match'}
                                            </div>

                                            {/* ACTION BUTTONS (Lobbies) */}
                                            {!liveLobbyCode && isCaptain && isPlayerInMatch && matchIsOpen && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            if (!topRosterId || !bottomRosterId) {
                                                                toast.error('Competitors have not synced via Tournament Registrations Matrix.');
                                                                return;
                                                            }
                                                            const { data: lobbyCode, error } = await supabase.rpc('create_lobby', {
                                                                p_lobby_name: `TNK-${String(match.id).slice(-4)}`,
                                                                p_team_a_roster_id: topRosterId,
                                                                p_team_b_roster_id: bottomRosterId,
                                                                p_challonge_match_id: String(match.id)
                                                            });
                                                            if (error) throw error;
                                                            if (lobbyCode) {
                                                                const codeToJoin = typeof lobbyCode === 'object' ? (lobbyCode.code || lobbyCode.id) : lobbyCode;
                                                                navigate(`/join/${codeToJoin}`);
                                                            }
                                                        } catch (err: any) {
                                                            console.error('Error creating lobby:', err);
                                                            toast.error('Failed to create lobby: ' + err.message);
                                                        }
                                                    }}
                                                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 border border-sky-500/50 text-sky-400 hover:bg-sky-500/20 hover:text-white hover:border-sky-400 text-[10px] uppercase font-bold px-4 py-1 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.2)] transition-all z-10"
                                                >
                                                    CREATE LOBBY
                                                </button>
                                            )}
                                            {liveLobbyCode && (
                                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 z-10 w-max">
                                                    {isPlayerInMatch && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/join/${liveLobbyCode}`);
                                                            }}
                                                            className="bg-red-500/10 border border-red-500/50 text-red-500 hover:bg-red-500/20 hover:text-white hover:border-red-400 text-[10px] uppercase font-bold px-4 py-1 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all"
                                                        >
                                                            JOIN LOBBY
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/stream/${liveLobbyCode}`);
                                                        }}
                                                        className="bg-purple-500/10 border border-purple-500/50 text-purple-400 hover:bg-purple-500/20 hover:text-white hover:border-purple-400 text-[10px] uppercase font-bold px-4 py-1 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.2)] transition-all"
                                                    >
                                                        WATCH
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        {/* LOBBY INDICATOR LAYERED OVER */}
                                        {liveLobbyCode && (
                                            <div className="absolute -top-3 -right-3">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-red-500 blur animate-pulse rounded-full opacity-50"></div>
                                                    <div className="relative bg-black border border-red-500/50 text-red-500 text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                                                        Live
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        if (isDoubleElimination && matches.some(m => m.tournamentRound < 0)) {
            // @g-loot Double Elimination expects an object { upper: [], lower: [] }
            // In Challonge, upper bracket matches have a positive tournamentRound, lower bracket matches have negative.
            const doubleElimMatches = {
                upper: matches.filter(m => m.tournamentRound >= 0),
                lower: matches.filter(m => m.tournamentRound < 0)
            };

            return (
                <DoubleEliminationBracket
                    matches={doubleElimMatches} 
                    matchComponent={NeonBracketMatch}
                    theme={theme}
                    options={commonBracketOptions}
                    svgWrapper={({ children, ...props }: React.PropsWithChildren<any>) => {
                        const baseW = Number(props.bracketWidth || props.width) || 10000;
                        const baseH = Number(props.bracketHeight || props.height) || 5000;
                        const finalW = Math.max(baseW + 1200, 2000);
                        const finalH = Math.max(baseH + 600, 1000);
                        const { bracketWidth, bracketHeight, width, height, ...restProps } = props;
                        
                        return (
                            <div 
                                ref={containerRef}
                                className="bracket-scroll-container w-full h-[60vh] md:h-[85vh] overflow-hidden bg-[#050b14] relative"
                            >
                                <SVGViewer 
                                    {...restProps}
                                    width={finalW} 
                                    height={finalH}
                                    bracketWidth={finalW}
                                    bracketHeight={finalH}
                                    background="#050b14"
                                    SVGBackground="#050b14"
                                    detectAutoPan={false}
                                    scaleFactorOnWheel={1.06}
                                    onPan={() => {}}
                                    onZoom={() => {}}
                                    className="transform-gpu"
                                >
                                    {children}
                                </SVGViewer>
                                {isModerator && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRefreshBracket(); }}
                                        className="absolute top-3 right-3 z-50 p-2 bg-black/60 border border-white/10 hover:border-white/30 rounded-lg text-slate-400 hover:text-white transition-all backdrop-blur-sm"
                                        title="Refresh Bracket"
                                    >
                                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                                    </button>
                                )}
                            </div>
                        );
                    }}
                />
            );
        }

        // Default Single Elimination
        // Safety check to prevent library crash if array lacks structured IDs
        if (matches.length === 0) {
            return <div className="text-slate-500 p-12 text-center text-xs tracking-widest uppercase">Single Elim Bracket Generation Pending</div>;
        }

        return (
            <SingleEliminationBracket
                matches={matches}
                matchComponent={NeonBracketMatch}
                theme={theme}
                options={commonBracketOptions}
                svgWrapper={({ children, ...props }: React.PropsWithChildren<any>) => {
                    const baseW = Number(props.bracketWidth || props.width) || 10000;
                    const baseH = Number(props.bracketHeight || props.height) || 2000;
                    const finalW = Math.max(baseW + 800, 1500);
                    const finalH = Math.max(baseH + 400, 800);
                    const { bracketWidth, bracketHeight, width, height, ...restProps } = props;

                    return (
                        <div 
                            ref={containerRef}
                            className="bracket-scroll-container w-full h-[85vh] overflow-hidden bg-[#050b14] relative"
                        >
                            <SVGViewer 
                                {...restProps}
                                width={finalW} 
                                height={finalH}
                                bracketWidth={finalW}
                                bracketHeight={finalH}
                                background="#050b14"
                                SVGBackground="#050b14"
                                detectAutoPan={false}
                                scaleFactorOnWheel={1.06}
                                onPan={() => {}}
                                onZoom={() => {}}
                                className="transform-gpu"
                            >
                                {children}
                            </SVGViewer>
                            {isModerator && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRefreshBracket(); }}
                                    className="absolute top-3 right-3 z-50 p-2 bg-black/60 border border-white/10 hover:border-white/30 rounded-lg text-slate-400 hover:text-white transition-all backdrop-blur-sm"
                                    title="Refresh Bracket"
                                >
                                    <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                                </button>
                            )}
                        </div>
                    );
                }}
            />
        );
    };

    return (
        <div className="w-full h-full bg-[#050b14] rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden">
            {/* CSS to hide scrollbars while keeping scroll functionality */}
            <style>{`
                .bracket-scroll-container {
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE/Edge */
                }
                .bracket-scroll-container::-webkit-scrollbar {
                    display: none; /* Chrome/Safari/Opera */
                }
            `}</style>
            
            {/* Action Bar Overlay */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
                {isRefreshing && (
                    <span className="text-red-500 font-mono text-xs uppercase tracking-widest animate-pulse">
                        Syncing...
                    </span>
                )}
            </div>

            <StyleSheetManager shouldForwardProp={(prop) => !['won', 'hovered', 'highlighted', 'bottomHovered', 'topHovered'].includes(prop)}>
                <BracketContext.Provider value={{ 
                    currentUserChallongeId: userChallongeId,
                    isCaptain,
                    tournamentUrl,
                    activeMatches,
                    rosterMap
                }}>
                    {renderBracketOrStandings()}
                </BracketContext.Provider>
            </StyleSheetManager>
        </div>
    );
};
