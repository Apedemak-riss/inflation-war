# Security Architecture & Audit Status

## Overview
Inflation War is a Clash of Clans tournament management application. It utilizes React on the frontend, Supabase (PostgreSQL, Realtime, Auth, Edge Functions) for the backend, and heavily integrates with the Challonge API for bracket management. 

Our security model relies on Row Level Security (RLS) and Edge Function boundaries, although a recent audit has identified several areas requiring remediation.

## Current Security Posture (Audit Findings - March 2026)

A comprehensive security audit of the application and staging database (`tnkwhxxxyixoohtmdinx`) revealed several critical vulnerabilities that are currently documented for remediation:

### 1. Edge Function Lack of Authentication (SSRF Risk)
The `challonge-proxy` Edge Function is currently a blind proxy. It intercepts client requests and forwards them to the Challonge API via `https://api.challonge.com/v2.1` or `v1`, transparently injecting the secret `CHALLONGE_API_KEY`.
- **Vulnerability**: Currently, there is **no authentication check** enforcing that the requester is a logged-in Supabase user or has Moderator privileges. Additionally, there is **no endpoint allow-list**, meaning a malicious actor with knowledge of the endpoint could perform Server-Side Request Forgery against the Challonge API using the server's API key.
- **Planned Remediation**: Enforce `Authorization` header validation against Supabase Auth within the edge function, restrict access to authorized roles, and implement a strict allow-list for Challonge endpoints.

### 2. Overly Permissive Row Level Security (RLS)
The database utilizes Supabase's RLS, but several core tables possess `USING (true)` or `WITH CHECK (true)` policies for data modification.
- **Vulnerability**: The `players` table (`INSERT` and `UPDATE`) and `tournament_registrations` table (`INSERT`) allow unrestricted access to any authenticated user. This effectively bypasses meaningful row-level security, allowing users to alter data they do not own.
- **Planned Remediation**: Rewrite these RLS policies to enforce strict ownership constraints (e.g., `auth.uid() = user_id`) to ensure users can only modify their own data.

### 3. Mutable Search Paths in PostgreSQL Functions
Supabase Security Advisor detected that multiple stored procedures have a role-mutable `search_path`.
- **Vulnerability**: Functions such as `lock_player_army`, `create_lobby`, `end_match_secure`, `moderator_switch_team`, and others do not explicitly secure their `search_path`. This opens up potential privilege escalation via search path hijacking if a malicious user can define objects in the database.
- **Planned Remediation**: Alter all custom functions to explicitly specify `SET search_path = public`.

### 4. Authentication Configuration
- **Vulnerability**: Leaked Password Protection is currently disabled in Supabase Auth.
- **Planned Remediation**: Enable Leaked Password Protection in the Supabase Dashboard to prevent the use of known compromised passwords.

---

## Intended Security Architecture

### 1. Row Level Security (RLS) Strategy
Once remediated, RLS policies will enforce the following:
- **Public Data (Read-Only):** Tournaments, public lobbies, and public seed items.
- **User Data (Strict Ownership):** `players`, `tournament_registrations`, and `team_members` can only be updated or deleted by the authenticated user who created them (`auth.uid() = user_id`).
- **Moderator Access:** Special boolean flags or role-based tables (`user_roles`) distinguish moderators, unlocking specific `UPDATE` policies for tournament configuration.

### 2. Server-Side Execution (PostgreSQL RPCs)
To prevent complex client-side manipulation, critical business logic executes securely inside the database via RPC (Remote Procedure Calls):
- Match finalization (`end_match_secure`)
- Lobby creation (`create_lobby`)
- Army locking and Hero Equipment limitations (`lock_player_army`)

These RPCs perform internal validation (e.g., confirming a user is in a match before allowing them to report a score) that cannot be bypassed by the frontend client. **Security Note:** These RPCs must have their `search_path` explicitly set to mitigate hijacking.

### 3. Edge Function Boundary
The `challonge-proxy` isolates the `CHALLONGE_API_KEY` from the client. The frontend is never exposed to this key. 

### 4. Client-Side Mitigations
- **SQL Injection:** Handled natively by Supabase's PostgREST library, which automatically parameterizes all queries. 
- **Cross-Site Scripting (XSS):** React fundamentally protects against HTML injection. No `dangerouslySetInnerHTML` patterns are utilized in the codebase.

## Incident Response & Monitoring

- Monitor Supabase Edge Function logs for HTTP 400/500 errors indicating malformed or attacking payloads.
- Subscribe to Supabase database webhooks (if enabled) to monitor unexpectedly high volumes of team or lobby creation.
