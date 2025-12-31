import { otcPriceGenerator } from '../services/otc/otc-price-generator.js';

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

async function analyze() {
  console.log('=== EUR/USD-OTC Movement Analysis (20 ticks) ===\n');

  otcPriceGenerator.initializeSymbol(forexConfig, 1.19080);
  otcPriceGenerator.updateRealPrice(forexConfig.symbol, 1.19080);

  let prev = 1.19080;
  const moves: number[] = [];
  let up = 0, down = 0;
  let tickCount = 0;

  console.log('Tick | Price      | Pips  | Dir | Wave');
  console.log('-'.repeat(50));

  while (tickCount < 20) {
    const tick = otcPriceGenerator.generateNextPrice(forexConfig.symbol);
    if (tick) {
      const change = tick.price - prev;
      const pips = Math.abs(change) / forexConfig.pipSize;
      moves.push(pips);
      if (change >= 0) up++; else down++;

      const state = otcPriceGenerator.getExtendedState(forexConfig.symbol) as any;
      const waveDir = state?.w?.d === 1 ? 'UP' : 'DN';
      const isPullback = state?.w?.ip ? 'PB' : '  ';

      console.log(
        '  ' + String(tickCount+1).padStart(2) + ' | ' + tick.price.toFixed(5) + ' | ' + pips.toFixed(1).padStart(4) + '  | ' + (change >= 0 ? 'UP' : 'DN') + ' | ' + waveDir + ' ' + isPullback
      );
      prev = tick.price;
      tickCount++;
    }
    await new Promise(r => setTimeout(r, 550));
  }

  const avg = moves.reduce((a, b) => a + b, 0) / moves.length;
  console.log('\n--- Summary ---');
  console.log('Avg: ' + avg.toFixed(2) + ' pips | Up: ' + up + ' | Down: ' + down);
  console.log('Trend bias: ' + ((Math.max(up,down)/20)*100).toFixed(0) + '%');

  process.exit(0);
}

analyze();
