import React, { useContext, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { BracketContext } from '../contexts/BracketContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const MatchContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 40px;
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 35px rgba(239, 68, 68, 0.8), inset 0 0 20px rgba(234, 179, 8, 0.5); border-color: rgba(234, 179, 8, 0.8); }
  100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4); }
`;

const blink = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
`;

const LiveDot = styled.div`
  width: 8px;
  height: 8px;
  background-color: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 8px #ef4444;
  animation: ${blink} 1.5s infinite;
`;

const MatchWrapper = styled.div<{ $isLive?: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100px;
  background: rgba(10, 16, 31, 0.85); /* Darker glassmorphism */
  backdrop-filter: blur(8px);
  border: 1px solid ${props => props.$isLive ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.2)'};
  border-radius: 12px;
  box-shadow: ${props => props.$isLive ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(234, 179, 8, 0.02)'};
  animation: ${props => props.$isLive ? css`${pulseGlow} 2s infinite ease-in-out` : 'none'};
  font-family: 'Outfit', sans-serif;
  cursor: default;
  transition: all 0.2s ease-in-out;

  &:hover {
    border-color: #FBBF24; /* Tailwind yellow-500 */
    background: rgba(15, 23, 42, 0.95);
    box-shadow: 0 0 25px rgba(234, 179, 8, 0.5), inset 0 0 15px rgba(234, 179, 8, 0.2);
  }
`;

const JoinButton = styled.button`
  margin-top: 12px;
  height: 28px;
  padding: 0 24px;
  background: rgba(16, 24, 35, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.5); /* Cyan border */
  border-radius: 14px;
  color: #38bdf8;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.1em;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
  transition: all 0.2s ease;
  z-index: 10;
  white-space: nowrap;

  &:hover {
    background: rgba(56, 189, 248, 0.1);
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.6), inset 0 0 10px rgba(56, 189, 248, 0.2);
    border-color: #38bdf8;
    color: #ffffff;
    text-shadow: 0 0 8px #ffffff;
  }
`;

const WatchButton = styled.button`
  margin-top: 8px;
  height: 28px;
  padding: 0 24px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.5); /* Red border */
  border-radius: 14px;
  color: #ef4444;
  font-family: 'Outfit', sans-serif;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.1em;
  cursor: pointer;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.2);
  transition: all 0.2s ease;
  z-index: 10;
  white-space: nowrap;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6), inset 0 0 10px rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
    color: #ffffff;
    text-shadow: 0 0 8px #ffffff;
  }
`;

const TeamRow = styled.div<{ $isWinner?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 50%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);

  &:last-child {
    border-bottom: none;
  }
  
  background: ${props => props.$isWinner ? 'linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, transparent 100%)' : 'transparent'};
`;

const TeamName = styled.div<{ $isWinner?: boolean }>`
  font-size: 17px;
  font-weight: ${props => props.$isWinner ? '800' : '500'};
  color: ${props => props.$isWinner ? '#FFFFFF' : '#64748B'}; /* Slate 500 */
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  text-shadow: ${props => props.$isWinner ? '0 0 10px rgba(255,255,255,0.3)' : 'none'};
`;

const Score = styled.div<{ $isWinner?: boolean }>`
  font-size: 20px;
  font-weight: 900;
  color: ${props => props.$isWinner ? '#FBBF24' : '#64748B'}; /* Yellow 500 */
  margin-left: 16px;
  min-width: 28px;
  text-align: right;
  text-shadow: ${props => props.$isWinner ? '0 0 15px rgba(234, 179, 8, 0.6)' : 'none'};
`;

interface Party {
    id: string;
    name?: string;
    isWinner?: boolean;
    resultText?: string;
    status?: string;
}

interface NeonBracketMatchProps {
    match: any;
    onMatchClick?: (opt: { match: any }) => void;
    topParty: Party;
    bottomParty: Party;
}

export const NeonBracketMatch: React.FC<NeonBracketMatchProps> = ({
    match,
    onMatchClick,
    topParty,
    bottomParty
}) => {
    // Current user's roster ID injected via Context from CustomBracket.tsx
    const { currentUserChallongeId, activeMatches } = useContext(BracketContext);
    const navigate = useNavigate();
    const [isJoining, setIsJoining] = useState(false);

    // Live match lookup
    const liveLobbyCode = activeMatches ? activeMatches[match.id] : undefined;
    const isLive = !!liveLobbyCode;

    console.log('Match:', match.id, 'User:', currentUserChallongeId, 'Top:', topParty?.id, 'Bottom:', bottomParty?.id);

    // Ensure status matching logic is safe. Transform maps 'open' -> SCHEDULED.
    const isOpen = match.state === 'SCHEDULED' || match.state === 'open';
    const isPlayerInMatch = currentUserChallongeId && (
        String(topParty?.id) === String(currentUserChallongeId) || 
        String(bottomParty?.id) === String(currentUserChallongeId)
    );
    
    const showJoinButton = isOpen && isPlayerInMatch;

    const handleJoinClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isJoining) return;

        setIsJoining(true);
        try {
            const { data: lobbyCode, error } = await supabase.rpc('join_official_match', {
                p_match_id: String(match.id),
                p_team_a_challonge_id: String(topParty?.id || ''),
                p_team_b_challonge_id: String(bottomParty?.id || '')
            });

            if (error) {
                console.error('Error creating/joining lobby:', error);
                alert('Failed to join lobby: ' + error.message);
                setIsJoining(false);
                return;
            } 
            
            if (lobbyCode) {
                navigate(`/join/${lobbyCode}`);
            }
        } catch (err: any) {
            console.error('Unexpected error joining lobby:', err);
            alert('Failed to join lobby: ' + err.message);
            setIsJoining(false);
        }
    };

    return (
        <MatchContainer>
            <MatchWrapper onClick={() => onMatchClick && onMatchClick({ match })} $isLive={isLive}>
                {isLive && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(5, 11, 20, 0.95)', padding: '2px 10px', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.5)', zIndex: 5, boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
                        <LiveDot />
                        <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: 900, letterSpacing: '0.15em' }}>LIVE</span>
                    </div>
                )}
                <TeamRow $isWinner={topParty?.isWinner}>
                    <TeamName $isWinner={topParty?.isWinner}>{topParty?.name || 'TBD'}</TeamName>
                    <Score $isWinner={topParty?.isWinner}>{topParty?.resultText ?? '-'}</Score>
                </TeamRow>
                <TeamRow $isWinner={bottomParty?.isWinner}>
                    <TeamName $isWinner={bottomParty?.isWinner}>{bottomParty?.name || 'TBD'}</TeamName>
                    <Score $isWinner={bottomParty?.isWinner}>{bottomParty?.resultText ?? '-'}</Score>
                </TeamRow>
            </MatchWrapper>
            
            {showJoinButton && (
                <JoinButton onClick={handleJoinClick} disabled={isJoining} style={{ opacity: isJoining ? 0.5 : 1 }}>
                    {isJoining ? 'ENTERING...' : 'ENTER LOBBY'}
                </JoinButton>
            )}

            {isLive && (
                <WatchButton onClick={(e) => { e.stopPropagation(); navigate(`/stream/${liveLobbyCode}`); }}>
                    [ WATCH ]
                </WatchButton>
            )}
        </MatchContainer>
    );
};
