/**
 * Test Script: Synthetic History Generator
 *
 * Run with: npx tsx src/scripts/test-synthetic-history.ts
 */

import { syntheticHistoryGenerator } from '../services/otc/index.js';
import { queryMany } from '../config/db.js';

interface OTCConfig {
  symbol: string;
  baseSymbol: string;
  isEnabled: boolean;
}

async function main() {
  console.log('='.repeat(60));
  console.log('SYNTHETIC HISTORY GENERATOR TEST');
  console.log('='.repeat(60));

  try {
    // Get all enabled OTC symbols
    const configs = await queryMany<OTCConfig>(
      `SELECT symbol, "baseSymbol", "isEnabled" FROM "OTCConfig" WHERE "isEnabled" = true`
    );

    console.log(`\nFound ${configs.length} enabled OTC symbols:\n`);
    configs.forEach(c => console.log(`  - ${c.symbol} (base: ${c.baseSymbol})`));

    if (configs.length === 0) {
      console.log('\nNo enabled OTC configs found. Please enable some first.');
      process.exit(0);
    }

    // Ask which option
    const args = process.argv.slice(2);
    const mode = args[0] || 'single';
    const targetSymbol = args[1] || configs[0].symbol;
    const candleCount = parseInt(args[2] || '500', 10);

    console.log(`\nMode: ${mode}`);
    console.log(`Candle Count: ${candleCount}`);

    if (mode === 'all') {
      // Generate for all symbols
      console.log('\n--- Generating for ALL symbols ---\n');

      const result = await syntheticHistoryGenerator.generateForAllSymbols({
        candleCount,
        resolutionSeconds: 60,
      });

      console.log('\nRESULTS:');
      console.log(`  Total Symbols: ${result.totalSymbols}`);
      console.log(`  Successful: ${result.successful}`);
      console.log(`  Failed: ${result.failed}`);

      if (result.results.length > 0) {
        console.log('\n  Generated:');
        result.results.forEach(r => {
          console.log(`    ${r.symbol}: ${r.candlesGenerated} candles (${r.executionTimeMs}ms)`);
          console.log(`      Range: ${r.priceRange.min.toFixed(5)} - ${r.priceRange.max.toFixed(5)}`);
          console.log(`      Time: ${r.oldestTimestamp.toISOString()} to ${r.newestTimestamp.toISOString()}`);
        });
      }

      if (result.errors.length > 0) {
        console.log('\n  Errors:');
        result.errors.forEach(e => {
          console.log(`    ${e.symbol}: ${e.error}`);
        });
      }
    } else {
      // Generate for single symbol
      console.log(`\n--- Generating for ${targetSymbol} ---\n`);

      // Check current stats before
      const statsBefore = await syntheticHistoryGenerator.getSyntheticHistoryStats(targetSymbol);
      console.log(`Before: ${statsBefore.count} synthetic candles`);

      const result = await syntheticHistoryGenerator.generateForSymbol(targetSymbol, {
        candleCount,
        resolutionSeconds: 60,
      });

      console.log('\nRESULT:');
      console.log(`  Symbol: ${result.symbol}`);
      console.log(`  Candles Generated: ${result.candlesGenerated}`);
      console.log(`  Anchor Price: ${result.anchorPrice}`);
      console.log(`  Price Range: ${result.priceRange.min.toFixed(5)} - ${result.priceRange.max.toFixed(5)}`);
      console.log(`  Time Range: ${result.oldestTimestamp.toISOString()} to ${result.newestTimestamp.toISOString()}`);
      console.log(`  Execution Time: ${result.executionTimeMs}ms`);

      // Check stats after
      const statsAfter = await syntheticHistoryGenerator.getSyntheticHistoryStats(targetSymbol);
      console.log(`\nAfter: ${statsAfter.count} synthetic candles`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nERROR:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
