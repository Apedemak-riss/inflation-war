import React, { useEffect, useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
// @ts-ignore
import { SingleEliminationBracket, Match, SVGViewer, createTheme } from '@g-loot/react-tournament-brackets';
import { StyleSheetManager } from 'styled-components';
import { NeonBracketMatch } from './NeonBracketMatch';
import { fetchParticipants } from '../services/challongeService'; // Wait, fetchOpenMatches fetches state=open. But for the full bracket we need ALL matches.
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
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userChallongeId, setUserChallongeId] = useState<string | null>(null);
    const [isCaptain, setIsCaptain] = useState<boolean>(false);
    const [activeMatches, setActiveMatches] = useState<Record<string, string>>({});
    
    // Phase 33: Registration Map
    const [rosterMap, setRosterMap] = useState<Record<string, string>>({});

    // Phase 39: Drag Panning State (React unmount fix)
    const containerRef = useRef<HTMLDivElement>(null);
    const dragState = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0
    });

    // Phase 41: Zoom refs (kept for future mobile pinch support)
    const svgRef = useRef<SVGSVGElement>(null);
    const zoomState = useRef(1);
    const lastPinchDistance = useRef<number | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        dragState.current = {
            isDragging: true,
            startX: e.pageX - containerRef.current.offsetLeft,
            startY: e.pageY - containerRef.current.offsetTop,
            scrollLeft: containerRef.current.scrollLeft,
            scrollTop: containerRef.current.scrollTop
        };
        containerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        dragState.current.isDragging = false;
        lastPinchDistance.current = null;
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
    };

    const handleMouseUp = () => {
        dragState.current.isDragging = false;
        lastPinchDistance.current = null;
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState.current.isDragging || !containerRef.current) return;
        e.preventDefault();
        
        const x = e.pageX - containerRef.current.offsetLeft;
        const y = e.pageY - containerRef.current.offsetTop;
        const walkX = (x - dragState.current.startX) * 1; // 1:1 pan speed mapping
        const walkY = (y - dragState.current.startY) * 1;
        
        containerRef.current.scrollLeft = dragState.current.scrollLeft - walkX;
        containerRef.current.scrollTop = dragState.current.scrollTop - walkY;
    };

    // Phase 41: Native Event Listeners for smooth scaling without React State lag
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.shiftKey) { // Only zoom if holding shift (prevents interrupting normal scrolling elsewhere if present)
                e.preventDefault();
                const delta = e.deltaY * -0.001;
                const newZoom = Math.min(Math.max(0.2, zoomState.current + delta), 3); // Bound between 20% and 300%
                zoomState.current = newZoom;
                
                if (svgRef.current) {
                    svgRef.current.style.transform = `scale(${newZoom})`;
                    svgRef.current.style.transformOrigin = '0 0';
                }
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                // Two fingers = zoom start
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                lastPinchDistance.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            } else if (e.touches.length === 1 && containerRef.current) {
                // One finger = pan start
                const t = e.touches[0];
                dragState.current = {
                    isDragging: true,
                    startX: t.clientX - containerRef.current.offsetLeft,
                    startY: t.clientY - containerRef.current.offsetTop,
                    scrollLeft: containerRef.current.scrollLeft,
                    scrollTop: containerRef.current.scrollTop
                };
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2 && lastPinchDistance.current !== null) {
                // Handle Mobile Pinch Zoom
                e.preventDefault(); // Stop screen from zooming
                const t1 = e.touches[0];
                const t2 = e.touches[1];
                const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
                
                const delta = (currentDist - lastPinchDistance.current) * 0.005;
                const newZoom = Math.min(Math.max(0.2, zoomState.current + delta), 3);
                
                zoomState.current = newZoom;
                lastPinchDistance.current = currentDist;

                if (svgRef.current) {
                    svgRef.current.style.transform = `scale(${newZoom})`;
                    svgRef.current.style.transformOrigin = '0 0';
                }
            } else if (e.touches.length === 1 && dragState.current.isDragging && containerRef.current) {
                // Handle Mobile Panning
                e.preventDefault(); // Stop vertical scroll bounce
                const t = e.touches[0];
                const x = t.clientX - containerRef.current.offsetLeft;
                const y = t.clientY - containerRef.current.offsetTop;
                const walkX = x - dragState.current.startX;
                const walkY = y - dragState.current.startY;
                
                containerRef.current.scrollLeft = dragState.current.scrollLeft - walkX;
                containerRef.current.scrollTop = dragState.current.scrollTop - walkY;
            }
        };

        const handleTouchEnd = () => {
            lastPinchDistance.current = null;
            dragState.current.isDragging = false;
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        container.addEventListener('touchmove', handleTouchMove, { passive: false });
        container.addEventListener('touchend', handleTouchEnd);
        container.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            container.removeEventListener('wheel', handleWheel);
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
            container.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, []);

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
            const timestamp = new Date().getTime();
            const endpoint = `/tournaments/${tournamentUrl}/matches.json?_=${timestamp}`;
            
            const matchesPromise = supabase.functions.invoke('challonge-proxy', {
                body: { endpoint, method: 'GET' }
            }).then(({ data, error }) => {
                if (error) throw new Error(`Edge Function Error: ${error.message}`);
                return data;
            });

            const [matchesRes, participantsData] = await Promise.all([
                matchesPromise,
                fetchParticipants(tournamentUrl)
            ]);
            
            let nameMap: Record<string, string> = {};
            
            const { data: tData } = await supabase.from('tournaments')
                .select('id')
                .eq('challonge_url', tournamentUrl)
                .single();
            
            if (tData) {
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
                    nameMap = nMap;
                }
            }

            const transformed = transformChallongeData(matchesRes, participantsData, nameMap);
            setMatches(transformed);
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
        svgBackground: 'transparent'
    });

    return (
        <div className="w-full h-full bg-[#050b14] rounded-2xl border border-white/5 shadow-2xl">
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
            <StyleSheetManager shouldForwardProp={(prop) => !['won', 'hovered', 'highlighted', 'bottomHovered', 'topHovered'].includes(prop)}>
                <BracketContext.Provider value={{ 
                    currentUserChallongeId: userChallongeId,
                    isCaptain,
                    tournamentUrl,
                    activeMatches,
                    rosterMap
                }}>
                    <SingleEliminationBracket
                        matches={matches}
                        matchComponent={NeonBracketMatch}
                        theme={theme}
                        options={{
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
                        }}
                        svgWrapper={({ children }: React.PropsWithChildren<any>) => {
                            return (
                                <div 
                                    ref={containerRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseLeave={handleMouseLeave}
                                    onMouseUp={handleMouseUp}
                                    onMouseMove={handleMouseMove}
                                    className="bracket-scroll-container w-full h-[85vh] overflow-auto bg-[#050b14] relative cursor-grab active:cursor-grabbing"
                                >
                                    {children}
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
                </BracketContext.Provider>
            </StyleSheetManager>
        </div>
    );
};
