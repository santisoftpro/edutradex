/**
 * Analyze OTC Price Movement
 */
import { otcPriceGenerator } from '../services/otc/otc-price-generator.js';

// EUR/USD config (Forex)
const forexConfig = {
  symbol: 'EUR/USD-OTC',
  baseSymbol: 'EUR/USD',
  marketType: 'FOREX' as const,
  pipSize: 0.00001,
  baseVolatility: 0.0002,
  volatilityMultiplier: 1.0,
  meanReversionStrength: 0.001,
  maxDeviationPercent: 0.5,
  priceOffsetPips: 2.0,
  momentumFactor: 0.15,
  garchAlpha: 0.1,
  garchBeta: 0.85,
  garchOmega: 0.05,
};

// BTC/USD config (Crypto)
const cryptoConfig = {
  symbol: 'BTC/USD-OTC',
  baseSymbol: 'BTC/USD',
  marketType: 'CRYPTO' as const,
  pipSize: 0.01,
  baseVolatility: 0.0005,
  volatilityMultiplier: 1.0,
  meanReversionStrength: 0.001,
  maxDeviationPercent: 2.0,
  priceOffsetPips: 3.0,
  momentumFactor: 0.2,
  garchAlpha: 0.1,
  garchBeta: 0.85,
  garchOmega: 0.05,
};

async function analyzeMovement() {
  console.log('======================================================================');
  console.log('OTC PRICE MOVEMENT ANALYSIS');
  console.log('======================================================================');
  console.log('');

  // Test FOREX
  console.log('--- EUR/USD-OTC (FOREX) ---');
  const forexInitial = 1.19080;
  otcPriceGenerator.initializeSymbol(forexConfig, forexInitial);
  otcPriceGenerator.updateRealPrice(forexConfig.symbol, forexInitial);

  let forexPrev = forexInitial;
  const forexMoves: number[] = [];
  let forexUpCount = 0;
  let forexDownCount = 0;

  console.log('Tick | Price      | Change (pips) | Direction');
  console.log('--------------------------------------------------');

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 50));
    const tick = otcPriceGenerator.generateNextPrice(forexConfig.symbol);
    if (tick) {
      const change = tick.price - forexPrev;
      const pips = Math.abs(change) / forexConfig.pipSize;
      forexMoves.push(pips);
      const dir = change >= 0 ? 'UP' : 'DOWN';
      if (change >= 0) forexUpCount++; else forexDownCount++;
      console.log(`  ${String(i+1).padStart(2)} | ${tick.price.toFixed(5)} |  ${pips.toFixed(1).padStart(5)} pips   | ${dir}`);
      forexPrev = tick.price;
    }
  }

  const forexAvg = forexMoves.reduce((a, b) => a + b, 0) / forexMoves.length;
  const forexMax = Math.max(...forexMoves);
  const forexMin = Math.min(...forexMoves);

  console.log('');
  console.log(`FOREX Summary:`);
  console.log(`  Avg: ${forexAvg.toFixed(1)} pips | Min: ${forexMin.toFixed(1)} | Max: ${forexMax.toFixed(1)}`);
  console.log(`  Direction: ${forexUpCount} UP, ${forexDownCount} DOWN (${((forexUpCount/30)*100).toFixed(0)}% up bias)`);
  console.log('');

  // Test CRYPTO
  console.log('--- BTC/USD-OTC (CRYPTO) ---');
  const cryptoInitial = 94500.00;
  otcPriceGenerator.initializeSymbol(cryptoConfig, cryptoInitial);
  otcPriceGenerator.updateRealPrice(cryptoConfig.symbol, cryptoInitial);

  let cryptoPrev = cryptoInitial;
  const cryptoMoves: number[] = [];
  let cryptoUpCount = 0;
  let cryptoDownCount = 0;

  console.log('Tick | Price        | Change (pips) | Direction');
  console.log('-------------------------------------------------------');

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 50));
    const tick = otcPriceGenerator.generateNextPrice(cryptoConfig.symbol);
    if (tick) {
      const change = tick.price - cryptoPrev;
      const pips = Math.abs(change) / cryptoConfig.pipSize;
      cryptoMoves.push(pips);
      const dir = change >= 0 ? 'UP' : 'DOWN';
      if (change >= 0) cryptoUpCount++; else cryptoDownCount++;
      console.log(`  ${String(i+1).padStart(2)} | ${tick.price.toFixed(2).padStart(10)} |  ${pips.toFixed(1).padStart(5)} pips   | ${dir}`);
      cryptoPrev = tick.price;
    }
  }

  const cryptoAvg = cryptoMoves.reduce((a, b) => a + b, 0) / cryptoMoves.length;
  const cryptoMax = Math.max(...cryptoMoves);
  const cryptoMin = Math.min(...cryptoMoves);

  console.log('');
  console.log(`CRYPTO Summary:`);
  console.log(`  Avg: ${cryptoAvg.toFixed(1)} pips | Min: ${cryptoMin.toFixed(1)} | Max: ${cryptoMax.toFixed(1)}`);
  console.log(`  Direction: ${cryptoUpCount} UP, ${cryptoDownCount} DOWN (${((cryptoUpCount/30)*100).toFixed(0)}% up bias)`);
  console.log('');

  console.log('======================================================================');
  console.log('EXPECTED RANGES (from V5 Wave Generator):');
  console.log('======================================================================');
  console.log('  FOREX:  0.24-2.4 pips (small=0.24-0.64, med=0.64-1.2, large=1.2-2.4)');
  console.log('  CRYPTO: 1.2-12.0 pips (4x forex due to mm=4.0 multiplier)');
  console.log('');
  console.log('Wave behavior: 78% trend direction, 22% counter-trend');
  console.log('Pullback: 18-25% probability, 1-3 ticks, 40% strength');
  console.log('======================================================================');

  process.exit(0);
}

analyzeMovement();
