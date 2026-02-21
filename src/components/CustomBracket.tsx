import React, { useEffect, useState } from 'react';
// @ts-ignore
import { SingleEliminationBracket, Match, SVGViewer, createTheme } from '@g-loot/react-tournament-brackets';
import { StyleSheetManager } from 'styled-components';
import { NeonBracketMatch } from './NeonBracketMatch';
import { fetchParticipants } from '../services/challongeService'; // Wait, fetchOpenMatches fetches state=open. But for the full bracket we need ALL matches.
import { transformChallongeData } from '../utils/bracketTransforms';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BracketContext } from '../contexts/BracketContext';

// We need a specific fetch for ALL matches to build the bracket
// So I will expand challongeService or just fetch here
const API_KEY = import.meta.env.VITE_CHALLONGE_API_KEY || '';

interface CustomBracketProps {
    tournamentUrl: string;
}

export const CustomBracket: React.FC<CustomBracketProps> = ({ tournamentUrl }) => {
    const { user } = useAuth();
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userChallongeId, setUserChallongeId] = useState<string | null>(null);
    const [activeMatches, setActiveMatches] = useState<Record<string, string>>({});

    useEffect(() => {
        const fetchUserChallongeId = async () => {
            if (user?.id) {
                // Find if the current user is a captain of a roster
                const { data, error } = await supabase
                    .from('rosters')
                    .select('challonge_participant_id')
                    .eq('captain_id', user.id)
                    .single();
                
                if (!error && data?.challonge_participant_id) {
                    setUserChallongeId(data.challonge_participant_id.toString());
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
    }, []);

    useEffect(() => {
        const loadBracket = async () => {
            if (!tournamentUrl) return;
            setLoading(true);
            try {
                // Fetch all matches (not just open)
                const timestamp = new Date().getTime();
                const matchesUrl = `https://corsproxy.io/?${encodeURIComponent(`https://api.challonge.com/v1/tournaments/${tournamentUrl}/matches.json?api_key=${API_KEY}&_=${timestamp}`)}`;
                
                const [matchesRes, participantsData] = await Promise.all([
                    fetch(matchesUrl).then(res => res.json()),
                    fetchParticipants(tournamentUrl)
                ]);
                
                const transformed = transformChallongeData(matchesRes, participantsData);
                setMatches(transformed);
                setError(null);
            } catch (err: any) {
                console.error("Bracket Load Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

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
        <div className="w-full h-full overflow-hidden bg-[#050b14] rounded-2xl border border-white/5 shadow-2xl">
            <StyleSheetManager shouldForwardProp={(prop) => !['won', 'hovered', 'highlighted', 'bottomHovered', 'topHovered'].includes(prop)}>
                <BracketContext.Provider value={{ 
                    currentUserChallongeId: userChallongeId,
                    tournamentUrl,
                    activeMatches
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
                                connectorColorHighlight: '#ef4444', // Red glow
                                width: 440,
                                matchWidth: 440,
                                boxHeight: 180,
                                canvasPadding: 50
                            }
                        }}
                        svgWrapper={({ children, bracketWidth, bracketHeight, startAt, ...props }: React.PropsWithChildren<any>) => (
                            <div className="w-full h-[800px] overflow-auto scrollbar-thin scrollbar-thumb-yellow-500/50 scrollbar-track-transparent">
                                <svg 
                                    width={props.width || 1200} 
                                    height={props.height || 800} 
                                    viewBox={`0 0 ${props.width || 1200} ${props.height || 800}`}
                                    style={{ background: 'transparent' }}
                                    {...props}
                                >
                                    {children}
                                </svg>
                            </div>
                        )}
                    />
                </BracketContext.Provider>
            </StyleSheetManager>
        </div>
    );
};
