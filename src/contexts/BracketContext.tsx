import { createContext } from 'react';

export interface BracketContextType {
    currentUserChallongeId: string | null;
    tournamentUrl: string | null;
    activeMatches: Record<string, string>;
}

export const BracketContext = createContext<BracketContextType>({
    currentUserChallongeId: null,
    tournamentUrl: null,
    activeMatches: {}
});
