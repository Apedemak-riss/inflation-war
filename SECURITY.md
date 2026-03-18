# Security Architecture

## Overview
Inflation War is a Clash of Clans tournament management application built with React on the frontend and Supabase (PostgreSQL, Auth, Edge Functions, Realtime) on the backend. It integrates with the Challonge API for bracket management via a secure edge function proxy.

Security is enforced at multiple layers — database policies, server-side RPC authorization, edge function boundaries, and client-side input validation.

## Security Model

### 1. Row Level Security (RLS)
Every table in the database has Row Level Security enabled with explicit policies governing access:
- **Public Data (Read-Only):** Tournaments, lobbies, items, rosters, and match logs are readable by authenticated users.
- **User Data (Ownership-Enforced):** Write operations are restricted to authorized actors. Player-facing actions route through server-side RPCs with ownership verification. Direct table writes are denied where applicable.
- **Moderator Access:** Moderator-specific write operations are gated behind a server-side role check (`is_moderator()`), preventing privilege escalation regardless of client behavior.

### 2. Server-Side Execution (PostgreSQL RPCs)
Critical business logic executes inside the database via SECURITY DEFINER RPCs with explicit `search_path` settings:
- **Player Actions:** `buy_item`, `sell_item`, `lock_player_army`, `leave_team`, `clear_player_army`, `join_lobby_secure` — each validates caller ownership before executing.
- **Moderator Actions:** `create_lobby`, `delete_lobby`, `end_match_secure`, `moderator_rename_team`, `moderator_reset_team`, `moderator_switch_team`, `conclude_tournament` — each verifies moderator authorization.
- All RPCs perform internal validation that cannot be bypassed by the frontend client.

### 3. Edge Function Security
The `challonge-proxy` edge function isolates the `CHALLONGE_API_KEY` from the client — the frontend never has access to this credential.
- **Authentication:** Requires a valid JWT in the `Authorization` header.
- **Endpoint Validation:** Requests are validated against an allowlist pattern. Unrecognized paths are rejected.

### 4. Client-Side Mitigations
- **SQL Injection:** Prevented natively by Supabase's PostgREST library, which automatically parameterizes all queries.
- **Cross-Site Scripting (XSS):** React provides built-in HTML injection protection. No `dangerouslySetInnerHTML` patterns are used. Additionally, user-supplied URLs (army links, registration URLs, tournament slugs) are validated against safe URL patterns before rendering.
- **Input Sanitization:** Utility functions (`isSafeUrl`, `isSafeTournamentSlug`) validate external URLs to prevent protocol injection.
- **External Links:** All external-facing links use `target="_blank"` with `rel="noopener noreferrer"`.

### 5. Authentication & Authorization
- **Authentication** is managed by Supabase Auth with session-based tokens.
- **Role Management:** User roles are immutable from the client — the role column is protected at the database level.
- **Route Protection:** Sensitive routes are guarded by both client-side checks and server-side enforcement.

### 6. Environment & Secrets
- API keys and sensitive configuration are stored as Supabase Secrets, never exposed in client-side code.
- `.env` files are excluded from version control via `.gitignore`.
- Only the Supabase URL and anon key (designed to be public) are loaded into the frontend.

## Incident Response & Monitoring

- Monitor Supabase Edge Function logs for anomalous request patterns.
- Monitor database logs for RLS policy violations and unauthorized RPC calls.
- Subscribe to Supabase webhooks for alerts on unusual activity volume.

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly by contacting the project maintainers directly. Do not open a public issue.
