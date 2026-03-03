# Project Deliverables

This document tracks the delivered components of the Clash of Clans 5v5 Tournament Manager.

## Core Application Features

1. **Tournament Dashboard**
   - Direct integration with Challonge API for dynamic bracket rendering.
   - Support for Single Elimination, Double Elimination, and Two-Stage Group Stage formats.
   - Comprehensive Standings tables for Group Stages.

2. **Match Lobby System ("War Rooms")**
   - Instant 1-click Lobby creation translating Challonge matches into DB realities.
   - Participant name locking and Captain role assignment.
   - Real-time Hero Equipment assignment (respecting 2 equipment max per Hero per Player).

3. **Army Deep Linking**
   - Clash of Clans native integration `clashofclans://action=CopyArmy`.
   - Army compositions saved locally and synchronized to the Match Lobby.

4. **Moderator Capabilities**
   - Override capabilities: "End Match", "Refresh Bracket", "Start Final Stage", "Finalize Group Stage".
   - Authority to reset teams or conclude entire tournaments.

## Backend Infrastructure

1. **Real-Time PostgreSQL**
   - Supabase project handling `lobbies`, `players`, `teams`, `tournaments` and `equipment_selections`.
   - RPCs (Remote Procedure Calls) handling complex atomicity such as `create_lobby` and `end_match_secure`.

2. **Serverless Edge Functions**
   - `challonge-proxy`: Injects `CHALLONGE_API_KEY` to protect credentials from the React frontend.
   - (Note: Pending Security Updates per the Security Audit - see `SECURITY.md`).

## Documentation Suite

1. **`ARCHITECTURE.md`** - Overview of React frontend, GameContext, and Supabase interaction.
2. **`SECURITY.md`** - Details the RLS model, RPC search path vulnerabilities, and SSRF proxy findings.
3. **`DEPLOYMENT.md`** - Instructions for publishing the Vite frontend and Edge Functions.
4. **`TESTING.md`** - Guide for verifying Challonge sync, Lobby behavior, and DB constraints.
5. **`QUICKSTART.md`** - Developer onboarding manual.

## Security Audit (Delivered March 2026)
- **SECURITY_AUDIT_REPORT.md**: Comprehensive internal audit of the application identifying RLS misconfigurations, Edge Function proxy SSRF vulnerabilities, and PostgreSQL `search_path` mutation risks.
