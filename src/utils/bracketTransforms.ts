export const transformChallongeData = (matches: any[], participants: any[]) => {
    if (!matches || !participants) return [];

    // Map participants for quick lookup by their Challonge Participant ID and Group Participant IDs
    const pMap: Record<string, any> = {};
    participants.forEach(p => {
        if (p.participant && p.participant.id) {
            const name = p.participant.name || p.participant.display_name || p.participant.username || `Participant ${p.participant.id}`;
            const pData = { id: p.participant.id.toString(), name };
            pMap[p.participant.id.toString()] = pData;
            
            if (p.participant.group_player_ids && Array.isArray(p.participant.group_player_ids)) {
                p.participant.group_player_ids.forEach((gId: number) => {
                    pMap[gId.toString()] = pData;
                });
            }
        }
    });

    // Helper to get participant info from match
    const getParticipantData = (matchInfo: any, playerId: number | null, scoreCsv: string, winnerId: number | null) => {
        const idStr = playerId?.toString();
        const pInfo = idStr ? pMap[idStr] : null;
        const name = pInfo ? pInfo.name : idStr ? `Participant ${idStr}` : 'TBD';
        
        // Determine status
        let status = 'SCHEDULED';
        if (matchInfo.state === 'complete') status = 'PLAYED';
        else if (matchInfo.state === 'open') status = 'PLAYED'; // Or maybe scheduled, but we use PLAYED to show scores if any? Let's use DONE/SCHEDULED logic.
        
        let isWinner = false;
        if (winnerId && playerId && winnerId === playerId) {
            isWinner = true;
        }
        
        return {
            id: idStr || Math.random().toString(), // fallback ID
            resultText: scoreCsv || '',
            isWinner: isWinner,
            status: matchInfo.state === 'complete' ? 'PLAYED' : 'SCHEDULED', // G-loot uses PLAYED etc. inside participant
            name: name,
        };
    };

    // Transform matches initially with no forward links
    const transformedMatches: any[] = matches.map(m => {
        const matchInfo = m.match;
        const p1Id = matchInfo.player1_id;
        const p2Id = matchInfo.player2_id;
        
        let p1Score = '';
        let p2Score = '';
        if (matchInfo.scores_csv) {
            const parts = matchInfo.scores_csv.split('-');
            if (parts.length === 2) {
                p1Score = parts[0];
                p2Score = parts[1];
            }
        }

        return {
            id: matchInfo.id.toString(),
            name: matchInfo.identifier || `Match ${matchInfo.id}`,
            nextMatchId: null, // Initialized to null, handled in pass 2
            tournamentRoundText: `Round ${matchInfo.round}`, // Will enhance below
            startTime: matchInfo.scheduled_time || matchInfo.created_at || '',
            state: matchInfo.state === 'complete' ? 'DONE' : 'SCHEDULED',
            participants: [
                getParticipantData(matchInfo, p1Id, p1Score, matchInfo.winner_id),
                getParticipantData(matchInfo, p2Id, p2Score, matchInfo.winner_id)
            ],
            // Store raw data for pass 2
            _rawMatch: matchInfo 
        };
    });

    // Pass 2: Resolve forward-links Using Prerequisite IDs
    transformedMatches.forEach(tMatch => {
        const raw = tMatch._rawMatch;
        const currId = tMatch.id;
        
        // If the current match requires player1 from a previous match, mark that previous match's nextMatchId as current
        if (raw.player1_prereq_match_id) {
            const prereqHtmlMatch1 = transformedMatches.find(m => m.id === raw.player1_prereq_match_id.toString());
            if (prereqHtmlMatch1) prereqHtmlMatch1.nextMatchId = currId;
        }

        // If the current match requires player2 from a previous match, mark that previous match's nextMatchId as current
        if (raw.player2_prereq_match_id) {
            const prereqHtmlMatch2 = transformedMatches.find(m => m.id === raw.player2_prereq_match_id.toString());
            if (prereqHtmlMatch2) prereqHtmlMatch2.nextMatchId = currId;
        }
    });

    // Pass 3: Enhance Round Text (Finals, Semi-Finals) based on max rounds
    const maxRound = Math.max(...transformedMatches.map(m => m._rawMatch.round || 0));
    transformedMatches.forEach(tMatch => {
        const r = tMatch._rawMatch.round;
        if (r === maxRound && maxRound > 0) tMatch.tournamentRoundText = "Finals";
        else if (r === maxRound - 1 && maxRound > 1) tMatch.tournamentRoundText = "Semi-Finals";
        else if (r === maxRound - 2 && maxRound > 2) tMatch.tournamentRoundText = "Quarter-Finals";
        else tMatch.tournamentRoundText = `Round ${r}`;
        
        // Final cleanup
        delete tMatch._rawMatch;
    });

    return transformedMatches;
};
