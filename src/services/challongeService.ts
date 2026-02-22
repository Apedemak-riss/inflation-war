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
    // Use # to hide the Edge Function's automatic '.json' appendage from being parsed as part of the query parameter
    const endpoint = `/tournaments/${tournamentId}/matches.json?state=open&_=${timestamp}#`;
    
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

export const finalizeTournament = async (tournamentId: string) => {
    const endpoint = `/tournaments/${tournamentId}/finalize`;
    
    const { data, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'POST'
        }
    });

    if (error) {
        throw new Error(`Edge Function Error: ${error.message}`);
    }
    
    return data;
};

export const createTournament = async (data: { name: string, url: string, tournamentType: string, groupStagesEnabled: boolean }) => {
    const endpoint = '/tournaments';
    
    const params = new URLSearchParams();
    params.append('tournament[name]', data.name);
    params.append('tournament[url]', data.url);
    params.append('tournament[tournament_type]', data.tournamentType);
    params.append('tournament[group_stages_enabled]', data.groupStagesEnabled.toString());

    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'POST',
            body: params.toString()
        }
    });

    if (error) {
        // Because Supabase Client intercepts HTTP 4xx/5xx and scrubs the payload,
        // we fallback to the default error message, but realistically, the main
        // reason a creation fails is due to duplicate URLs.
        if (error.message.includes('non-2xx')) {
            throw new Error("Challonge rejected the request. The chosen URL/Subdomain is likely already taken.");
        }
        throw new Error(error.message || "Failed to initialize tournament on Challonge.");
    }
    
    // Challonge returns 422 if URL taken inside the payload (if proxied perfectly)
    if (responseData && responseData.errors) {
        throw new Error(`Challonge Validation Error: ${responseData.errors.join(', ')}`);
    }

    return responseData;
};

export const registerParticipant = async (tournamentUrl: string, rosterName: string) => {
    const endpoint = `/tournaments/${tournamentUrl}/participants`;
    
    const params = new URLSearchParams();
    params.append('participant[name]', rosterName);

    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'POST',
            body: params.toString()
        }
    });

    if (error) {
        throw new Error(error.message || "Failed to register team on Challonge.");
    }
    
    if (responseData && responseData.errors) {
        throw new Error(`Challonge Validation Error: ${responseData.errors.join(', ')}`);
    }

    return responseData?.participant?.id;
};

export const startTournament = async (tournamentUrl: string) => {
    // The edge function unconditionally appends '.json', so we omit it here
    const endpoint = `/tournaments/${tournamentUrl}/start`;

    const { data: responseData, error } = await supabase.functions.invoke('challonge-proxy', {
        body: { 
            endpoint, 
            method: 'POST'
        }
    });

    if (error) {
        throw new Error(error.message || "Failed to start tournament on Challonge.");
    }
    
    return responseData;
};
