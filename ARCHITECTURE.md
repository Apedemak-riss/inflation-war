# Architecture Documentation

## System Overview

Inflation War is a 3v3 Clash of Clans tournament management application featuring a hyper-inflation economy where item prices dynamically increase based on team purchasing patterns. The system is built with a **client-server architecture** where critical security operations happen server-side.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┬────────────────┬──────────────┬────────────────┐
│  │ LoginScreen  │ Dashboard      │ Cart         │ SuccessModal   │
│  │              │                │              │                │
│  │ - Join lobby │ - View items   │ - Add/remove │ - Deep link    │
│  │ - Create team│ - Price update │ - Budget bar │ - Copy/Open    │
│  │ - Player name│ - Real-time    │ - Confirm    │ - Status info  │
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
              │  - Data Queries             │
              └─────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ↓                 ↓                 ↓
    ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
    │ Database    │  │ Edge Function│  │ Real-time        │
    │ (PostgreSQL)│  │ (validate)   │  │ (subscriptions)  │
    └─────────────┘  └──────────────┘  └──────────────────┘
```

## Application Layer

### Frontend Structure

**Root Component: `App.tsx`**
- Entry point with GameProvider wrapper
- Routes between LoginScreen and Dashboard based on player state
- Handles app-level loading state

**Context: `GameContext.tsx`**
- Global state management for:
  - Current player data
  - Team information
  - Lobby details
  - Available items with calculated prices
  - Recent purchases (for inflation calculation)
- Realtime subscriptions for:
  - Purchase changes (price updates)
  - Player status changes (locked status)
- Functions:
  - `joinLobby()`: Create lobby/team/player
  - `logout()`: Clear session

**Components:**

1. **LoginScreen** (`LoginScreen.tsx`)
   - 6-character lobby code input
   - Player name input
   - Team name input
   - Validates form before submission
   - Error handling & display

2. **Dashboard** (`Dashboard.tsx`)
   - Main game interface
   - Displays all items organized by type (troops/spells)
   - Renders ItemCard components
   - Shows locked status when confirmation complete
   - Conditionally shows cart (if not locked)

3. **ItemCard** (`ItemCard.tsx`)
   - Single item display
   - Shows current price (with inflation indicator if applicable)
   - Add to cart button
   - Displays housing space requirement
   - Quantity counter if in cart

4. **BudgetBar** (`BudgetBar.tsx`)
   - Spent / Total (spent / 100) display
   - Visual progress bar with color coding:
     - Green: 0-80 Gold spent
     - Amber: 80-100 Gold spent
     - Red: Over 100 Gold
   - Shows confirmation status if locked

5. **Header** (`Header.tsx`)
   - Displays lobby code, team name, player name
   - Logout button
   - Responsive layout

6. **Cart** (`Cart.tsx`)
   - Fixed bottom bar (sticky)
   - Shows all items in cart with quantities
   - Remove individual items or clear all
   - "Confirm & Generate Link" button
   - Calls Edge Function on confirmation
   - Displays errors if prices changed

7. **SuccessModal** (`SuccessModal.tsx`)
   - Shows after successful confirmation
   - Displays generated CoC deep link
   - Copy to clipboard button
   - Open in Clash of Clans button
   - Closes on X button

### Libraries & Tools

**Core Framework:**
- React 18.3: Component framework
- TypeScript: Type safety
- Vite: Build tool & dev server
- Tailwind CSS: Styling
- Lucide React: Icons

**State & Data:**
- Supabase JS SDK: Database, Realtime, Auth

**Utilities:**
- clsx: Conditional CSS classes
- tailwind-merge: CSS class merging

## Backend Architecture

### Database Schema

**Primary Tables:**

```
lobbies
├── id (UUID, PK)
├── code (TEXT, UNIQUE) - 6-char code for joining
├── created_at (TIMESTAMPTZ)

teams
├── id (UUID, PK)
├── lobby_id (UUID, FK)
├── name (TEXT)
├── created_at (TIMESTAMPTZ)

players
├── id (UUID, PK)
├── team_id (UUID, FK)
├── name (TEXT)
├── budget_spent (INT, 0-100)
├── is_locked (BOOL, default false)
├── created_at (TIMESTAMPTZ)

items
├── id (UUID, PK)
├── coc_id (INT) - Game ID for deep link
├── name (TEXT)
├── type (TEXT: 'unit' | 'spell')
├── base_price (INT)
├── inflation_increment (INT)
├── housing_space (INT)
├── created_at (TIMESTAMPTZ)

purchases
├── id (UUID, PK)
├── player_id (UUID, FK)
├── item_id (UUID, FK)
├── quantity (INT)
├── price_per_unit (INT) - Locked price at purchase time
├── created_at (TIMESTAMPTZ)
```

**Relationships:**
```
lobbies 1──────── n teams
teams 1────────── n players
players 1──────── n purchases
items 1────────── n purchases
players 1─ n team_members (implicit through team_id)
```

### Inflation Calculation System

**Formula:**
```
Current Price = Base Price + (Team Usage Count × Inflation Increment)

where:
  Base Price = Price from items table (never changes)
  Team Usage Count = Number of times ANY player in team bought this item
  Inflation Increment = Item's inflation_increment value (some items = 0, no inflation)
```

**Example:**
```
Root Rider (ID: 95)
  base_price: 10
  inflation_increment: 5

Usage Timeline:
1. Player A buys Root Rider → Count = 1, Price = 10 + (0 × 5) = 10
2. Player B buys Root Rider → Count = 1, Price = 10 + (1 × 5) = 15
3. Player C buys Root Rider → Count = 1, Price = 10 + (2 × 5) = 20
```

### Edge Function: validate-purchase

**Location:** `/supabase/functions/validate-purchase/index.ts`

**Responsibility:** Server-side transaction validation and atomic purchase confirmation

**Flow:**
```
1. Receive POST from client with:
   - player_id (UUID)
   - cart (array of { item_id, quantity })

2. Validate:
   - Player exists and is_locked = false
   - All item_ids exist in items table
   - Cart is not empty

3. Calculate Current Prices:
   - Fetch all team members
   - Count purchases by item for entire team
   - Calculate new price for each cart item

4. Sum Costs:
   - Total = sum(current_price × quantity) for all items
   - If total > 100 → REJECT

5. Atomic Transaction:
   - Delete all previous purchases for this player
   - Insert new purchases with locked prices
   - Update player: budget_spent = total, is_locked = true

6. Generate Deep Link:
   - Format: https://link.clashofclans.com/en?action=CopyArmy&army={units}-{spells}
   - units: u{qty}x{coc_id}-u{qty}x{coc_id}...
   - spells: s{qty}x{coc_id}-s{qty}x{coc_id}...

7. Return:
   - success: true
   - deepLink: URL to import army
   - totalCost: final confirmed cost
```

**Security:**
- Uses SERVICE_ROLE_KEY to bypass RLS for safe updates
- All validations server-side (client cannot bypass)
- Price recalculation at confirmation time (race condition prevention)
- Atomic operations (no partial failures)

### Real-Time Subscriptions

**Realtime Channel 1: purchases_changes**
```
Trigger: Any purchase inserted/updated/deleted
On trigger: Reload team's purchases to recalculate prices
Effect: Prices update instantly on all players' screens
```

**Realtime Channel 2: player_changes**
```
Trigger: Player record updated (is_locked, budget_spent change)
On trigger: Update local player state
Effect: Shows confirmation status to other team members
```

### Row Level Security (RLS)

All tables have RLS enabled. Policies enforce:

**Items Table (READ ONLY):**
- SELECT: ✓ Public (anyone can view)
- INSERT/UPDATE/DELETE: ✗ Blocked (seed data only)

**Players Table (INSERT/SELECT only):**
- SELECT: ✓ Public
- INSERT: ✓ Public (joining)
- UPDATE/DELETE: ✗ Blocked (Edge Function handles updates)

**Purchases Table (Client + Edge Function):**
- SELECT: ✓ Public
- INSERT: ✓ Public (Edge Function + draft saves)
- UPDATE: ✗ Blocked (immutable once created)
- DELETE: ✓ Public (cart management)

**Teams/Lobbies:**
- SELECT: ✓ Public
- INSERT: ✓ Public (creating/joining)
- UPDATE/DELETE: ✗ Blocked

## Data Flow

### Scenario 1: Player Joining Lobby

```
1. User enters code/name on LoginScreen
2. Click "Join Battle"
   ↓
3. GameContext.joinLobby() called
   ├─ Check if lobby exists by code
   ├─ Create if not exists
   ├─ Check if team exists in lobby
   ├─ Create if not exists
   ├─ Check max 3 players per team
   └─ Create new player record
4. Save player_id to localStorage
5. Load player data
6. Subscribe to Realtime channels
7. Fetch items from database
8. Transition to Dashboard
9. Render items with current prices (based on purchases)
```

### Scenario 2: Player Adding Item to Cart

```
1. User clicks "Add to Cart" on ItemCard
2. cart state updated locally
3. No database writes yet (draft mode)
4. Cart component recalculates total cost
5. Budget bar updates
6. If total > 100, Confirm button disables
```

### Scenario 3: Player Confirming Purchase

```
1. User clicks "Confirm & Generate Link"
2. Cart component calls validate-purchase Edge Function:
   POST /functions/v1/validate-purchase
   {
     player_id: "uuid",
     cart: [{ item_id: "uuid", quantity: 5 }, ...]
   }
   ↓
3. Edge Function:
   ├─ Validates player and items
   ├─ Fetches team usage counts
   ├─ Recalculates all prices
   ├─ Checks total ≤ 100
   ├─ Deletes old purchases
   ├─ Inserts new purchases
   ├─ Updates player (locked + budget)
   ├─ Generates deep link
   └─ Returns success + deepLink
   ↓
4. Cart component receives response
5. Displays SuccessModal with deep link
6. Realtime event triggers player_changes
7. GameContext updates player.is_locked = true
8. Dashboard shows "Loadout Confirmed" state
9. Items become unclickable
```

### Scenario 4: Real-Time Price Update

```
Timeline:
T0: Player A views Root Rider at 10 Gold

T1: Player B purchases Root Rider
   ├─ Purchase inserted into database
   └─ Realtime event: 'postgres_changes'

T2: Player A's browser receives Realtime event
   ├─ GameContext receives purchases update
   ├─ Recalculates all prices
   ├─ Root Rider: 10 + (1 × 5) = 15 Gold
   └─ itemsWithPrices updated in context

T3: ItemCard re-renders with new price
   ├─ Shows "15" in red
   ├─ Shows "Trending Up +5"
   └─ Player A sees updated price

T4: Player A attempts to confirm old price
   ├─ Edge Function recalculates: now 15
   ├─ Total exceeds budget
   └─ Rejected: "Market prices have changed"
```

## State Management Flow

```
GameContext (Single Source of Truth)
│
├─ player: Player | null
│  └─ Persisted in localStorage
│  └─ Updated via Realtime: player_changes
│
├─ team: Team | null
│  └─ Fetched on login
│  └─ Immutable (no updates)
│
├─ lobby: Lobby | null
│  └─ Fetched on login
│  └─ Immutable (no updates)
│
├─ items: ItemWithPrice[]
│  ├─ Base data from items table
│  ├─ Enhanced with currentPrice calculation
│  ├─ currentPrice = base_price + (usage_count × inflation_increment)
│  ├─ isInflated = currentPrice > base_price
│  └─ Recalculated when purchases change
│
├─ purchases: Purchase[]
│  ├─ Fetched on login
│  ├─ Updated via Realtime: purchases_changes
│  ├─ Used to calculate team usage counts
│  └─ Immutable from client perspective
│
└─ isLoading: boolean
   └─ Loading indicator during async operations
```

## Component Hierarchy

```
App
└─ GameProvider (Context Wrapper)
   └─ AppContent
      └─ (Conditional)
         ├─ LoginScreen
         │  └─ Form inputs
         └─ Dashboard
            ├─ Header
            │  ├─ Title
            │  └─ Logout button
            ├─ BudgetBar
            │  └─ Progress visualization
            ├─ Main Content
            │  ├─ ItemCard (×N for troops)
            │  └─ ItemCard (×N for spells)
            └─ Cart (Fixed bottom)
               ├─ Cart items list
               ├─ Error display
               └─ Confirm button
            └─ SuccessModal (Conditional)
               ├─ Deep link display
               ├─ Copy button
               └─ Open in CoC button
```

## Performance Considerations

**Optimizations:**

1. **Defensive Indexes:**
   - idx_items_type: Fast item filtering
   - idx_items_coc_id: Fast ID lookups
   - idx_players_team_id_created: Team queries
   - idx_purchases_player_created: Purchase history

2. **Realtime Efficiency:**
   - Only subscribe to changes relevant to current team
   - Channel unsubscribe on component unmount
   - No polling, pure event-driven updates

3. **Client-Side Caching:**
   - Items list cached in GameContext
   - Recalculated on purchase events (not on timer)
   - localStorage persists player session

4. **Lazy Calculations:**
   - Prices calculated on render (not on fetch)
   - Use useMemo for cart totals
   - ItemWithPrice computed on-demand

**Potential Bottlenecks:**

- Large number of players in one team (O(n) usage count calculation)
- Very large cart (many items) → O(n) confirmation time
- High-frequency real-time updates (rapid confirms)

*Mitigations* (Phase 2):
- Aggregate purchase counts to summary table
- Batch confirmations
- Rate limiting on Edge Function

## Security Boundaries

```
┌─────────────────────────────────────────────────┐
│ TRUSTED                                         │
│ (Backend/Database)                              │
├─────────────────────────────────────────────────┤
│ Edge Function (validate-purchase)               │
│  • SERVICE_ROLE_KEY (admin access)              │
│  • Final validation authority                   │
│  • Atomic transactions                          │
│  • Generates authoritative deep links           │
├─────────────────────────────────────────────────┤
│ Supabase Database                               │
│  • RLS enforces access control                  │
│  • Items table immutable                        │
│  • Players table read/insert only               │
│  • Purchases immutable after creation           │
│                         ↑ Boundary
├─────────────────────────────────────────────────┤
│ UNTRUSTED                                       │
│ (Client-Side)                                   │
├─────────────────────────────────────────────────┤
│ Frontend Application                            │
│  • Cannot bypass validation                     │
│  • Cannot modify locked purchases               │
│  • Cannot create invalid items                  │
│  • Cannot directly update player state          │
│  • Cannot read SERVICE_ROLE_KEY                 │
└─────────────────────────────────────────────────┘
```

## Deployment Architecture

```
Development
├─ npm run dev
├─ localhost:5173
└─ Hot reload with HMR

Production
├─ npm run build → /dist
├─ Static files (HTML, CSS, JS)
├─ Hosted on CDN (Vercel, Netlify, etc.)
└─ Requests to supabase.co for data

Edge Function Deployment
├─ /supabase/functions/validate-purchase
├─ Deployed to Supabase edge runtime
└─ Serverless (scales automatically)

Database
├─ Supabase PostgreSQL
├─ Replicated backups
├─ Automatic scaling (Free tier caps at reasonable limits)
└─ Real-time subscriptions via websocket
```

## Future Architecture Improvements

1. **Aggregation Layer:** Summary table for pre-calculated inflation
2. **Caching Layer:** Redis for frequently accessed items
3. **Admin Panel:** Manager dashboard for monitoring
4. **Audit Trail:** Event sourcing for compliance
5. **API Versioning:** Support backward compatibility
6. **Microservices:** Separate concerns (validation, notifications, etc.)
7. **Sharding:** Scale for massive tournaments
8. **GraphQL:** More flexible queries
