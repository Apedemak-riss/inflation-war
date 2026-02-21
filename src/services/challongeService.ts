import { supabase } from '../lib/supabase';

// We use our Supabase Edge Function to securely retrieve Challonge data.
// The Edge Function implicitly holds the `CHALLONGE_API_KEY` internally via Supabase Secrets.
const buildEndpoint = (endpoint: string) => endpoint;

export const fetchParticipants = async (tournamentId: string) => {
    const endpoint = buildEndpoint(`/tournaments/${tournamentId}/participants`);
    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { endpoint, method: 'GET' }
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }
    return data;
};

export const fetchOpenMatches = async (tournamentId: string) => {
    const timestamp = new Date().getTime();
    const endpoint = `/tournaments/${tournamentId}/matches.json?state=open&_=${timestamp}`;
    
    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { endpoint, method: 'GET' }
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }
    return data;
};

export const reportMatchScore = async (tournamentId: string, matchId: string, winnerId: string, scoresCsv: string) => {
    const endpoint = `/tournaments/${tournamentId}/matches/${matchId}`;
    
    // Challonge requires 'match[scores_csv]' and 'match[winner_id]'
    const params = new URLSearchParams();
    params.append('match[scores_csv]', scoresCsv);
    params.append('match[winner_id]', winnerId);

    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'PUT',
            body: params.toString()
        }
    });

    if (error) {
        throw new Error(`Edge Function Error Updating Match: ${error.message}`);
    }
    
    return data;
};
