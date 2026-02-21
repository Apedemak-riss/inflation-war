-- 1. Add unique constraint to prevent race conditions when two captains click Join simultaneously
ALTER TABLE lobbies DROP CONSTRAINT IF EXISTS lobbies_challonge_match_id_key;
ALTER TABLE lobbies ADD CONSTRAINT lobbies_challonge_match_id_key UNIQUE (challonge_match_id);

-- 2. Create the JIT get-or-create RPC
CREATE OR REPLACE FUNCTION get_or_create_match_lobby(
    p_challonge_match_id text,
    p_tournament_url text,
    p_team_a_roster_id uuid,
    p_team_b_roster_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_lobby_id uuid;
    v_code text;
BEGIN
    SELECT id INTO v_lobby_id FROM lobbies WHERE challonge_match_id = p_challonge_match_id;

    IF v_lobby_id IS NULL THEN
        -- Generate random robust 8 char alphanumeric code
        v_code := upper(left(md5(random()::text), 8));
        
        BEGIN
            INSERT INTO lobbies(code, challonge_match_id, team_a_roster_id, team_b_roster_id)
            VALUES (v_code, p_challonge_match_id, p_team_a_roster_id, p_team_b_roster_id)
            RETURNING id INTO v_lobby_id;
        EXCEPTION WHEN unique_violation THEN
            -- In case of a race condition, another user generated it already.
            SELECT id INTO v_lobby_id FROM lobbies WHERE challonge_match_id = p_challonge_match_id;
        END;
    END IF;

    RETURN v_lobby_id;
END;
$$;
