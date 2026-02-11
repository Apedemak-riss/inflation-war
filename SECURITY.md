# Security Architecture

## Overview

Inflation War implements a multi-layered security approach combining Row Level Security (RLS), Edge Function validation, and defensive indexing to protect tournament data and prevent cheating.

## Security Layers

### 1. Row Level Security (RLS)

All tables have RLS enabled with carefully configured policies:

#### Public Tables (Read-Only or Append-Only)

**Lobbies**
- SELECT: Public (anyone can view war rooms)
- INSERT: Public (anyone can create a lobby with a code)
- UPDATE/DELETE: Disabled (prevent tampering)

**Teams**
- SELECT: Public (view all teams)
- INSERT: Public (join teams during tournament setup)
- UPDATE/DELETE: Disabled

**Players**
- SELECT: Public (view all players in a lobby)
- INSERT: Public (join as a player)
- UPDATE: BLOCKED (all updates go through Edge Function)
- DELETE: Disabled

**Items** (Seed Data)
- SELECT: Public (view available troops/spells)
- INSERT/UPDATE/DELETE: All BLOCKED (immutable master data)

**Purchases**
- SELECT: Public (anyone can see transaction history)
- INSERT: Public (created via Edge Function + cart management)
- UPDATE: Disabled (purchases are immutable once created)
- DELETE: Public (allows cart management before confirmation)

### 2. Server-Side Validation (Edge Function)

The `validate-purchase` Edge Function is the critical security checkpoint:

**What it does:**
1. Authenticates the player exists and is unlocked
2. Fetches current item prices and team usage counts
3. Recalculates prices based on CURRENT database state
4. Validates total cost does not exceed 100 Gold
5. If validation passes:
   - Deletes previous purchase drafts
   - Inserts new purchases with locked prices
   - Updates player status (budget_spent, is_locked)
   - Generates CoC deep link

**Why this matters:**
- Prevents race condition attacks where prices change between viewing and confirmation
- Uses SERVICE_ROLE_KEY to bypass RLS for secure updates
- Ensures all purchases are atomic transactions
- Prevents budget overflow exploits

**Attack prevention:**
```
SCENARIO: Player A views Root Riders at 10 Gold
          Player B purchases and price becomes 15 Gold
          Player A tries to confirm purchase at old 10 Gold price

RESULT: Edge Function recalculates to 15 Gold
        Total exceeds budget
        Request rejected: "Market prices have changed. Please refresh."
```

### 3. Budget Enforcement

- Hard limit: 100 Gold per player
- Validated server-side in Edge Function
- Budget is only updated after confirmation (immutable until then)
- Invalid requests are rejected before database writes

### 4. Loadout Locking

Once a player confirms their loadout:
- `is_locked` flag is set to TRUE
- No further purchases can be made
- Cannot modify existing purchases
- RLS prevents any player updates

### 5. Data Immutability

**Items Table:**
- Seed data only
- All modification operations blocked via RLS
- Price calculations never modify items, only track purchases

**Purchases:**
- Price per unit is locked at purchase time
- Cannot be modified after insertion
- Only insertable for unconfirmed loadouts

## Indexing Strategy

Defensive indexes optimize query performance for critical operations:

```sql
idx_items_type
  - Used by: Dashboard filtering (troops vs spells)
  - Benefit: O(log n) item type filtering

idx_items_coc_id
  - Used by: Deep link generation, item validation
  - Benefit: Validates CoC IDs exist

idx_players_team_id_created
  - Used by: Team lookups, chronological ordering
  - Benefit: Efficient team member queries

idx_purchases_player_created
  - Used by: Transaction history, player cart rebuilds
  - Benefit: Fast purchase history retrieval
```

## Security Assumptions

1. **Client is Untrusted**: All user input is treated as potentially malicious
2. **Edge Function is Trusted**: Uses SERVICE_ROLE_KEY, enforces all validation
3. **Database is Secure**: Supabase manages authentication and access control
4. **CORS is Open**: Anyone can call Edge Functions (validation happens server-side)
5. **Data is Public**: Tournament data is visible to all participants

## Potential Attack Vectors & Mitigations

### Race Condition (Price Inflation)
**Vector**: Submit purchase with outdated price data
**Mitigation**: Edge Function recalculates current prices

### Budget Overflow
**Vector**: Submit purchases totaling > 100 Gold
**Mitigation**: Server-side sum validation + rejection

### Duplicate Purchases
**Vector**: Submit the same cart twice
**Mitigation**: Previous purchases are deleted and replaced atomically

### Unlocked Modification
**Vector**: Try to modify locked player after confirmation
**Mitigation**: RLS blocks all UPDATE operations on players table

### Item Seeding Attack
**Vector**: Insert malicious items into items table
**Mitigation**: INSERT operations blocked via RLS

### Cart Manipulation
**Vector**: Manually insert invalid purchases
**Mitigation**: Edge Function validates ALL item IDs and prices on confirmation

## Edge Function Security

The `validate-purchase` function:
- Uses SERVICE_ROLE_KEY (bypasses RLS for internal operations)
- Validates every input parameter
- Handles all errors gracefully
- Returns appropriate HTTP status codes
- Includes CORS headers for browser access

```typescript
// Safe because:
// 1. Player ID is validated against database
// 2. Cart items are validated against items table
// 3. Prices are recalculated in real-time
// 4. Budget is verified before any write
// 5. Purchases are atomic
```

## Real-Time Updates

Supabase Realtime subscriptions provide instant feedback:
- Purchase changes trigger price updates
- Player status changes reflect locked status
- No manual refresh needed for race condition detection

```typescript
// When another player buys an item:
// 1. Purchase inserted
// 2. Realtime event triggered
// 3. Client receives purchases change
// 4. Prices recalculated on client side
// 5. UI updates immediately
```

## Deployment Checklist

- [ ] Verify all RLS policies are in place
- [ ] Test Edge Function with invalid inputs
- [ ] Confirm SERVICE_ROLE_KEY is secure
- [ ] Verify CORS headers are correct
- [ ] Test race condition scenarios
- [ ] Verify budget enforcement
- [ ] Test loadout locking mechanism
- [ ] Monitor Edge Function logs for errors

## Monitoring & Alerts

Watch for:
- Unusual purchase patterns (many $100 confirmations)
- Failed Edge Function calls (400/500 errors)
- Players attempting locked loadout modifications
- Item table modification attempts
- Duplicate player creations

## Future Improvements

1. **Admin Panel**: Monitor suspicious activity
2. **Rate Limiting**: Prevent brute force cart updates
3. **Audit Logging**: Track all state changes
4. **Player Verification**: Email/account verification
5. **Tamper Detection**: Hash-based data integrity checks
