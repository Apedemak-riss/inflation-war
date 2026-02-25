/**
 * Transform Challonge match/participant data into the format expected by
 * @g-loot/react-tournament-brackets.
 *
 * The library needs:
 *  - For SE: Match[] where each match has `nextMatchId` pointing forward.
 *    The final match has `nextMatchId: null`.
 *  - For DE: { upper: Match[], lower: Match[] } where upper matches also
 *    carry `nextLooserMatchId` pointing to the lower bracket match the
 *    loser drops into. Lower matches have `nextLooserMatchId: null`.
 *
 * Challonge v1 API provides (per match object inside `{match: {...}}`):
 *  - round: positive = winners/upper, negative = losers/lower
 *  - player1_prereq_match_id, player2_prereq_match_id
 *  - loser_match_id  (where the loser of this match goes — used for DE)
 *  - winner_id, player1_id, player2_id
 *  - scores_csv
 *  - suggested_play_order
 *  - identifier  ("A", "B", etc.)
 */

export interface TransformedMatch {
    id: number | string;
    name: string;
    nextMatchId: number | string | null;
    nextLooserMatchId: number | string | null;
    tournamentRoundText: string;
    startTime: string | null;
    state: string;
    participants: TransformedParticipant[];
    // Extra metadata kept for downstream consumers (group stages, round robin, etc.)
    tournamentRound: number;
    group_id: number | string | null;
    // Raw Challonge IDs used by NeonBracketMatch / CustomBracket
    player1_id: number | string | null;
    player2_id: number | string | null;
    winner_id: number | string | null;
    suggested_play_order: number | null;
}

export interface TransformedParticipant {
    id: string | null;
    resultText: string | null;
    isWinner: boolean;
    status: string | null;
    name: string;
}

export const transformChallongeData = (
    participantsArray: any[],
    matchesArray: any[]
): { participants: any[]; matches: TransformedMatch[] } => {

    // ── 1. Normalize Participants ──
    // v2.1 JSON:API format: { id, type, attributes: { name, ... } }
    const normalizedParticipants = participantsArray.map(p => {
        if (p.attributes) {
            return { 
                id: p.id, 
                ...p.attributes,
                group_player_ids: p.group_player_ids // Preserve injected v1 mapping!
            };
        }
        if (p.participant) return p.participant;
        return p;
    });

    // Build fast lookup: Challonge participant ID → name
    const participantNameMap: Record<string, string> = {};
    const participantMainIdMap: Record<string, string> = {};
    
    normalizedParticipants.forEach(p => {
        const idStr = String(p.id);
        participantNameMap[idStr] = p.name || p.display_name || `Team ${idStr}`;
        participantMainIdMap[idStr] = idStr;
        // Also map group_player_ids (used in group stage tournaments)
        if (Array.isArray(p.group_player_ids)) {
            p.group_player_ids.forEach((gid: any) => {
                participantNameMap[String(gid)] = participantNameMap[idStr];
                participantMainIdMap[String(gid)] = idStr; // Map sub-ID to Main ID!
            });
        }
    });

    // ── 2. Normalize Matches (v1 wraps as {match: {...}}) ──
    const normalizedMatches = matchesArray.map(m => {
        if (m.match) return m.match;
        if (m.attributes) return { id: m.id, ...m.attributes };
        return m;
    });

    // ── 3. Build participant helper ──
    const buildParticipant = (
        playerId: any,
        score: string | undefined,
        winnerId: any
    ): TransformedParticipant => {
        const rawIdStr = playerId != null ? String(playerId) : null;
        const mainIdStr = rawIdStr ? (participantMainIdMap[rawIdStr] || rawIdStr) : null;
        
        // Use rawIdStr for the winner evaluation because Challonge Match winner_id is often the sub-ID
        const isWinner = winnerId != null && rawIdStr != null && String(winnerId) === rawIdStr;
        
        // For the UI Name, use CustomBracket's `nameMap` logic later, or provide the mapped name here
        const name = rawIdStr ? (participantNameMap[rawIdStr] || `Team ${rawIdStr}`) : 'TBD';
        
        return {
            id: mainIdStr, // OVERRIDE the sub-ID with the mapped main participant ID!
            resultText: score !== undefined && score !== null ? score : null,
            isWinner,
            status: mainIdStr ? null : 'NO_PARTY',
            name,
        };
    };

    // ── 4. Parse scores ──
    const parseScores = (scoresCsv: string | null | undefined): [string | undefined, string | undefined] => {
        if (!scoresCsv) return [undefined, undefined];
        // Challonge format: "3-1" or "3-1,2-0" (multiple sets)
        // Take cumulative or last set — we'll just take the final set for display
        const sets = scoresCsv.split(',');
        const lastSet = sets[sets.length - 1].trim();
        const parts = lastSet.split('-');
        if (parts.length === 2) {
            return [parts[0].trim(), parts[1].trim()];
        }
        return [undefined, undefined];
    };

    // ── 5. Transform each match ──
    const matchById: Record<string, any> = {};
    const transformedById: Record<string, TransformedMatch> = {};

    // First pass: create all transformed matches
    normalizedMatches.forEach(raw => {
        matchById[String(raw.id)] = raw;
        const [p1Score, p2Score] = parseScores(raw.scores_csv);

        const roundNum = raw.round || 0;
        const identifier = raw.identifier || '';

        const transformed: TransformedMatch = {
            id: raw.id,
            name: identifier ? `Match ${identifier}` : `Match ${raw.id}`,
            nextMatchId: null,            // Will be filled in pass 2
            nextLooserMatchId: null,       // Will be filled in pass 2
            tournamentRoundText: identifier ? `Round ${identifier}` : `Round ${Math.abs(roundNum)}`,
            startTime: raw.started_at || raw.scheduled_time || raw.created_at || null,
            state: raw.state || 'SCHEDULED',
            participants: [
                buildParticipant(raw.player1_id, p1Score, raw.winner_id),
                buildParticipant(raw.player2_id, p2Score, raw.winner_id),
            ],
            tournamentRound: roundNum,
            group_id: raw.group_id || null,
            player1_id: raw.player1_id,
            player2_id: raw.player2_id,
            winner_id: raw.winner_id,
            suggested_play_order: raw.suggested_play_order ?? null,
        };

        transformedById[String(raw.id)] = transformed;
    });

    // ── 6. Build nextMatchId links from prerequisite fields (Pass 2) ──
    // Challonge v1 tells us "this match's player1 comes from match X".
    // We reverse that: match X's nextMatchId should point to this match.
    normalizedMatches.forEach(raw => {
        const thisId = raw.id;
        const p1Prereq = raw.player1_prereq_match_id;
        const p2Prereq = raw.player2_prereq_match_id;
        const loserMatchId = raw.loser_match_id; // DE: where the loser goes

        // Back-link prerequisites → this match
        if (p1Prereq && transformedById[String(p1Prereq)]) {
            const prereqMatch = transformedById[String(p1Prereq)];
            // Only set nextMatchId if the prereq is in the same bracket direction
            // (upper→upper, lower→lower), OR it's the Grand Final link
            prereqMatch.nextMatchId = thisId;
        }
        if (p2Prereq && transformedById[String(p2Prereq)]) {
            const prereqMatch = transformedById[String(p2Prereq)];
            prereqMatch.nextMatchId = thisId;
        }

        // Set nextLooserMatchId on THIS match (where this match's loser goes)
        if (loserMatchId && transformedById[String(thisId)]) {
            transformedById[String(thisId)].nextLooserMatchId = loserMatchId;
        }
    });

    // ── 7. Ensure the Grand Final has nextMatchId: null ──
    // The grand final is the match with the highest positive round number
    // that nothing else points to as a prerequisite (i.e., no match sets nextMatchId to it
    // via the prereq backfill, but that's already handled — the GF's own nextMatchId stays null
    // since no match has GF as a prerequisite).

    const allMatches = Object.values(transformedById);

    return {
        participants: normalizedParticipants,
        matches: allMatches,
    };
};
