# Quick Start Guide

## 5-Minute Setup

### 1. Configure Environment
```bash
# Copy example to .env
cp .env.example .env

# Edit with your Supabase credentials
# Get from: https://app.supabase.com/project/[your-project]/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
# Opens at http://localhost:5173
```

### 4. Test It Out
- **Browser A**: Open http://localhost:5173
  - Lobby Code: `TEST01`
  - Player Name: `Alice`
  - Team Name: `Team A`
  - Click "Join Battle"

- **Browser B**: Open http://localhost:5173
  - Same Lobby Code: `TEST01`
  - Player Name: `Bob`
  - Same Team Name: `Team A`
  - Click "Join Battle"

### 5. Try the Game
- **Alice**: Add Root Rider to cart (costs 10 Gold)
- **Alice**: Confirm & Generate Link
- **Bob**: Reload page or check in real-time - Root Rider now costs 15 Gold
- **Bob**: Add Root Rider, confirm - should work at 15 Gold
- **Alice**: See both army links successfully generated

## File Structure

```
project/
├── src/
│   ├── App.tsx                 # Main app component
│   ├── main.tsx               # React entry point
│   ├── index.css              # Global styles
│   ├── components/            # UI Components
│   │   ├── LoginScreen.tsx     # Lobby joining
│   │   ├── Dashboard.tsx       # Main game view
│   │   ├── ItemCard.tsx        # Item display
│   │   ├── Cart.tsx            # Purchase cart
│   │   ├── BudgetBar.tsx       # Budget visualization
│   │   ├── Header.tsx          # Top navigation
│   │   └── SuccessModal.tsx    # Deep link display
│   ├── contexts/              # State management
│   │   └── GameContext.tsx     # Global game state
│   └── lib/                   # Utilities
│       ├── supabase.ts        # DB client
│       └── types.ts           # TypeScript types
├── supabase/
│   ├── migrations/
│   │   ├── 20250211_full_game_setup.sql
│   │   └── fix_security_issues.sql
│   └── functions/
│       └── validate-purchase/ # Server validation
│           └── index.ts       # Edge Function code
├── dist/                      # Production build output
├── README.md                  # Overview & features
├── ARCHITECTURE.md            # System design details
├── SECURITY.md                # Security documentation
├── DEPLOYMENT.md              # Deployment guide
├── TESTING.md                 # Test scenarios
└── package.json               # Dependencies
```

## Key Commands

```bash
# Development
npm run dev              # Start dev server at :5173

# Production
npm run build           # Build for production
npm run preview         # Preview production build

# Linting
npm run lint            # Check code style
```

## Core Concepts

### The Inflation Economy

Items have a **Base Price** that never changes, but **Volatile Items** increase in cost based on team usage:

```
Current Price = Base Price + (Team Usage Count × Inflation Increment)

Example: Root Rider
├─ Base: 10 Gold
├─ Increment: +5 per team purchase
├─ First purchase: 10 Gold
├─ Second purchase: 15 Gold
└─ Third purchase: 20 Gold
```

### Budget System

- **Fixed Budget**: 100 Gold per player
- **Cannot Exceed**: Cart confirm fails if total > 100
- **Server-Validated**: Edge Function recalculates at confirmation time
- **Atomic**: Purchase either fully succeeds or fully fails

### Real-Time Updates

When any teammate purchases an item:
1. Database updates with purchase record
2. Realtime event sent to all subscribers
3. Prices recalculate automatically
4. Your screen updates instantly
5. No page refresh needed

### Anti-Cheat: Race Condition Prevention

```
ATTACK SCENARIO:
You see: Root Rider = 10 Gold ← Outdated
Teammate buys → Price becomes 15 Gold
You confirm at old price → REJECTED ✗

SERVER VALIDATION:
1. You submit purchase
2. Server recalculates current price: 15 Gold
3. New total > 100 Gold
4. Server rejects: "Market prices have changed"
5. You refresh and try again with new prices
```

## First Time Setup Checklist

- [ ] Copy `.env.example` to `.env`
- [ ] Add Supabase credentials to `.env`
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:5173
- [ ] Create test lobby with code `TEST01`
- [ ] Join as Player A
- [ ] Open in new tab as Player B
- [ ] Add same items in both tabs
- [ ] See prices update in real-time
- [ ] Confirm purchases and get deep links

## Troubleshooting

### "Failed to fetch items"
**Solution**: Check VITE_SUPABASE_URL is correct in `.env`

### "Player not found"
**Solution**: Reload page, localStorage may be out of sync

### Deep link won't open in Clash
**Solution**: Must have Clash of Clans mobile app installed. Works best on mobile device.

### Prices not updating in real-time
**Solution**: Check browser console for errors. Realtime subscription may have failed.

### "Market prices have changed"
**Solution**: This means another player purchased items and prices changed. Refresh page and try again.

### Edge Function returns 500 error
**Solution**: Check that Supabase project is active. Visit Supabase dashboard to verify.

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Review [SECURITY.md](./SECURITY.md) for anti-cheat details
- Follow [TESTING.md](./TESTING.md) for test scenarios
- Deploy using [DEPLOYMENT.md](./DEPLOYMENT.md)

## Features Overview

✓ **3v3 Tournament Management** - Create lobbies, teams, players
✓ **Hyper-Inflation Economy** - Prices rise as teammates buy items
✓ **Real-Time Updates** - See price changes instantly
✓ **Budget Enforcement** - 100 Gold per player, enforced server-side
✓ **Race Condition Prevention** - Prices validated at confirmation
✓ **Deep Link Generation** - Generate valid Clash of Clans army links
✓ **Mobile-First Design** - Fully responsive interface
✓ **Loadout Locking** - Confirm and lock your army selection

## Gameplay Example

```
TURN 1 - ARMY BUILDING
├─ Player A (Alice) adds:
│  ├─ 5 Root Riders @ 10 = 50 Gold
│  ├─ 3 Overgrowth Spells @ 5 = 15 Gold
│  └─ Total: 65 Gold ← Room for 35 more
├─ Player B (Bob) sees:
│  ├─ Root Riders @ 10 ← Same price
│  └─ Overgrowth @ 5 ← Alice hasn't bought yet
└─ Player C (Charlie) watching

TURN 2 - ALICE CONFIRMS
├─ Alice clicks "Confirm & Generate Link"
├─ Server validates: 65 Gold ≤ 100 ✓
├─ Purchases locked, loadout frozen
├─ Alice gets deep link → imports army to Clash

TURN 3 - PRICES UPDATE
├─ Bob's screen instantly updates:
│  ├─ Root Riders: 10 → 15 Gold (Alice bought)
│  ├─ Overgrowth: 5 → 7 Gold (Alice bought)
│  └─ Total if Bob copies Alice: 80 Gold (instead of 65)
├─ Charlie still sees old prices (Realtime event in transit)
└─ Realtime event arrives → Charlie's prices update too

TURN 4 - BOB DECIDES
├─ Bob can only afford cheaper army now
├─ Adds different items totaling ≤ 100
├─ Confirms and gets army link

TURN 5 - CHARLIE ADJUSTS
├─ Charlie sees final pricing
├─ Chooses army that stays under budget
├─ Confirms and generates link

RESULT: All 3 players have locked-in armies to import
```

## Architecture at a Glance

```
YOU (Browser)
    ↓ (React)
GameContext (State Management)
    ↓ (Realtime Subscriptions)
Supabase PostgreSQL Database
    ↓ (Edge Function on confirmation)
validate-purchase (Server Validation)
    ↓ (Generates)
Clash of Clans Deep Link
    ↓
Your Army in Clash!
```

## Tips & Tricks

**Pro Tips:**
- Share lobby code with friends to play together
- Lower priced items become expensive fast - buy popular items early
- Each team has separate inflation - coordinate with teammates
- Realtime updates mean you see changes instantly - no manual refresh
- Deep links work on mobile - get the Clash app to use them

**Strategy:**
- Plan with team which items to prioritize
- Budget carefully - exceeding 100 Gold auto-fails
- Watch prices as teammates buy - they go up fast
- Diverse armies are better than copying teammates
- Defensive items become expensive, get them early

## Support & Documentation

| Doc | Purpose |
|-----|---------|
| [README.md](./README.md) | Project overview & features |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design & data flow |
| [SECURITY.md](./SECURITY.md) | Anti-cheat, RLS, validation |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | How to deploy to production |
| [TESTING.md](./TESTING.md) | Test scenarios & procedures |
| [QUICKSTART.md](./QUICKSTART.md) | This file - quick reference |

---

**Ready to play?** Run `npm run dev` and start a tournament! 🎮
