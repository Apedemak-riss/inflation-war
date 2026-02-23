export const transformChallongeData = (
    participantsArray: any[],
    matchesArray: any[]
): { participants: any[], matches: any[] } => {
    
    // 1. Normalize Participants Array (JSON:API style)
    // v2.1: [ { id, type, attributes: { ... } } ]
    const normalizedParticipants = participantsArray.map(p => {
        if (p.attributes) return { id: p.id, ...p.attributes };
        if (p.participant) return p.participant; // Fallback for v1 purely just in case
        return p;
    });

    // 2. Normalize Matches Array (JSON:API style)
    const normalizedMatches = matchesArray.map(m => {
        if (m.attributes) return { id: m.id, ...m.attributes };
        if (m.match) return m.match; // Fallback
        return m;
    });

    // 3. Create Participant Map Strategy for faster lookups
    const participantsMap: Record<string, any> = {};
    const nameMap: Record<string, string> = {};

    normalizedParticipants.forEach(p => {
        const idStr = p.id?.toString();
        // Fallbacks for group logic
        const groupId1 = p.group_player_ids?.[0]?.toString();
        
        const finalP = {
            id: idStr,
            name: p.name || p.display_name || `Team ${idStr}`,
            ...p
        };

        if (idStr) {
            participantsMap[idStr] = finalP;
            nameMap[idStr] = finalP.name;
        }
        if (groupId1) participantsMap[groupId1] = finalP; // Map group IDs back to the main participant if available
    });

    // 4. Transform Matches for @g-loot/react-tournament-brackets
    const transformedMatches = normalizedMatches.map(raw => {
        // v2.1 scores_csv might be in an Array on Match object now, or attributes.scores_csv
        const scoreStr = raw.scores_csv || raw.score_set || '';
        
        let p1Score = undefined;
        let p2Score = undefined;

        if (scoreStr) {
            // Split "1-2, 3-1" into just the final set usually, or sum them. 
            // For simplicity, we just take the first set if it's "1-2"
            const sets = scoreStr.split(',');
            const lastSet = sets[sets.length - 1]; // Often the most relevant showing the final tally
            const scores = lastSet.split('-').map((s: string) => s.trim());
            if (scores.length === 2) {
                p1Score = scores[0];
                p2Score = scores[1];
            }
        }

        const matchInfo = {
            id: raw.id,
            name: raw.identifier || `Match ${raw.id}`,
            nextMatchId: raw.next_match_id || null, // Could be null for finals
            nextLooserMatchId: raw.loser_to_match_id || null,
            tournamentRoundText: raw.identifier ? `Round ${raw.identifier}` : `Round ${raw.round || raw.tournament_round}`,
            startTime: raw.started_at || raw.scheduled_time || raw.created_at,
            state: raw.state || 'SCHEDULED', // 'open', 'pending', 'complete'
            participants: [],
            group_id: raw.group_id,
            ...raw // Keep all raw attributes available
        };

        // Determine who is Player 1 and Player 2.
        const p1Id = raw.player1_id || raw.player_1_id;
        const p2Id = raw.player2_id || raw.player_2_id;
        
        // Helper to construct participant objects for the library
        const getParticipantData = (playerId: any, score: any, winnerId: any) => {
            const idStr = playerId?.toString();
            const pInfo = idStr ? participantsMap[idStr] : null;
            const name = pInfo ? pInfo.name : idStr ? `Participant ${idStr}` : 'TBD';
            
            let isWinner = false;
            if (winnerId && playerId && winnerId === playerId) {
                isWinner = true;
            }

            return {
                id: idStr || null,
                resultText: score !== null && score !== undefined ? score : null,
                isWinner: isWinner,
                status: null, // Let the library infer
                name: name,
                picture: pInfo?.attached_participant_portrait_url || undefined,
                // Add full participant info for custom rendering
                _rawParticipant: pInfo,
                prereqMatchId: null as any // Added to suppress TS type error
            };
        };

        return {
            id: matchInfo.id,
            name: matchInfo.name,
            nextMatchId: matchInfo.nextMatchId,
            nextLooserMatchId: matchInfo.nextLooserMatchId,
            tournamentRoundText: matchInfo.tournamentRoundText,
            startTime: matchInfo.startTime,
            state: matchInfo.state,
            tournamentRound: matchInfo.tournament_round || matchInfo.round,
            participants: [
                getParticipantData(p1Id, p1Score, matchInfo.winner_id),
                getParticipantData(p2Id, p2Score, matchInfo.winner_id)
            ],
            group_id: matchInfo.group_id,
            // Store raw data for pass 2
            _rawMatch: matchInfo 
        };
    });

    // 5. Pass 2: Calculate specific next match routing where Challonge doesn't provide it clearly, or where dependencies exist
    // @g-loot relies heavily on nextMatchId to build the tree structure.
    const finalMatches = transformedMatches.map((match) => {
        // v2.1 uses prerequisite_match_ids object, v1 uses player1_prereq_match_id
        const prereqs = match._rawMatch.prerequisite_match_ids || {};
        const p1Prereq = prereqs.player_1 || match._rawMatch.player1_prereq_match_id || match._rawMatch.player_1_prereq_match_id;
        const p2Prereq = prereqs.player_2 || match._rawMatch.player2_prereq_match_id || match._rawMatch.player_2_prereq_match_id;

        // Ensure participants know their routing source
        if (match.participants[0]) match.participants[0].prereqMatchId = p1Prereq;
        if (match.participants[1]) match.participants[1].prereqMatchId = p2Prereq;

        // Back-link the nextMatchId since Challonge only natively looks backwards
        if (p1Prereq) {
            const prereqMatch = transformedMatches.find(m => m.id?.toString() === p1Prereq?.toString());
            if (prereqMatch) prereqMatch.nextMatchId = match.id;
        }
        if (p2Prereq) {
            const prereqMatch = transformedMatches.find(m => m.id?.toString() === p2Prereq?.toString());
            if (prereqMatch) prereqMatch.nextMatchId = match.id;
        }

        return match;
    });

    return {
        participants: normalizedParticipants,
        matches: finalMatches
    };
};
