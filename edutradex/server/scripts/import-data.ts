/**
 * Data Import Script
 * Run this AFTER setting up PostgreSQL to import backed up data
 *
 * Usage: npx ts-node scripts/import-data.ts <backup-file.json>
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function importData(): Promise<void> {
  const backupFile = process.argv[2];

  if (!backupFile) {
    // Find the most recent backup
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      console.error('No backups directory found. Run export-data.ts first.');
      process.exit(1);
    }

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      console.error('No backup files found. Run export-data.ts first.');
      process.exit(1);
    }

    // Sort by name (which includes timestamp) and get the most recent
    files.sort().reverse();
    const latestBackup = path.join(backupDir, files[0]);
    console.log(`Using most recent backup: ${files[0]}\n`);
    return importFromFile(latestBackup);
  }

  return importFromFile(backupFile);
}

async function importFromFile(filepath: string): Promise<void> {
  console.log('Starting data import...\n');

  try {
    const rawData = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(rawData);

    console.log(`Backup from: ${data.exportedAt}`);
    console.log(`Version: ${data.version}\n`);

    // Import in correct order (respecting foreign keys)

    // 1. Import Users first (no dependencies)
    console.log('Importing users...');
    for (const user of data.users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: user,
        create: user,
      });
    }
    console.log(`  - ${data.users.length} users imported`);

    // 2. Import Sessions
    console.log('Importing sessions...');
    for (const session of data.sessions) {
      await prisma.session.upsert({
        where: { id: session.id },
        update: session,
        create: session,
      });
    }
    console.log(`  - ${data.sessions.length} sessions imported`);

    // 3. Import Trades
    console.log('Importing trades...');
    for (const trade of data.trades) {
      await prisma.trade.upsert({
        where: { id: trade.id },
        update: trade,
        create: trade,
      });
    }
    console.log(`  - ${data.trades.length} trades imported`);

    // 4. Import Deposits
    console.log('Importing deposits...');
    for (const deposit of data.deposits) {
      await prisma.deposit.upsert({
        where: { id: deposit.id },
        update: deposit,
        create: deposit,
      });
    }
    console.log(`  - ${data.deposits.length} deposits imported`);

    // 5. Import Withdrawals
    console.log('Importing withdrawals...');
    for (const withdrawal of data.withdrawals) {
      await prisma.withdrawal.upsert({
        where: { id: withdrawal.id },
        update: withdrawal,
        create: withdrawal,
      });
    }
    console.log(`  - ${data.withdrawals.length} withdrawals imported`);

    // 6. Import Market Configs
    console.log('Importing market configs...');
    for (const config of data.marketConfigs) {
      await prisma.marketConfig.upsert({
        where: { id: config.id },
        update: config,
        create: config,
      });
    }
    console.log(`  - ${data.marketConfigs.length} market configs imported`);

    // 7. Import System Configs
    console.log('Importing system configs...');
    for (const config of data.systemConfigs) {
      await prisma.systemConfig.upsert({
        where: { id: config.id },
        update: config,
        create: config,
      });
    }
    console.log(`  - ${data.systemConfigs.length} system configs imported`);

    // 8. Import Payment Methods
    console.log('Importing payment methods...');
    for (const method of data.paymentMethods) {
      await prisma.paymentMethod.upsert({
        where: { id: method.id },
        update: method,
        create: method,
      });
    }
    console.log(`  - ${data.paymentMethods.length} payment methods imported`);

    // 9. Import Spread Configs
    console.log('Importing spread configs...');
    for (const config of data.spreadConfigs || []) {
      await prisma.spreadConfig.upsert({
        where: { id: config.id },
        update: config,
        create: config,
      });
    }
    console.log(`  - ${(data.spreadConfigs || []).length} spread configs imported`);

    // 10. Import KYCs
    console.log('Importing KYCs...');
    for (const kyc of data.kycs) {
      await prisma.kYC.upsert({
        where: { id: kyc.id },
        update: kyc,
        create: kyc,
      });
    }
    console.log(`  - ${data.kycs.length} KYCs imported`);

    // 11. Import Copy Trading Leaders
    console.log('Importing copy trading leaders...');
    for (const leader of data.copyTradingLeaders) {
      await prisma.copyTradingLeader.upsert({
        where: { id: leader.id },
        update: leader,
        create: leader,
      });
    }
    console.log(`  - ${data.copyTradingLeaders.length} leaders imported`);

    // 12. Import Copy Trading Followers
    console.log('Importing copy trading followers...');
    for (const follower of data.copyTradingFollowers) {
      await prisma.copyTradingFollower.upsert({
        where: { id: follower.id },
        update: follower,
        create: follower,
      });
    }
    console.log(`  - ${data.copyTradingFollowers.length} followers imported`);

    // 13. Import Copied Trades
    console.log('Importing copied trades...');
    for (const copied of data.copiedTrades) {
      await prisma.copiedTrade.upsert({
        where: { id: copied.id },
        update: copied,
        create: copied,
      });
    }
    console.log(`  - ${data.copiedTrades.length} copied trades imported`);

    // 14. Import Pending Copy Trades
    console.log('Importing pending copy trades...');
    for (const pending of data.pendingCopyTrades) {
      await prisma.pendingCopyTrade.upsert({
        where: { id: pending.id },
        update: pending,
        create: pending,
      });
    }
    console.log(`  - ${data.pendingCopyTrades.length} pending copy trades imported`);

    // 15. Import Referral Commissions
    console.log('Importing referral commissions...');
    for (const commission of data.referralCommissions) {
      await prisma.referralCommission.upsert({
        where: { id: commission.id },
        update: commission,
        create: commission,
      });
    }
    console.log(`  - ${data.referralCommissions.length} referral commissions imported`);

    // 16. Import Referral Settings
    console.log('Importing referral settings...');
    for (const setting of data.referralSettings) {
      await prisma.referralSettings.upsert({
        where: { id: setting.id },
        update: setting,
        create: setting,
      });
    }
    console.log(`  - ${data.referralSettings.length} referral settings imported`);

    // 17. Import Email Verifications
    console.log('Importing email verifications...');
    for (const verification of data.emailVerifications) {
      await prisma.emailVerification.upsert({
        where: { id: verification.id },
        update: verification,
        create: verification,
      });
    }
    console.log(`  - ${data.emailVerifications.length} email verifications imported`);

    // 18. Import Admin Messages
    console.log('Importing admin messages...');
    for (const message of data.adminMessages) {
      await prisma.adminMessage.upsert({
        where: { id: message.id },
        update: message,
        create: message,
      });
    }
    console.log(`  - ${data.adminMessages.length} admin messages imported`);

    console.log('\n========================================');
    console.log('IMPORT COMPLETE!');
    console.log('========================================');
    console.log('All data has been successfully imported.');
    console.log('========================================\n');

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
