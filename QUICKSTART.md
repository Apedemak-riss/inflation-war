# Quickstart Guide

Get up and running locally with the Clash of Clans 5v5 Tournament Manager.

## 1. Clone & Install

```bash
git clone <repository_url>
cd project
npm install
```

## 2. Environment Variables

Create a `.env` file referencing your Supabase instance:

```env
VITE_SUPABASE_URL=https://<your_supabase_ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_ENABLE_SANDBOX=false
```

*Note: The `CHALLONGE_API_KEY` is completely hidden from the client. The frontend communicates entirely through the `challonge-proxy` Supabase Edge Function to protect your organization's API credentials.*

## 3. Local Edge Function Testing

Since the application requires the `challonge-proxy` edge function to fetch active brackets, you must run it locally via Supabase CLI if you aren't pointing your `.env` directly to a Production Supabase URL containing the deployed function.

```bash
# Start edge functions locally
supabase functions serve --no-verify-jwt --env-file ./supabase/.env.local
```
*(Make sure to put your `CHALLONGE_API_KEY` inside `./supabase/.env.local`)*

## 4. Run the Dev Server

```bash
npm run dev
```

Navigate to `http://localhost:5173`. 
You must log in or use magic links depending on your Supabase Auth configuration. Once logged in as a Moderator, you can supply a `tournament_url` from your Challonge organization, click "Create Tournament Database Overlay", and the React app will build the local PostgreSQL tables required for team management and Match Lobbies automatically.

See `ARCHITECTURE.md` and `SECURITY.md` for a deep dive into the proxy configuration.
