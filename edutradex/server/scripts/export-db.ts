/**
 * Database Export Script
 * Exports all data from the database to JSON format for backup/migration
 *
 * Usage: npx ts-node scripts/export-db.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function exportDatabase() {
  console.log('Starting database export...');

  const backupDir = path.join(__dirname, '..', 'backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportData: Record<string, unknown[]> = {};

  try {
    // Export Users (without passwords for security)
    console.log('Exporting users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        liveBalance: true,
        demoBalance: true,
        activeAccountType: true,
        isActive: true,
        emailVerified: true,
        emailVerifiedAt: true,
        referralCode: true,
        referredBy: true,
        referralEarnings: true,
        totalReferrals: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    exportData.users = users;
    console.log(`  - ${users.length} users exported`);

    // Export Trades
    console.log('Exporting trades...');
    const trades = await prisma.trade.findMany();
    exportData.trades = trades;
    console.log(`  - ${trades.length} trades exported`);

    // Export Deposits
    console.log('Exporting deposits...');
    const deposits = await prisma.deposit.findMany();
    exportData.deposits = deposits;
    console.log(`  - ${deposits.length} deposits exported`);

    // Export Withdrawals
    console.log('Exporting withdrawals...');
    const withdrawals = await prisma.withdrawal.findMany();
    exportData.withdrawals = withdrawals;
    console.log(`  - ${withdrawals.length} withdrawals exported`);

    // Export KYC records
    console.log('Exporting KYC records...');
    const kyc = await prisma.kYC.findMany();
    exportData.kyc = kyc;
    console.log(`  - ${kyc.length} KYC records exported`);

    // Export Payment Methods
    console.log('Exporting payment methods...');
    const paymentMethods = await prisma.paymentMethod.findMany();
    exportData.paymentMethods = paymentMethods;
    console.log(`  - ${paymentMethods.length} payment methods exported`);

    // Export Market Configs
    console.log('Exporting market configs...');
    const marketConfigs = await prisma.marketConfig.findMany();
    exportData.marketConfigs = marketConfigs;
    console.log(`  - ${marketConfigs.length} market configs exported`);

    // Export System Configs
    console.log('Exporting system configs...');
    const systemConfigs = await prisma.systemConfig.findMany();
    exportData.systemConfigs = systemConfigs;
    console.log(`  - ${systemConfigs.length} system configs exported`);

    // Export Copy Trading Leaders
    console.log('Exporting copy trading leaders...');
    const leaders = await prisma.copyTradingLeader.findMany();
    exportData.copyTradingLeaders = leaders;
    console.log(`  - ${leaders.length} leaders exported`);

    // Export Copy Trading Followers
    console.log('Exporting copy trading followers...');
    const followers = await prisma.copyTradingFollower.findMany();
    exportData.copyTradingFollowers = followers;
    console.log(`  - ${followers.length} followers exported`);

    // Write to file
    const filename = `database-backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    console.log(`\nBackup saved to: ${filepath}`);

    // Also save a "latest" copy for easy access
    const latestPath = path.join(backupDir, 'database-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(exportData, null, 2));
    console.log(`Latest backup: ${latestPath}`);

    // Summary
    console.log('\n=== Export Summary ===');
    for (const [table, data] of Object.entries(exportData)) {
      console.log(`${table}: ${(data as unknown[]).length} records`);
    }

  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportDatabase();
