# Deployment Guide

## Prerequisites

- Supabase account (free tier is fine)
- Node.js 18+
- npm or yarn

## Step 1: Supabase Project Setup

1. Go to [Supabase Console](https://app.supabase.com)
2. Create a new project or use existing one
3. Note your **Project URL** and **Anon Key**

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update `.env` with your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Database Setup

The database schema and seed data are created via migrations. To apply them:

```bash
# The migrations have already been applied if you used the provided schema.
# If starting fresh, contact your admin to apply:
# - supabase/migrations/20250211_full_game_setup.sql
# - supabase/migrations/fix_security_issues.sql
```

Verify tables exist:
- lobbies
- teams
- players
- items
- purchases

## Step 4: Deploy Edge Function

The Edge Function is already configured. To redeploy:

```bash
# Using Supabase CLI (if available):
supabase functions deploy validate-purchase

# Or through the dashboard:
# 1. Go to Functions > validate-purchase
# 2. Upload new code if needed
```

Verify the function is accessible at:
```
https://[PROJECT_ID].supabase.co/functions/v1/validate-purchase
```

## Step 5: Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# The app will be available at http://localhost:5173
```

## Step 6: Production Build

```bash
# Build for production
npm run build

# Output is in /dist folder
```

## Step 7: Deploy to Hosting

### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option B: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Option C: GitHub Pages

```bash
# Build
npm run build

# Push to gh-pages branch
git add dist
git commit -m "Deploy"
git push origin main
```

### Option D: Docker

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

```bash
# Build and run
docker build -t inflation-war .
docker run -p 3000:3000 inflation-war
```

## Troubleshooting

### "Failed to fetch items"
- Check VITE_SUPABASE_URL is correct
- Verify items table has data
- Check RLS policies allow SELECT

### "Market prices have changed. Please refresh."
- This is expected when another player buys items
- Refresh the page to reload prices

### Edge Function returns 500 error
- Check function logs: Supabase Dashboard > Functions > validate-purchase > Logs
- Verify SERVICE_ROLE_KEY is set (it's automatic)
- Check player_id is valid UUID

### Cart shows empty items list
- Check items table is seeded
- Verify RLS SELECT policy is enabled
- Check browser console for errors

### Purchase won't confirm
- Ensure total cost <= 100 Gold
- Check player is_locked is false
- Verify all item_ids in cart exist
- Look at Edge Function logs for detailed error

## Testing

### Test Scenario 1: Basic Purchase
1. Open app in two browser tabs
2. Tab A: Add items to cart (total < 100 Gold)
3. Tab B: Add same items and confirm first
4. Tab A: Notice prices increased, confirm again
5. Verify both got army links

### Test Scenario 2: Race Condition
1. Tab A: View Root Riders at 10 Gold, add 10 to cart (total: 100)
2. Tab B: Confirm purchase of Root Riders
3. Tab A: Confirm purchase - should fail with "Market prices have changed"
4. Verify error message appears

### Test Scenario 3: Budget Overflow
1. Try to add more items than 100 Gold allows
2. Confirm button should be disabled
3. Remove items to get under 100
4. Confirm should work

## Monitoring

### Check Application Health

```bash
# Verify Supabase connectivity
curl https://[PROJECT_ID].supabase.co/health

# Test Edge Function
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/validate-purchase \
  -H "Content-Type: application/json" \
  -d '{"player_id":"test","cart":[]}'
```

### Database Monitoring

In Supabase Dashboard:
- Check "Storage" for database usage
- Monitor "Functions" for Edge Function logs
- Review "Realtime" for subscription activity

## Performance Tips

1. **Indexes**: Already created for common queries
2. **Caching**: Supabase Realtime handles real-time updates
3. **CDN**: Static files served from dist/ - use a CDN like Cloudflare
4. **Database**: Supabase automatically scales on free tier

## Security Checklist

- [ ] Environment variables are not committed
- [ ] VITE_ prefix confirms vars are exposed (intentional)
- [ ] SUPABASE_SERVICE_ROLE_KEY is NEVER exposed to client
- [ ] Edge Function uses SERVICE_ROLE_KEY internally
- [ ] RLS policies prevent unauthorized access
- [ ] Items table is read-only
- [ ] Players table cannot be directly updated
- [ ] All purchases go through validate-purchase function

## Rollback Procedure

If something goes wrong:

1. **Database**: Revert migration in Supabase dashboard
2. **Edge Function**: Redeploy previous version
3. **Frontend**: Redeploy previous build

```bash
# Frontend rollback (if using Vercel)
vercel rollback

# Or redeploy previous commit
git checkout [previous-commit]
npm run build
npm run deploy
```

## Support

- **Database Issues**: Supabase Dashboard > Support
- **Function Errors**: Check Edge Function logs
- **Frontend Issues**: Browser console + Network tab
- **Real-time Issues**: Check Supabase Realtime status

## Next Steps

1. Set up monitoring/alerting
2. Create admin dashboard
3. Add user verification
4. Implement rate limiting
5. Add analytics tracking
