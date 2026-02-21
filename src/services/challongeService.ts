const API_KEY = (import.meta.env.VITE_CHALLONGE_API_KEY || '').replace(/['"]/g, '').trim();

// We use corsproxy.io to bypass browser CORS blocks for the API
const buildUrl = (endpoint: string) => `https://corsproxy.io/?${encodeURIComponent(`https://api.challonge.com/v1${endpoint}.json?api_key=${API_KEY}`)}`;

export const fetchParticipants = async (tournamentId: string) => {
    if (!API_KEY) {
        throw new Error("Missing VITE_CHALLONGE_API_KEY in environment variables.");
    }
    
    const url = buildUrl(`/tournaments/${tournamentId}/participants`);
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    return await response.json();
};

export const fetchOpenMatches = async (tournamentId: string) => {
    if (!API_KEY) {
        throw new Error("Missing VITE_CHALLONGE_API_KEY in environment variables.");
    }

    // Fetch open matches and append timestamp to circumvent corsproxy / browser caching
    const timestamp = new Date().getTime();
    const url = `https://corsproxy.io/?${encodeURIComponent(`https://api.challonge.com/v1/tournaments/${tournamentId}/matches.json?api_key=${API_KEY}&state=open&_=${timestamp}`)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }
    return await response.json();
};

export const reportMatchScore = async (tournamentId: string, matchId: string, winnerId: string, scoresCsv: string) => {
    if (!API_KEY) {
        throw new Error("Missing VITE_CHALLONGE_API_KEY in environment variables.");
    }

    const url = `https://corsproxy.io/?${encodeURIComponent(`https://api.challonge.com/v1/tournaments/${tournamentId}/matches/${matchId}.json?api_key=${API_KEY}`)}`;
    
    // Challonge requires 'match[scores_csv]' and 'match[winner_id]'
    const params = new URLSearchParams();
    params.append('match[scores_csv]', scoresCsv);
    params.append('match[winner_id]', winnerId);

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Challonge API Error Updating Match: ${response.statusText} - ${errText}`);
    }
    
    return await response.json();
};
