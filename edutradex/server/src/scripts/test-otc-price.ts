/**
 * Test OTC Price Movement - Extended Test
 * Verifies the pip-based price generation with all market phases
 */

import { otcPriceGenerator } from '../services/otc/otc-price-generator.js';

// Test configuration for BTC
const btcConfig = {
  symbol: 'BTC/USD-OTC',
  baseSymbol: 'BTC/USD',
  marketType: 'CRYPTO' as const,
  name: 'Bitcoin OTC',
  pipSize: 0.01,
  isEnabled: true,
  riskEnabled: true,
  baseVolatility: 0.0005,
  volatilityMultiplier: 1.0,
  meanReversionStrength: 0.001,
  maxDeviationPercent: 2.0,
  priceOffsetPips: 3.0,
  momentumFactor: 0.2,
  garchAlpha: 0.1,
  garchBeta: 0.85,
  garchOmega: 0.05,
  exposureThreshold: 0.35,
  minInterventionRate: 0.25,
  maxInterventionRate: 0.40,
  spreadMultiplier: 1.5,
  payoutPercent: 80,
  minTradeAmount: 1,
  maxTradeAmount: 1000,
  is24Hours: true,
  anchoringDurationMins: 15,
};

const initialPrice = 89940.70;

async function testPriceMovement() {
  console.log('='.repeat(70));
  console.log('OTC PRICE MOVEMENT TEST - BTC/USD-OTC');
  console.log('='.repeat(70));
  console.log('');
  console.log('Initial price: $' + initialPrice.toFixed(2));
  console.log('Pip size: $' + btcConfig.pipSize);
  console.log('');
  console.log('Expected behavior:');
  console.log('  - Normal: 0.5-2 pips ($0.005-$0.02) per tick');
  console.log('  - Consolidation: 0.1-0.3 pips ($0.001-$0.003) per tick');
  console.log('  - Impulse: 2-5 pips ($0.02-$0.05) per tick');
  console.log('  - Max: 8 pips ($0.08) per tick');
  console.log('');
  console.log('='.repeat(70));
  console.log('');

  // Initialize
  otcPriceGenerator.initializeSymbol(btcConfig, initialPrice);
  otcPriceGenerator.updateRealPrice(btcConfig.symbol, initialPrice);

  // Force an impulse move to see larger movements
  console.log('>>> Forcing IMPULSE UP to demonstrate larger movements...');
  otcPriceGenerator.forceImpulse(btcConfig.symbol, 'up', 5);
  console.log('');

  const phaseStats: Record<string, number[]> = {
    normal: [],
    impulse: [],
    consolidation: []
  };

  let prevPrice = initialPrice;
  let tickCount = 0;
  const maxTicks = 30;

  console.log('Tick | Price       | Change      | Pips | Phase');
  console.log('-'.repeat(60));

  for (let attempt = 0; attempt < 200 && tickCount < maxTicks; attempt++) {
    const tick = otcPriceGenerator.generateNextPrice(btcConfig.symbol);

    if (tick) {
      const priceChange = tick.price - prevPrice;
      const pipChange = Math.abs(priceChange / btcConfig.pipSize);
      const state = otcPriceGenerator.getExtendedState(btcConfig.symbol);
      const wave = (state as any)?.w; const phase = wave?.ip ? 'pullback' : 'wave';

      phaseStats[phase].push(pipChange);

      const direction = priceChange >= 0 ? '+' : '-';
      console.log(
        `${String(tickCount + 1).padStart(4)} | ` +
        `$${tick.price.toFixed(2).padStart(9)} | ` +
        `${direction}$${Math.abs(priceChange).toFixed(2).padStart(5)} | ` +
        `${pipChange.toFixed(1).padStart(4)} | ` +
        `${phase}`
      );

      prevPrice = tick.price;
      tickCount++;

      // Force consolidation after impulse
      if (tickCount === 10) {
        console.log('');
        console.log('>>> Forcing CONSOLIDATION to demonstrate flat periods...');
        otcPriceGenerator.forceConsolidation(btcConfig.symbol, 8);
        console.log('');
      }

      // Force another impulse
      if (tickCount === 20) {
        console.log('');
        console.log('>>> Forcing IMPULSE DOWN...');
        otcPriceGenerator.forceImpulse(btcConfig.symbol, 'down', 5);
        console.log('');
      }
    }

    await new Promise(r => setTimeout(r, 30));
  }

  // Summary
  console.log('');
  console.log('='.repeat(70));
  console.log('PHASE STATISTICS');
  console.log('='.repeat(70));
  console.log('');

  for (const [phase, movements] of Object.entries(phaseStats)) {
    if (movements.length > 0) {
      const avg = movements.reduce((a, b) => a + b, 0) / movements.length;
      const max = Math.max(...movements);
      const min = Math.min(...movements);
      console.log(`${phase.toUpperCase()}:`);
      console.log(`  Ticks: ${movements.length}`);
      console.log(`  Avg: ${avg.toFixed(2)} pips ($${(avg * btcConfig.pipSize).toFixed(3)})`);
      console.log(`  Min: ${min.toFixed(2)} pips ($${(min * btcConfig.pipSize).toFixed(3)})`);
      console.log(`  Max: ${max.toFixed(2)} pips ($${(max * btcConfig.pipSize).toFixed(3)})`);
      console.log('');
    }
  }

  // Final price comparison
  const totalChange = prevPrice - initialPrice;
  console.log('='.repeat(70));
  console.log('FINAL RESULT');
  console.log('='.repeat(70));
  console.log(`Start: $${initialPrice.toFixed(2)}`);
  console.log(`End:   $${prevPrice.toFixed(2)}`);
  console.log(`Total change: $${totalChange.toFixed(2)} (${(totalChange / btcConfig.pipSize).toFixed(1)} pips)`);
  console.log('');
  console.log('COMPARISON:');
  console.log('  PocketOption BTC moves: ~$0.02 per tick');
  console.log(`  Our BTC moves: ~$${(phaseStats.normal.length > 0 ? (phaseStats.normal.reduce((a,b)=>a+b,0)/phaseStats.normal.length * btcConfig.pipSize) : 0.01).toFixed(3)} per normal tick`);
  console.log('');
  console.log('='.repeat(70));
}

testPriceMovement()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
