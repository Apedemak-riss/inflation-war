import React, { useContext } from 'react';
import styled from 'styled-components';
import { BracketUserContext } from './CustomBracket';

const MatchContainer = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const MatchWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100px;
  background: rgba(10, 16, 31, 0.85); /* Darker glassmorphism */
  backdrop-filter: blur(8px);
  border: 1px solid rgba(234, 179, 8, 0.2); /* Subtle Gold border */
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(234, 179, 8, 0.02);
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
  position: absolute;
  bottom: -36px;
  left: 50%;
  transform: translateX(-50%);
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
    const currentUserRosterId = useContext(BracketUserContext);

    // Ensure status matching logic is safe. Transform maps 'open' -> SCHEDULED.
    const isOpen = match.state === 'SCHEDULED' || match.state === 'open';
    const isPlayerInMatch = currentUserRosterId && (topParty?.id === currentUserRosterId || bottomParty?.id === currentUserRosterId);
    
    const showJoinButton = isOpen && isPlayerInMatch;

    return (
        <MatchContainer>
            <MatchWrapper onClick={() => onMatchClick && onMatchClick({ match })}>
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
                <JoinButton onClick={(e) => {
                    e.stopPropagation();
                    console.log('Initiating JIT Lobby creation for match:', match.id);
                }}>
                    ENTER LOBBY
                </JoinButton>
            )}
        </MatchContainer>
    );
};
