import { query, queryOne } from '../config/db.js';

async function clearSeededHistory() {
  try {
    // First, check how many records exist
    const countResult = await queryOne<{ total: string; seeded: string; otc: string }>(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "priceMode" = 'SEEDED') as seeded,
        COUNT(*) FILTER (WHERE "priceMode" = 'OTC') as otc
      FROM "OTCPriceHistory"
    `);
    
    console.log('Before cleanup:');
    console.log(`  Total records: ${countResult?.total}`);
    console.log(`  Seeded records: ${countResult?.seeded}`);
    console.log(`  OTC records: ${countResult?.otc}`);
    
    // Clear ALL OTC price history for a fresh start
    await query(`DELETE FROM "OTCPriceHistory"`);
    
    console.log('\nAll history cleared successfully!');
    console.log('Chart will now build fresh OTC candles from scratch.');
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

clearSeededHistory();
