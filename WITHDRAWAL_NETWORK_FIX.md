# Withdrawal Network Field - Deployment Guide

## Problem Fixed
Admin panel now shows the exact crypto network (TRC20, ERC20, BEP20, etc.) when users withdraw crypto like USDT.

## Changes Made

### 1. Database Schema ✅
- Added `network` column to `Withdrawal` table (nullable, safe for existing data)

### 2. Server Code ✅
- Updated `prisma/schema.prisma` - added network field
- Updated `src/validators/withdrawal.validators.ts` - network now required for crypto withdrawals
- Updated `src/services/withdrawal/withdrawal.service.ts` - stores and retrieves network

### 3. Client Code ✅
- Updated `src/types/index.ts` - Withdrawal interface includes network
- Updated `src/app/(dashboard)/dashboard/withdraw/page.tsx` - sends network to API
- Updated `src/app/(admin)/admin/withdrawals/page.tsx` - displays network in admin panel

## Deployment Steps (VPS - Zero Downtime)

### Step 1: Run Database Migration on VPS

SSH into your VPS and run:

```bash
# Connect to PostgreSQL
psql -U postgres -d edutradex

# Run this SQL (takes ~1 second, no downtime)
ALTER TABLE "Withdrawal"
ADD COLUMN IF NOT EXISTS network VARCHAR(50);

# Verify
\d "Withdrawal"

# Exit
\q
```

**Why this is safe:**
- ✅ Column is nullable - existing withdrawals unaffected
- ✅ Takes milliseconds
- ✅ No data loss
- ✅ Users won't notice

### Step 2: Deploy Code

On your local machine:

```bash
cd /path/to/Gady
git add .
git commit -m "feat: add network field to crypto withdrawals for admin clarity"
git push
```

On your VPS:

```bash
cd /path/to/edutradex
git pull

# Rebuild client
cd client
npm run build

# Rebuild server (if needed)
cd ../server
npm run build

# Restart app
pm2 restart all
```

### Step 3: Verify

1. **User Side:**
   - Go to withdraw page
   - Select a crypto method (e.g., USDT TRC20)
   - Should see network displayed
   - Submit withdrawal
   - Should not get any errors

2. **Admin Side:**
   - Open admin withdrawals page
   - Click on a crypto withdrawal
   - Should see: "USDT (TRC20)" instead of just "USDT"
   - Network should be highlighted in emerald color

## What Admin Will See Now

### Before:
```
Method: USDT
Wallet: TXn4dF...
```

### After:
```
Method: USDT (TRC20)
Wallet Address: TXn4dF...
Network: TRC20   ← NEW! In emerald color
```

## Backward Compatibility

✅ **Old withdrawals** (before this update):
- Will display as "USDT" (no network info)
- Still works perfectly
- No errors

✅ **New withdrawals** (after this update):
- Will display as "USDT (TRC20)"
- Network clearly visible
- Admin knows exactly which network to use

## Troubleshooting

### If migration fails:
```sql
-- Check if column already exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Withdrawal' AND column_name = 'network';

-- If it exists, you're good!
```

### If client shows errors:
```bash
# Clear build cache
cd client
rm -rf .next
npm run build
pm2 restart client
```

### If validation error on withdrawal:
- Make sure your payment methods in admin panel have `network` field populated
- Example: For USDT TRC20, set network to "TRC20"

## Payment Method Configuration

Make sure your crypto payment methods have the network field set:

1. Go to Admin Panel → Payment Methods
2. Edit crypto methods
3. Set network field:
   - USDT → "TRC20", "ERC20", or "BEP20"
   - BTC → "Bitcoin"
   - ETH → "Ethereum"
   - USDC → "ERC20" or "TRC20"
   etc.

## Testing Checklist

- [ ] Database migration completed without errors
- [ ] Code deployed and server restarted
- [ ] User can submit crypto withdrawal with network
- [ ] Admin sees network in withdrawal details
- [ ] Old withdrawals still display correctly
- [ ] No console errors in browser
- [ ] No errors in server logs

## Summary

This is a **simple, safe update** that:
- ✅ Adds critical network information for crypto withdrawals
- ✅ No breaking changes
- ✅ Works with existing data
- ✅ Takes ~5 minutes to deploy
- ✅ Zero user disruption

**Result:** Admins now know exactly which network to use when processing crypto withdrawals!
