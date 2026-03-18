# Architecture Documentation

## System Overview

The application is a 5v5 Clash of Clans Tournament Manager built with a **client-server architecture**. It interfaces natively with the Challonge API to manage brackets, group stages, single-elimination, and double-elimination tournament formats. Critical business operations (lobby creation, score reporting) execute server-side via Supabase Edge Functions and PostgreSQL RPCs.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┬────────────────┬──────────────┬────────────────┐
│  │ Registration │ Dashboard      │ War Lobbies  │ Match Action   │
│  │              │                │              │                │
│  │ - Join Tourn │ - View bracket │ - Equipment  │ - View Matches │
│  │ - Roster Maps│ - Active stages│ - Army Link  │ - Score report │
│  │ - Team Setup │ - Standings    │ - Hero load  │ - Status sync  │
│  └──────────────┴────────────────┴──────────────┴────────────────┘
│                           │
│                    GameContext (State)
│                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ↓
              ┌─────────────────────────────┐
              │   Supabase Client (JS SDK)  │
              │  - Auth & Sessions          │
              │  - Real-time Subscriptions  │
              │  - RPC Calls (Data queries) │
              └─────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
    ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
    │ Database    │  │ Edge Function│  │ Challonge API    │
    │ (PostgreSQL)│  │ (proxy)      │  │ (brackets/sync)  │
    └─────────────┘  └──────────────┘  └──────────────────┘
```

## Application Layer

### Frontend Structure

**Root Component: `App.tsx`**
- Main entry point with `GameProvider` context wrapper.
- Manages routing between the Tournament List, the active Tournament View, and individual Match Lobbies.
- Implements active game state synchronization.

**Context: `GameContext.tsx`**
- Global state management for:
  - User authentication status and capabilities.
  - Current selected tournament data.
  - Active bracket information.
  - User role enforcement (e.g. `moderator`).

**Components:**

1. **TournamentView (`TournamentView.tsx`)**
   - Renders the primary dashboard for an active tournament.
   - Embeds either the standard Challonge iframe or the bespoke `CustomBracket` UI depending on the tournament stage.
   - Manages Moderator panels (Start Final Stage, Finalize Group Stage, Refresh).

2. **CustomBracket (`CustomBracket.tsx`)**
   - Directly interprets raw Challonge API JSON to render custom matches instead of relying solely on the Challonge iframe.
   - Built to handle Two-Stage tournaments (Group Stages progressing into Elimination Brackets) seamlessly.
   - Iterates through `matches` and dynamically translates them into actionable "CREATE LOBBY" or "JOIN LOBBY" cards based on database states.

3. **Match Lobbies (`App.tsx` / `NeonBracketMatch.tsx`)**
   - Creates internal "War Rooms" for every Challonge matchup.
   - Players select their Hero Equipment (e.g., Fireball, Giant Gauntlet) obeying strict maximum limits.
   - Tracks deep-linked armies.
   - Provides live score reporting directly back to Challonge.

### Libraries & Tools

**Core Framework:**
- React 18.3 (TypeScript)
- Vite (Build Tooling)
- Tailwind CSS (Styling)
- Lucide React (Icons)

**State & Data:**
- `@supabase/supabase-js` (Database, Auth, RPCs, Edge Functions)

---

## Backend Architecture

### Database Schema (Supabase)

**Primary Tables:**

```
tournaments
├── id (UUID, PK)
├── challonge_url (TEXT, UNIQUE)
├── group_stages_enabled (BOOLEAN)
├── status (TEXT: 'active' | 'completed')
└── created_at (TIMESTAMPTZ)

rosters (Teams)
├── id (UUID, PK)
├── name (TEXT)
├── captain_id (UUID)
└── created_at (TIMESTAMPTZ)

tournament_registrations
├── id (UUID, PK)
├── tournament_id (UUID, FK)
├── roster_id (UUID, FK)
└── challonge_participant_id (INTEGER) - Primary mapping link!

lobbies (Match Rooms)
├── id (UUID, PK)
├── challonge_match_id (INTEGER)
├── team1_roster_id (UUID, FK)
├── team2_roster_id (UUID, FK)
└── completed (BOOLEAN)

players
├── id (UUID, PK)
├── lobby_id (UUID, FK)
├── roster_id (UUID, FK)
├── user_id (UUID, FK → auth.users)
├── name (TEXT)
├── is_locked (BOOLEAN)
└── army_link (TEXT)

purchases
├── id (UUID, PK)
├── player_id (UUID, FK)
├── team_id (UUID, FK)
├── item_id (TEXT, FK)
├── price_paid (INTEGER)
├── equipped_hero (TEXT)
└── is_cc (BOOLEAN)
```

### PostgreSQL Functions (RPCs)
We rely heavily on Remote Procedure Calls (SECURITY DEFINER with explicit `search_path`) to perform secure server-side logic:
- `create_lobby`: Spools up the entire database row structure for a 5v5 matchup atomically.
- `end_match_secure`: Archives match data and closes the lobby (moderator-authorized).
- `lock_player_army`: Validates player ownership before finalizing their loadout.
- `buy_item` / `sell_item`: Handle economy transactions with caller ownership verification.
- All player-facing RPCs verify `auth.uid()` matches the player's `user_id`. Moderator RPCs enforce role authorization.

### Edge Function: `challonge-proxy`

**Location:** `/supabase/functions/challonge-proxy/index.ts`

**Responsibility:** Securely proxies requests to the Challonge API, keeping the `CHALLONGE_API_KEY` server-side.

**Security:**
- Requires a valid JWT (`verify_jwt: true`) — unauthenticated requests are rejected.
- Validates the `endpoint` parameter against a strict allowlist pattern before forwarding.

**Flow:**
1. Receives POST from client with `endpoint`, `method`, and `body`.
2. Validates the endpoint against the allowlist.
3. Appends the `CHALLONGE_API_KEY` and forwards to the Challonge API.
4. Returns the JSON response to the React client.

### Real-Time Subscriptions
Supabase Realtime provides instant feedback across the app:
- **Lobby Channel**: When a player selects hero equipment, their teammates and enemies instantly see the change.
- **Match Channel**: Changing tournament scores or bracket updates push immediately to the `CustomBracket` component, recalculating progressive schedules.

---

## Security Architecture

The application implements defense-in-depth security:
- **RLS Policies:** Every table has explicit Row Level Security policies enforcing ownership and role constraints.
- **RPC Authorization:** All RPCs use `SECURITY DEFINER` with `SET search_path TO 'public'` and include caller authorization checks.
- **Edge Function:** JWT-authenticated with endpoint validation.
- **Client-Side:** URL sanitization guards and XSS prevention.

See `SECURITY.md` for the full security architecture documentation.
