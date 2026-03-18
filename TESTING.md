# Testing Strategy

This application manages complex PostgreSQL states alongside heavily nested React components to power 5v5 Clash of Clans tournaments. Testing should verify both frontend and backend edge cases.

## Security Testing
RLS policies, RPC authorization checks, and edge function endpoint validation should be verified after any database schema changes. See `SECURITY.md` for the security architecture that tests should validate.

## 1. Unit Tests (Frontend)

Use **Vitest** for isolated logic testing.

**Critical Areas:**
- `CustomBracket` progressive round rendering (e.g. confirming Round 2 matches stay completely invisible if Round 1 matches are unresolved).
- Hero Equipment tracking (`max 2 per hero`, `is_locked`, `army_link` string parsing).

```bash
# Run unit tests
npm run test
```

## 2. Integration Tests (Full Stack)

Ensure the React frontend perfectly synchronizes with Supabase using Supabase's local testing environment.

**Critical Paths:**
- Creating a Tournament (Are rosters mapped properly in the database?).
- Ending a Group Stage match (Do both scores report exactly as intended bypassing the Challonge sub-ID bug?).
- Match finalization (Are the lobbies permanently closed after score reporting?).

## 3. Playwright (E2E Tests)

Run End-to-End tests simulating a full Match Lobby experience:
1. Captain navigates to a Match Lobby.
2. Player configures their loadout (Hero equipment constraints).
3. Confirm Loadout (Army is locked, `generate-army-link` validates deep-link syntax).
4. Captain triggers End Match.

```bash
# Launch Playwright suite
npx playwright test
```
