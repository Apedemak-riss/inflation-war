# Testing Guide

## Pre-Test Setup

1. Deploy application locally: `npm run dev`
2. Open in two browser windows for multi-player testing
3. Use Supabase Dashboard to monitor database changes in real-time

## Test Scenarios

### Test 1: Basic Lobby Creation & Join

**Objective**: Verify players can create and join lobbies

**Steps**:
1. Browser A: Open app
2. Enter Lobby Code: `TEST01`
3. Enter Player Name: `Player A`
4. Enter Team Name: `Team Alpha`
5. Click "Join Battle"
6. Should see Dashboard with items list

**Expected Result**: ✓ Player successfully joins lobby, sees game dashboard

**Verification**:
- Supabase: Check `lobbies`, `teams`, and `players` tables have new entries
- localStorage has `playerId` set

---

### Test 2: Second Player Joins Same Lobby

**Objective**: Verify team mechanics with multiple players

**Steps**:
1. Browser B: Open app in different window
2. Enter same Lobby Code: `TEST01`
3. Enter Player Name: `Player B`
4. Enter Team Name: `Team Alpha`
5. Click "Join Battle"
6. Should see same items list
7. Browser A: Verify items list updates in real-time

**Expected Result**: ✓ Second player joins, both in same team, prices sync

**Verification**:
- Both browsers show same items and prices
- Database has 2 players in same team
- Realtime subscriptions working

---

### Test 3: Price Inflation Mechanism

**Objective**: Verify prices increase as team purchases items

**Steps**:
1. Browser A: Find "Root Rider" (Base Price: 10)
2. Click "Add to Cart" once
3. Verify cart shows: Root Rider x1 @ 10 Gold
4. Browser A: Confirm purchase
5. Should show success modal with CoC deep link
6. Click "Leave" to return to login
7. Create new player in same team (Player C)
8. Find "Root Rider" again
9. Should now show price: 15 Gold (10 + 1 * 5)

**Expected Result**: ✓ Price correctly inflates based on team usage

**Verification**:
- Root Rider shows 15 Gold in cart
- ItemCard shows "Trending Up" indicator with "+5"
- Database purchases table has previous purchase
- Realtime update triggered price recalculation

---

### Test 4: Race Condition Prevention

**Objective**: Verify Edge Function prevents price manipulation

**Steps**:
1. Browser A: Add Root Riders to cart to reach 95 Gold total (could be 9x10 + others)
2. Browser B: Add Root Rider once and confirm purchase (price is now 15)
3. Browser A: Try to confirm purchase (expecting old price of 10)
4. Should see error: "Market prices have changed. Please refresh."

**Expected Result**: ✓ Transaction rejected, no invalid purchases created

**Verification**:
- Error modal appears
- Player A's loadout remains unlocked
- No bad purchases in database
- Edge Function logs show validation failure

---

### Test 5: Budget Enforcement

**Objective**: Verify 100 Gold budget is enforced

**Steps**:
1. New browser window (Browser C)
2. Create new player in fresh team
3. Try to add items worth exactly 100 Gold
4. "Confirm & Generate Link" button should be enabled
5. Confirm purchase - should succeed
6. Browser C: Try to add more items
7. "Confirm & Generate Link" button should be disabled (over budget)
8. Remove items to get back to <= 100 Gold
9. Button should be enabled again

**Expected Result**: ✓ Button disables when over budget, enforced server-side

**Verification**:
- Button state reflects budget correctly
- Budget bar changes color (green -> amber -> red)
- If over budget anyway, Edge Function rejects with error
- No purchase created if over 100 Gold

---

### Test 6: Deep Link Generation

**Objective**: Verify CoC army links are correctly formatted

**Steps**:
1. Create new player
2. Add items to cart:
   - 5 Barbarians (coc_id: 0) = 5 Gold
   - 2 Root Riders (coc_id: 95) = 20 Gold
   - 3 Lightning Spells (coc_id: 0) = 3 Gold
   - Total: 28 Gold
3. Confirm purchase
4. Copy the generated link
5. Should look like: `https://link.clashofclans.com/en?action=CopyArmy&army=u5x0-u2x95-s3x0`

**Expected Result**: ✓ Link format is correct, opens CoC

**Verification**:
- Link contains correct format
- Units are u[qty]x[coc_id]
- Spells are s[qty]x[coc_id]
- Separated by hyphens
- Can open link in CoC (manual test)

---

### Test 7: Loadout Locking

**Objective**: Verify players cannot modify after confirmation

**Steps**:
1. Create new player and confirm a purchase
2. Try to add more items to cart
3. Try to reload page
4. Try to clear cart

**Expected Result**: ✓ Dashboard shows "Loadout Confirmed!", no modifications possible

**Verification**:
- UI shows green confirmation banner
- "Add to Cart" buttons are hidden/disabled
- Cart is frozen
- localStorage playerId still set
- `is_locked` is true in database

---

### Test 8: Logout & Rejoin

**Objective**: Verify session persistence and cleanup

**Steps**:
1. Create and confirm loadout as Player D
2. Click "Leave" button
3. Should return to login screen
4. localStorage `playerId` should still exist
5. Refresh page - should auto-load dashboard (not login)
6. Create new player with different name in same lobby

**Expected Result**: ✓ Sessions persist correctly, can create multiple players

**Verification**:
- First player's confirmed loadout remains in DB
- New player joins same team
- Both have separate records
- Prices reflect both players' purchases

---

### Test 9: Real-Time Price Updates

**Objective**: Verify Realtime subscriptions work correctly

**Steps**:
1. Browser A: Open dashboard, watch prices
2. Browser B: In same team, add and confirm a volatile item
3. Browser A: Without refreshing, prices should update in real-time
4. Verify specific item price increased

**Expected Result**: ✓ Prices update instantly without page refresh

**Verification**:
- Price change appears within 1-2 seconds
- No "Realtime: connection failed" errors
- Supabase Dashboard > Realtime shows active subscriptions
- Browser console shows no errors

---

### Test 10: Multiple Teams in Same Lobby

**Objective**: Verify team isolation (prices don't cross teams)

**Steps**:
1. Browser A (Team Alpha): Add Root Rider, confirm (price 10)
2. Browser B (Team Beta): Same lobby code, different team name
3. Add Root Rider to cart in Team Beta
4. Should show price 10 (not inflated by Team Alpha's purchase)
5. Confirm purchase

**Expected Result**: ✓ Each team has separate inflation count

**Verification**:
- Team Alpha's purchases don't affect Team Beta prices
- Each team's usage count is independent
- Database shows separate purchase records
- Supabase Dashboard shows 2 teams in 1 lobby

---

## Stress Tests

### Stress Test 1: Rapid Fire Purchases

**Objective**: Verify system handles rapid confirmations

**Steps**:
1. Create 3 players in same team
2. Each quickly adds different items and confirms
3. Monitor prices update correctly each time

**Expected Result**: ✓ No race conditions, prices sequential

---

### Stress Test 2: Large Team (3 players max)

**Objective**: Verify max 3 players per team

**Steps**:
1. Create Team Alpha with 3 players
2. Try to add 4th player
3. Should get error: "Team is full"

**Expected Result**: ✓ Enforcement works

---

### Stress Test 3: Many Items in Cart

**Objective**: Verify cart can handle many items

**Steps**:
1. Add 20+ different items to cart
2. Cart should handle without lag
3. Confirm purchase should work

**Expected Result**: ✓ No performance issues

---

## Browser Compatibility Tests

Test in:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

**Checklist**:
- [ ] Responsive design works on mobile
- [ ] Touch interactions work on mobile
- [ ] No console errors
- [ ] Realtime updates work
- [ ] Deep links open correctly

---

## Database Integrity Tests

### Query: Verify RLS Policies

```sql
-- Items should be read-only
-- This should fail:
INSERT INTO items (coc_id, name, type, base_price, inflation_increment, housing_space)
VALUES (999, 'Hacker Item', 'troop', 100, 0, 1);
-- Expected: Permission denied or rows affected = 0

-- Players should not be directly updatable
-- This should fail:
UPDATE players SET is_locked = true WHERE id = 'some-id';
-- Expected: Permission denied or rows affected = 0
```

### Query: Check Purchase Integrity

```sql
-- Verify no purchases exceed budget
SELECT player_id, SUM(quantity * price_per_unit) as total_cost
FROM purchases
GROUP BY player_id
HAVING SUM(quantity * price_per_unit) > 100;
-- Expected: No results (empty)

-- Verify no locked players have new purchases
SELECT p.id, p.is_locked, COUNT(pur.id) as purchase_count
FROM players p
LEFT JOIN purchases pur ON p.id = pur.player_id
WHERE p.is_locked = true
GROUP BY p.id
HAVING COUNT(pur.id) > 0;
-- Expected: No results (purchases should be locked-in before is_locked=true)
```

---

## Performance Tests

### Lighthouse Audit

```bash
npm run build
# Open dist/index.html in Chrome
# Run Lighthouse audit
```

**Target Scores**:
- Performance: > 85
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### Network Throttling

Test with Chrome DevTools network throttling:
- [ ] Slow 3G
- [ ] Fast 3G
- [ ] 4G
- [ ] Offline

---

## Manual Checklist

- [ ] Button hover effects smooth
- [ ] Form validation works
- [ ] Error messages clear and helpful
- [ ] Loading spinners show
- [ ] Images load correctly
- [ ] Colors have sufficient contrast
- [ ] Text is readable at all sizes
- [ ] No broken links
- [ ] Copy button works
- [ ] Open in CoC link works
- [ ] Logout clears data properly
- [ ] Back button doesn't break app

---

## Regression Test Before Release

1. Run all 10 core tests
2. Run stress tests
3. Browser compatibility check
4. Database integrity verification
5. Performance audit
6. Manual checklist complete
7. Edge Function logs reviewed for errors

---

## Known Limitations (For Documentation)

1. No email verification - anyone can join
2. No account recovery - uses localStorage
3. No admin panel - cannot moderate
4. No rate limiting - can spam requests
5. No duplicate prevention - same player name allowed
6. Public read access - all data visible

(These would be addressed in Phase 2)
