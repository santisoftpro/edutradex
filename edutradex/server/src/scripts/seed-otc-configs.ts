/**
 * OTC Configuration Seed Script
 *
 * Creates default OTC configurations for forex and crypto pairs.
 * Run with: npx tsx src/scripts/seed-otc-configs.ts
 */

import { query, queryOne } from '../config/db.js';
import { logger } from '../utils/logger.js';

// Default OTC configurations for major forex pairs
const FOREX_OTC_CONFIGS = [
  { symbol: 'EUR/USD-OTC', baseSymbol: 'EUR/USD', name: 'Euro / US Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'GBP/USD-OTC', baseSymbol: 'GBP/USD', name: 'British Pound / US Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'USD/JPY-OTC', baseSymbol: 'USD/JPY', name: 'US Dollar / Japanese Yen (OTC)', pipSize: 0.01 },
  { symbol: 'AUD/USD-OTC', baseSymbol: 'AUD/USD', name: 'Australian Dollar / US Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'USD/CAD-OTC', baseSymbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'NZD/USD-OTC', baseSymbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'USD/CHF-OTC', baseSymbol: 'USD/CHF', name: 'US Dollar / Swiss Franc (OTC)', pipSize: 0.0001 },
  { symbol: 'EUR/GBP-OTC', baseSymbol: 'EUR/GBP', name: 'Euro / British Pound (OTC)', pipSize: 0.0001 },
  { symbol: 'EUR/JPY-OTC', baseSymbol: 'EUR/JPY', name: 'Euro / Japanese Yen (OTC)', pipSize: 0.01 },
  { symbol: 'GBP/JPY-OTC', baseSymbol: 'GBP/JPY', name: 'British Pound / Japanese Yen (OTC)', pipSize: 0.01 },
];

// Default OTC configurations for major crypto pairs
const CRYPTO_OTC_CONFIGS = [
  { symbol: 'BTC/USD-OTC', baseSymbol: 'BTC/USD', name: 'Bitcoin / US Dollar (OTC)', pipSize: 0.01 },
  { symbol: 'ETH/USD-OTC', baseSymbol: 'ETH/USD', name: 'Ethereum / US Dollar (OTC)', pipSize: 0.01 },
  { symbol: 'SOL/USD-OTC', baseSymbol: 'SOL/USD', name: 'Solana / US Dollar (OTC)', pipSize: 0.01 },
  { symbol: 'XRP/USD-OTC', baseSymbol: 'XRP/USD', name: 'Ripple / US Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'BNB/USD-OTC', baseSymbol: 'BNB/USD', name: 'Binance Coin / US Dollar (OTC)', pipSize: 0.01 },
  { symbol: 'DOGE/USD-OTC', baseSymbol: 'DOGE/USD', name: 'Dogecoin / US Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'ADA/USD-OTC', baseSymbol: 'ADA/USD', name: 'Cardano / US Dollar (OTC)', pipSize: 0.0001 },
  { symbol: 'AVAX/USD-OTC', baseSymbol: 'AVAX/USD', name: 'Avalanche / US Dollar (OTC)', pipSize: 0.01 },
];

async function seedOTCConfigs(): Promise<void> {
  console.log('Starting OTC configuration seeding...\n');

  let created = 0;
  let skipped = 0;

  // Seed Forex OTC configs
  console.log('Seeding Forex OTC pairs...');
  for (const config of FOREX_OTC_CONFIGS) {
    try {
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "OTCConfig" WHERE symbol = $1`,
        [config.symbol]
      );

      if (existing) {
        console.log(`  ⏭ ${config.symbol} already exists`);
        skipped++;
        continue;
      }

      await query(`
        INSERT INTO "OTCConfig" (
          id, symbol, "baseSymbol", "marketType", name, "pipSize",
          "isEnabled", "riskEnabled",
          "baseVolatility", "volatilityMultiplier", "meanReversionStrength",
          "maxDeviationPercent", "priceOffsetPips", "momentumFactor",
          "garchAlpha", "garchBeta", "garchOmega",
          "exposureThreshold", "minInterventionRate", "maxInterventionRate", "spreadMultiplier",
          "payoutPercent", "minTradeAmount", "maxTradeAmount",
          "is24Hours", "anchoringDurationMins"
        ) VALUES (
          gen_random_uuid(), $1, $2, 'FOREX', $3, $4,
          true, true,
          0.0003, 1.0, 0.0015,
          1.5, 2.0, 0.15,
          0.08, 0.88, 0.04,
          0.35, 0.25, 0.40, 1.5,
          85, 1, 1000,
          true, 15
        )
      `, [config.symbol, config.baseSymbol, config.name, config.pipSize]);

      console.log(`  ✓ Created ${config.symbol}`);
      created++;
    } catch (error) {
      console.error(`  ✗ Failed to create ${config.symbol}:`, error);
    }
  }

  // Seed Crypto OTC configs
  console.log('\nSeeding Crypto OTC pairs...');
  for (const config of CRYPTO_OTC_CONFIGS) {
    try {
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM "OTCConfig" WHERE symbol = $1`,
        [config.symbol]
      );

      if (existing) {
        console.log(`  ⏭ ${config.symbol} already exists`);
        skipped++;
        continue;
      }

      await query(`
        INSERT INTO "OTCConfig" (
          id, symbol, "baseSymbol", "marketType", name, "pipSize",
          "isEnabled", "riskEnabled",
          "baseVolatility", "volatilityMultiplier", "meanReversionStrength",
          "maxDeviationPercent", "priceOffsetPips", "momentumFactor",
          "garchAlpha", "garchBeta", "garchOmega",
          "exposureThreshold", "minInterventionRate", "maxInterventionRate", "spreadMultiplier",
          "payoutPercent", "minTradeAmount", "maxTradeAmount",
          "is24Hours", "anchoringDurationMins"
        ) VALUES (
          gen_random_uuid(), $1, $2, 'CRYPTO', $3, $4,
          true, true,
          0.0005, 1.2, 0.001,
          2.0, 3.0, 0.2,
          0.1, 0.85, 0.05,
          0.35, 0.25, 0.40, 1.5,
          80, 1, 1000,
          true, 15
        )
      `, [config.symbol, config.baseSymbol, config.name, config.pipSize]);

      console.log(`  ✓ Created ${config.symbol}`);
      created++;
    } catch (error) {
      console.error(`  ✗ Failed to create ${config.symbol}:`, error);
    }
  }

  console.log('\n========================================');
  console.log(`OTC Configuration Seeding Complete!`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log('========================================\n');
}

// Run the seeder
seedOTCConfigs()
  .then(() => {
    console.log('Seeding completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
