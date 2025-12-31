# OTC Admin Panel - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Accessing the Panel](#accessing-the-panel)
3. [Dashboard Tabs](#dashboard-tabs)
4. [Configurations Tab](#configurations-tab)
5. [Exposures Tab](#exposures-tab)
6. [Activity Tab](#activity-tab)
7. [Manual Controls Tab](#manual-controls-tab)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The OTC (Over-The-Counter) Admin Panel provides complete control over synthetic market instruments. OTC markets operate independently from real markets, allowing 24/7 trading availability with admin-controlled pricing and risk management.

### Key Concepts

| Term | Description |
|------|-------------|
| **OTC Symbol** | Synthetic trading pair (e.g., EUR/USD-OTC) that operates independently |
| **Base Symbol** | The real market symbol used as reference (e.g., EUR/USD) |
| **Risk Engine** | Automated system that influences trade outcomes based on platform exposure |
| **Manual Control** | Direct admin intervention on prices, trades, or user outcomes |
| **Direction Bias** | Pushes price movement in a specific direction (up or down) |
| **Exposure** | Platform's financial risk based on open trade positions |

---

## Accessing the Panel

Navigate to: **Admin Dashboard → OTC Markets**

Required permissions: Admin role

---

## Dashboard Tabs

The OTC Admin Panel has 4 main tabs:

| Tab | Purpose |
|-----|---------|
| **Configurations** | Manage OTC trading pairs and their settings |
| **Exposures** | Monitor real-time risk exposure per symbol |
| **Activity** | View system activity and intervention logs |
| **Manual Controls** | Direct market manipulation and targeting |

---

## Configurations Tab

### What It Does
Manage all OTC trading pairs - create new pairs, enable/disable trading, and configure price generation and risk parameters.

### Features

#### Creating a New OTC Pair
1. Click **"Add OTC Pair"** button
2. Fill in the required fields:
   - **Symbol**: The OTC symbol name (e.g., `GBP/USD-OTC`)
   - **Base Symbol**: Real market reference (e.g., `GBP/USD`)
   - **Display Name**: User-friendly name shown to traders
   - **Market Type**: FOREX or CRYPTO

#### Configuration Sections

**Basic Settings**
| Field | Description | Recommended |
|-------|-------------|-------------|
| Symbol | OTC pair identifier | Must end with `-OTC` |
| Base Symbol | Real market reference | Match real symbol exactly |
| Display Name | Shown to users | Clear, professional name |
| Market Type | FOREX or CRYPTO | Match the asset class |
| Pip Size | Smallest price increment | 0.0001 for most forex, 0.01 for JPY pairs |
| Is Enabled | Allow trading | Toggle on/off |
| Risk Enabled | Enable risk engine | Keep ON for protection |

**Price Generation Settings**
| Field | Description | Range |
|-------|-------------|-------|
| Base Volatility | Normal price movement size | 0.0001 - 0.001 |
| Volatility Multiplier | Amplify/reduce volatility | 0.5 - 2.0 |
| Mean Reversion Strength | How quickly price returns to average | 0.001 - 0.003 |
| Max Deviation % | Maximum drift from anchor price | 0.5% - 3% |

**Risk Engine Settings**
| Field | Description | Range |
|-------|-------------|-------|
| Payout Percent | Win payout percentage | 80% - 92% |
| Min Trade Amount | Minimum allowed trade | $1 - $10 |
| Max Trade Amount | Maximum allowed trade | $500 - $10,000 |
| Exposure Threshold | When to start interventions | 0.25 - 0.50 |
| Min Intervention Rate | Minimum influence on outcomes | 0.20 - 0.30 |
| Max Intervention Rate | Maximum influence on outcomes | 0.35 - 0.45 |

#### Quick Actions
- **Toggle Switch**: Enable/disable the pair instantly
- **Shield Icon**: Enable/disable risk engine
- **Edit Button**: Open full configuration modal
- **Delete Button**: Remove the pair (requires confirmation)

#### Bulk Operations
Select multiple pairs using checkboxes, then:
- **Bulk Enable/Disable**: Toggle trading for all selected
- **Bulk Risk Toggle**: Enable/disable risk engine for all selected

---

## Exposures Tab

### What It Does
Shows real-time financial exposure for each OTC symbol. Helps you understand platform risk and where intervention may be needed.

### Reading the Exposure Cards

Each symbol shows:

| Metric | Description | What to Watch |
|--------|-------------|---------------|
| **UP Trades** | Total amount bet on price going UP | Large imbalance = risk |
| **DOWN Trades** | Total amount bet on price going DOWN | Large imbalance = risk |
| **Net Exposure** | Difference between UP and DOWN | Higher = more risk |
| **Exposure Ratio** | Imbalance as percentage | >50% = concerning |
| **Interventions** | Successful/Total risk interventions | Shows system activity |

### Color Indicators
- 🟢 **Green (< 30%)**: Healthy, balanced exposure
- 🟡 **Amber (30-50%)**: Moderate imbalance, monitor closely
- 🔴 **Red (> 50%)**: High imbalance, intervention likely active

### Reset Exposure
Click "Reset Exposure" to clear the tracking data for a symbol. Use when:
- Starting fresh after maintenance
- Clearing stale data
- Testing purposes

---

## Activity Tab

### What It Does
Displays a chronological log of all OTC system events, including:
- Configuration changes
- Risk interventions
- Manual control actions
- System events

### Event Types

| Event | Icon | Description |
|-------|------|-------------|
| CONFIG_CREATED | ➕ | New OTC pair added |
| CONFIG_UPDATED | ✏️ | Settings changed |
| CONFIG_DELETED | 🗑️ | Pair removed |
| RISK_INTERVENTION | ⚠️ | Automated outcome influence |
| MANUAL_INTERVENTION | 🎯 | Admin forced outcome |
| PRICE_OVERRIDE | 💰 | Admin set specific price |

---

## Manual Controls Tab

### What It Does
Provides direct control over OTC market behavior. Use for:
- Pushing prices in specific directions
- Forcing specific trade outcomes
- Targeting specific users
- Overriding automatic pricing

### Live Price Overview (OTC vs Real Market)

At the top, you'll see all enabled OTC pairs with a side-by-side comparison:

| Column | Description |
|--------|-------------|
| **OTC Price** | Current synthetic OTC price (amber label) |
| **Real Price** | Current real market price from Deriv/Binance (blue label) |
| **Gap** | Difference between OTC and Real in pips and percentage |

#### Gap Color Indicators
- 🟢 **Green (< 20 pips)**: Healthy, OTC is close to real market
- 🟡 **Amber (20-50 pips)**: Moderate deviation, monitor
- 🔴 **Red (> 50 pips)**: Large deviation, may need adjustment

#### Selected Symbol Display
When you select a pair, the header shows:
- **OTC Price**: Large display with change percentage
- **Real Market**: Large display with change percentage
- **Gap Indicator**: Prominent box showing pip difference and percentage

This helps you:
1. See if OTC price has drifted too far from real market
2. Decide if you need to apply direction bias to correct
3. Monitor the effect of your manual controls in real-time

Click any pair to select it for manual control.

---

### Direction Bias

**Purpose**: Push the market price in a specific direction over time.

#### Controls

| Control | Range | Description |
|---------|-------|-------------|
| **Bias Slider** | -100 to +100 | Direction and intensity. Negative = DOWN, Positive = UP |
| **Strength** | 0% to 100% | How strongly the bias affects price |
| **Duration** | Permanent or 5min - 24hr | How long the bias lasts |

#### How It Works
- Uses **probabilistic approach** for natural-looking charts
- At maximum settings (bias=100, strength=100%):
  - 75% of candles move in bias direction
  - 25% show natural pullbacks/corrections
- Lower settings = more natural market appearance

#### Examples

| Scenario | Bias | Strength | Duration | Effect |
|----------|------|----------|----------|--------|
| Gentle upward push | +30 | 50% | 1 hour | Slight upward tendency, very natural |
| Strong downward move | -80 | 80% | 15 min | Noticeable drop, some pullbacks |
| Maximum push up | +100 | 100% | 5 min | Strong upward movement |

#### Best Practices
1. Start with lower strength (30-50%) for natural appearance
2. Use short durations (5-15 min) for quick adjustments
3. Avoid maximum settings for extended periods
4. Monitor the chart to verify effect

---

### Volatility Override

**Purpose**: Increase or decrease price movement intensity.

#### Controls

| Multiplier | Effect |
|------------|--------|
| 0.1x - 0.5x | Very calm, slow movements |
| 0.5x - 0.8x | Reduced volatility |
| 1.0x | Normal volatility (default) |
| 1.2x - 1.5x | Increased movement |
| 2.0x - 3.0x | High volatility, fast movements |
| 3.0x - 5.0x | Extreme volatility |

#### When to Use
- **Lower volatility**: During news events to prevent extreme moves
- **Higher volatility**: To create trading opportunities
- **Reset to 1.0x**: Return to normal operation

---

### Price Override

**Purpose**: Set an exact price for the symbol.

#### Controls
- **Price Input**: The exact price to set
- **Duration**: How long the override lasts (5 min - 24 hours)

#### How It Works
1. Enter the desired price
2. Select duration
3. Click "Set Override"
4. Price immediately jumps to set value
5. After expiry, returns to normal generation

#### Use Cases
- Correcting a price that drifted too far
- Setting a specific price for a promotion
- Testing purposes

#### Warning
Price overrides are visible to traders as sudden jumps. Use sparingly and with appropriate values.

---

### Active Trades Panel

**Purpose**: View and control currently open trades on the selected symbol.

#### Information Shown
| Column | Description |
|--------|-------------|
| User | Trader's name/ID |
| Direction | UP or DOWN bet |
| Amount | Trade size in dollars |
| Entry Price | Price when trade opened |
| Current Price | Live market price |
| Time Left | Seconds until settlement |
| P/L | Current profit/loss status |

#### Force Trade Outcome

For each active trade, you can:
- **Force WIN**: Make the trade win regardless of price
- **Force LOSE**: Make the trade lose regardless of price

#### How Forced Outcomes Work
1. Click "Force Win" or "Force Lose"
2. When trade settles, outcome is guaranteed
3. Exit price is calculated to match forced result
4. Small margin (3 pips) ensures clear win/loss

#### When to Use
- VIP user needs a win
- Suspicious trading activity
- Promotional purposes
- Testing

---

### User Targeting Panel

**Purpose**: Set custom win rates or force outcomes for specific users.

#### Options

| Setting | Description |
|---------|-------------|
| **Target Win Rate** | Set custom win percentage (0-100%) for the user |
| **Force Next Win** | Number of next trades that will win |
| **Force Next Lose** | Number of next trades that will lose |
| **Symbol Filter** | Apply to specific symbol or all OTC |

#### Examples

| Scenario | Settings |
|----------|----------|
| VIP user gets 60% win rate | Target Win Rate: 60% |
| New user gets 3 wins | Force Next Win: 3 |
| Suspicious user loses next 5 | Force Next Lose: 5 |
| User always loses on EUR/USD | Target Win Rate: 0%, Symbol: EUR/USD-OTC |

#### Managing Targets
- View all active targets in the panel
- Click "Remove" to delete a target
- Targets persist until manually removed

---

### Intervention Log

**Purpose**: Audit trail of all manual actions taken.

#### Logged Actions
- Direction bias changes
- Volatility overrides
- Price overrides
- Forced trade outcomes
- User targeting changes

#### Information Recorded
- Timestamp
- Admin who performed action
- Action type
- Target (symbol, trade ID, or user ID)
- Previous and new values
- Reason (if provided)

---

## Best Practices

### General Guidelines

1. **Start Conservative**
   - Use lower strength settings first
   - Test on less active symbols
   - Monitor effects before increasing

2. **Document Actions**
   - Always provide a reason when prompted
   - Review intervention logs regularly
   - Track patterns and outcomes

3. **Avoid Detection**
   - Don't use maximum settings for long periods
   - Allow natural pullbacks
   - Vary your interventions

4. **Monitor Exposure**
   - Check exposure tab regularly
   - Let risk engine handle routine balancing
   - Use manual controls for specific situations

### Direction Bias Guidelines

| Goal | Recommended Settings |
|------|---------------------|
| Subtle influence | Bias: ±20-40, Strength: 30-50% |
| Moderate push | Bias: ±50-70, Strength: 50-70% |
| Strong movement | Bias: ±80-100, Strength: 70-90% |

### User Targeting Ethics

- Use for legitimate business purposes
- Document reasons for all targeting
- Review targets regularly
- Remove targets when no longer needed

---

## Troubleshooting

### Prices Not Updating
1. Check WebSocket connection status (green dot = connected)
2. Refresh the page
3. Verify the OTC pair is enabled
4. Check server logs for errors

### Manual Controls Not Working
1. Ensure the symbol is enabled
2. Check you have admin permissions
3. Verify the server is running
4. Look for error toasts

### Direction Bias Has No Effect
1. Confirm bias is not 0
2. Check strength is above 0%
3. Wait for a few candles to see effect
4. Verify no price override is active (overrides take priority)

### User Targeting Not Applied
1. Ensure targeting is active (check targets list)
2. Verify correct user ID
3. Check symbol filter if set
4. Confirm trades are on OTC symbols

### High Exposure Warning
1. Check exposure tab for imbalance
2. Risk engine should handle automatically
3. Consider manual direction bias to rebalance
4. Review recent large trades

---

## Quick Reference

### Control Priority (Highest to Lowest)
1. Price Override (sets exact price)
2. Direction Bias (influences direction)
3. Volatility Multiplier (affects movement size)
4. Risk Engine (automated balancing)

### Keyboard Shortcuts
- **Refresh**: Click refresh button or press F5
- **Tab Navigation**: Click tab headers

### Common Scenarios

| I want to... | Use this... |
|--------------|-------------|
| Push price up gradually | Direction Bias +50, Strength 50%, 15 min |
| Make market very active | Volatility 2.0x |
| Set exact price now | Price Override |
| Help a VIP win | Force trade outcome or User targeting |
| Reduce platform risk | Check exposure, apply opposite bias |

---

## Support

For technical issues or questions:
- Check server logs: `edutradex/server/logs/`
- Review this guide
- Contact development team

---

*Last Updated: December 2024*
