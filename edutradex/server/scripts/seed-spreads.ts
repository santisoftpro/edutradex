import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const spreadConfigs = [
  // Forex pairs - 2 pips default
  { symbol: 'EUR/USD', markupPips: 2, description: 'Euro / US Dollar' },
  { symbol: 'GBP/USD', markupPips: 2, description: 'British Pound / US Dollar' },
  { symbol: 'USD/JPY', markupPips: 2, description: 'US Dollar / Japanese Yen' },
  { symbol: 'AUD/USD', markupPips: 2, description: 'Australian Dollar / US Dollar' },
  { symbol: 'USD/CAD', markupPips: 2, description: 'US Dollar / Canadian Dollar' },
  { symbol: 'EUR/GBP', markupPips: 2, description: 'Euro / British Pound' },
  { symbol: 'NZD/USD', markupPips: 2, description: 'New Zealand Dollar / US Dollar' },
  { symbol: 'USD/CHF', markupPips: 2, description: 'US Dollar / Swiss Franc' },

  // OTC pairs - 2.5 pips default
  { symbol: 'OTC_EUR/USD', markupPips: 2.5, description: 'OTC Euro / US Dollar' },
  { symbol: 'OTC_GBP/USD', markupPips: 2.5, description: 'OTC British Pound / US Dollar' },

  // Volatility indices - 3 pips default
  { symbol: 'VOL_10', markupPips: 3, description: 'Volatility 10 Index' },
  { symbol: 'VOL_25', markupPips: 3, description: 'Volatility 25 Index' },
  { symbol: 'VOL_50', markupPips: 3, description: 'Volatility 50 Index' },
  { symbol: 'VOL_100', markupPips: 3, description: 'Volatility 100 Index' },
];

async function main() {
  console.log('Seeding spread configurations...');

  for (const config of spreadConfigs) {
    const spread = await prisma.spreadConfig.upsert({
      where: { symbol: config.symbol },
      update: {
        markupPips: config.markupPips,
        description: config.description,
        isActive: true,
      },
      create: {
        symbol: config.symbol,
        markupPips: config.markupPips,
        description: config.description,
        isActive: true,
      },
    });

    console.log(`✓ ${config.symbol}: ${config.markupPips} pips`);
  }

  console.log(`\nSeeded ${spreadConfigs.length} spread configurations`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding spread configurations:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
