import { createContext } from 'react';

export interface BracketContextType {
    currentUserChallongeId: string | null;
    isCaptain: boolean;
    tournamentUrl: string | null;
    activeMatches: Record<string, string>;
}

export const BracketContext = createContext<BracketContextType>({
    currentUserChallongeId: null,
    isCaptain: false,
    tournamentUrl: null,
    activeMatches: {}
});
