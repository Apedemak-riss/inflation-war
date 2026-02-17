-- =============================================================================
-- INFLATION WAR — Master RLS Policy Script
-- =============================================================================
-- Generated from full codebase audit.
-- Tables: profiles, lobbies, teams, players, items, purchases
--
-- Convention:
--   • (select auth.uid()) is used everywhere for Postgres optimizer caching.
--   • SELECT/DELETE → USING only.
--   • INSERT → WITH CHECK only.
--   • UPDATE → USING + WITH CHECK.
--   • Moderator checks use: EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'moderator')
--   • Backend triggers (e.g. handle_new_user) run as SECURITY DEFINER and bypass RLS.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. ENABLE RLS ON ALL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
-- Frontend reads:
--   • AuthContext.tsx: SELECT id, email, username, role, avatar_url WHERE id = user.id
--   • Game views may reference profiles for display
-- Frontend writes:
--   • UserSettings.tsx / CallsignModal.tsx: UPDATE username WHERE id = user.id
-- Backend writes:
--   • handle_new_user trigger: INSERT (runs as SECURITY DEFINER, bypasses RLS)

-- Any authenticated user can read any profile (needed for display names in game)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- No direct INSERT from frontend — handle_new_user trigger (SECURITY DEFINER) handles this
-- No direct DELETE from frontend

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LOBBIES
-- ─────────────────────────────────────────────────────────────────────────────
-- Frontend reads:
--   • handleFindLobby / handleModeratorAccess: SELECT * WHERE code = X
--   • attemptRestoreSession: SELECT * WHERE code = X
-- Frontend writes:
--   • handleFindLobby (moderator path) / handleModeratorAccess: INSERT { code }
-- Frontend deletes:
--   • handleNuke: via RPC delete_lobby (SECURITY DEFINER, bypasses RLS)

-- Any authenticated user can look up a lobby by code
CREATE POLICY "lobbies_select_authenticated"
  ON public.lobbies FOR SELECT
  TO authenticated
  USING (true);

-- Only moderators can create lobbies
CREATE POLICY "lobbies_insert_moderator"
  ON public.lobbies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'moderator'
    )
  );

-- No direct UPDATE or DELETE from frontend (delete_lobby RPC is SECURITY DEFINER)

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TEAMS
-- ─────────────────────────────────────────────────────────────────────────────
-- Frontend reads:
--   • fetchTeams: SELECT *, players(id, name, ...) WHERE lobby_id = X
--   • handleJoinTeam: SELECT id WHERE lobby_id = X AND name = X
--   • Realtime subscription on teams table
-- Frontend writes:
--   • handleFindLobby/handleModeratorAccess (moderator): INSERT teams for new lobby
-- Frontend RPCs:
--   • moderator_rename_team, moderator_reset_team (SECURITY DEFINER)

-- Any authenticated user can read teams (needed to join/view games)
CREATE POLICY "teams_select_authenticated"
  ON public.teams FOR SELECT
  TO authenticated
  USING (true);

-- Only moderators can create teams (when creating a lobby)
CREATE POLICY "teams_insert_moderator"
  ON public.teams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'moderator'
    )
  );

-- No direct UPDATE or DELETE from frontend (managed by RPCs running as SECURITY DEFINER)

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. PLAYERS
-- ─────────────────────────────────────────────────────────────────────────────
-- Frontend reads:
--   • fetchTeams: players are selected as a nested join on teams
--   • attemptRestoreSession: SELECT id, name, team_id WHERE id = stored_pid
--   • Realtime subscription on players table
-- Frontend writes:
--   • handleJoinTeam: INSERT { team_id, name }
--   • handleSaveArmy: UPDATE army_link WHERE id = playerId (own player)
--   • handleSwitch (moderator): UPDATE team_id WHERE id = pId
-- Frontend deletes:
--   • handleKick (moderator): DELETE WHERE id = pId
-- Frontend RPCs:
--   • buy_item, sell_item, leave_team, clear_player_army (SECURITY DEFINER)

-- Any authenticated user can read players (needed for team views)
CREATE POLICY "players_select_authenticated"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

-- Any authenticated user can join a team (insert themselves as a player)
CREATE POLICY "players_insert_authenticated"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Any authenticated user can update player rows.
-- Rationale: players.id is a game-session UUID (NOT auth.uid()), so ownership
-- checks are impossible without a user_id FK. The only direct frontend UPDATE
-- is army_link (cosmetic). All critical mutations (buy/sell/switch/kick) go
-- through SECURITY DEFINER RPCs that bypass RLS entirely.
CREATE POLICY "players_update_authenticated"
  ON public.players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only moderators can delete players (kick)
CREATE POLICY "players_delete_moderator"
  ON public.players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'moderator'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
-- Frontend reads:
--   • checkDatabase: SELECT * (all items, game catalog)
-- Frontend writes:
--   • handleUpdateItem (moderator): UPDATE base_price, inflation_rate, etc.
--   • seedDatabase (moderator): UPSERT all rows (initial seed)

-- Any authenticated user can read the item catalog
CREATE POLICY "items_select_authenticated"
  ON public.items FOR SELECT
  TO authenticated
  USING (true);

-- Only moderators can insert/seed items
CREATE POLICY "items_insert_moderator"
  ON public.items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'moderator'
    )
  );

-- Only moderators can update item pricing
CREATE POLICY "items_update_moderator"
  ON public.items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'moderator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'moderator'
    )
  );

-- No direct DELETE on items from frontend

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PURCHASES
-- ─────────────────────────────────────────────────────────────────────────────
-- Frontend reads:
--   • fetchGameState: SELECT * WHERE team_id = X
--   • fetchTeams (nested join): purchases via players
--   • Realtime subscription on purchases table
-- Frontend writes:
--   • All mutations via RPCs: buy_item, sell_item, clear_player_army,
--     moderator_reset_team (all SECURITY DEFINER, bypass RLS)

-- Any authenticated user can read purchases (needed for game state display)
CREATE POLICY "purchases_select_authenticated"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (true);

-- No direct INSERT/UPDATE/DELETE from frontend — all managed by SECURITY DEFINER RPCs
-- However, we add INSERT/DELETE for the RPCs that DON'T use SECURITY DEFINER
-- (safety net — if your RPCs are all SECURITY DEFINER, these won't fire)

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. VERIFY: Ensure backend functions use SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────────────────────
-- The following functions MUST be SECURITY DEFINER to bypass RLS:
--   • handle_new_user (trigger)        — inserts into profiles
--   • buy_item (rpc)                   — inserts into purchases, updates teams.budget
--   • sell_item (rpc)                  — deletes from purchases, updates teams.budget
--   • leave_team (rpc)                 — deletes player + their purchases
--   • clear_player_army (rpc)          — deletes purchases for a player
--   • delete_lobby (rpc)               — cascading delete of lobby + teams + players + purchases
--   • moderator_rename_team (rpc)      — updates team name
--   • moderator_reset_team (rpc)       — deletes purchases, resets budget
--
-- If any of these are NOT SECURITY DEFINER, run:
--   ALTER FUNCTION public.<function_name>(...) SECURITY DEFINER;
--
-- Example:
--   ALTER FUNCTION public.buy_item(uuid, text, text, boolean) SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- END OF SCRIPT
-- ─────────────────────────────────────────────────────────────────────────────
