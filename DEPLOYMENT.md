# Deployment Guide

This guide covers deploying the Clash of Clans 5v5 Tournament Manager.

## Prerequisites

1. Node.js 18+ and npm
2. Supabase CLI
3. A Supabase Project (for DB and Edge Functions)
4. A Challonge API Key
5. A GitHub repository (for Vercel/Netlify deployment)

## 1. Local Development

```bash
# Install dependencies
npm install

# Build for development
npm run dev
```

Your environment `.env` MUST contain:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ENABLE_SANDBOX=false
```

## 2. Supabase Setup (Database & Edge Functions)

Ensure your production database mirrors your schema.

```bash
# Log in to Supabase CLI
supabase login

# Link your local project to the remote Supabase project
supabase link --project-ref your_project_ref

# Deploy all Edge Functions (challonge-proxy)
supabase functions deploy

# Set Secrets for the Edge Function
supabase secrets set CHALLONGE_API_KEY=your_challonge_v1_or_v2_api_key
```

**Security Note**: 
The `challonge-proxy` edge function requires JWT authentication and validates endpoint paths against an allowlist. Do **NOT** expose `CHALLONGE_API_KEY` in your `.env` frontend environment. It must strictly live inside Supabase Secrets for the edge function. See `SECURITY.md` for the full security architecture.

## 3. Frontend Deployment (Vercel)

The easiest way to host the React UI is on Vercel.

1. Push your code to GitHub.
2. Import the project in Vercel.
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add the Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Deploy.

The Vercel deployment will natively communicate with your Supabase Edge Functions and PostgreSQL database.
