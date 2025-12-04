/**
 * Data Export Script
 * Run this BEFORE switching to PostgreSQL to backup all data
 *
 * Usage: npx ts-node scripts/export-data.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface ExportData {
  exportedAt: string;
  version: string;
  users: any[];
  trades: any[];
  sessions: any[];
  deposits: any[];
  withdrawals: any[];
  marketConfigs: any[];
  systemConfigs: any[];
  paymentMethods: any[];
  copyTradingLeaders: any[];
  copyTradingFollowers: any[];
  copiedTrades: any[];
  pendingCopyTrades: any[];
  referralCommissions: any[];
  referralSettings: any[];
  emailVerifications: any[];
  adminMessages: any[];
  kycs: any[];
  spreadConfigs: any[];
}

async function exportData(): Promise<void> {
  console.log('Starting data export...\n');

  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    users: [],
    trades: [],
    sessions: [],
    deposits: [],
    withdrawals: [],
    marketConfigs: [],
    systemConfigs: [],
    paymentMethods: [],
    copyTradingLeaders: [],
    copyTradingFollowers: [],
    copiedTrades: [],
    pendingCopyTrades: [],
    referralCommissions: [],
    referralSettings: [],
    emailVerifications: [],
    adminMessages: [],
    kycs: [],
    spreadConfigs: [],
  };

  try {
    // Export Users (without relations to avoid circular refs)
    console.log('Exporting users...');
    data.users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        liveBalance: true,
        demoBalance: true,
        activeAccountType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
        emailVerifiedAt: true,
        referralCode: true,
        referredBy: true,
        referralEarnings: true,
        totalReferrals: true,
      },
    });
    console.log(`  - ${data.users.length} users exported`);

    // Export Trades
    console.log('Exporting trades...');
    data.trades = await prisma.trade.findMany();
    console.log(`  - ${data.trades.length} trades exported`);

    // Export Sessions
    console.log('Exporting sessions...');
    data.sessions = await prisma.session.findMany();
    console.log(`  - ${data.sessions.length} sessions exported`);

    // Export Deposits
    console.log('Exporting deposits...');
    data.deposits = await prisma.deposit.findMany();
    console.log(`  - ${data.deposits.length} deposits exported`);

    // Export Withdrawals
    console.log('Exporting withdrawals...');
    data.withdrawals = await prisma.withdrawal.findMany();
    console.log(`  - ${data.withdrawals.length} withdrawals exported`);

    // Export Market Configs
    console.log('Exporting market configs...');
    data.marketConfigs = await prisma.marketConfig.findMany();
    console.log(`  - ${data.marketConfigs.length} market configs exported`);

    // Export System Configs
    console.log('Exporting system configs...');
    data.systemConfigs = await prisma.systemConfig.findMany();
    console.log(`  - ${data.systemConfigs.length} system configs exported`);

    // Export Payment Methods
    console.log('Exporting payment methods...');
    data.paymentMethods = await prisma.paymentMethod.findMany();
    console.log(`  - ${data.paymentMethods.length} payment methods exported`);

    // Export Spread Configs
    console.log('Exporting spread configs...');
    data.spreadConfigs = await prisma.spreadConfig.findMany();
    console.log(`  - ${data.spreadConfigs.length} spread configs exported`);

    // Export Copy Trading Leaders
    console.log('Exporting copy trading leaders...');
    data.copyTradingLeaders = await prisma.copyTradingLeader.findMany();
    console.log(`  - ${data.copyTradingLeaders.length} leaders exported`);

    // Export Copy Trading Followers
    console.log('Exporting copy trading followers...');
    data.copyTradingFollowers = await prisma.copyTradingFollower.findMany();
    console.log(`  - ${data.copyTradingFollowers.length} followers exported`);

    // Export Copied Trades
    console.log('Exporting copied trades...');
    data.copiedTrades = await prisma.copiedTrade.findMany();
    console.log(`  - ${data.copiedTrades.length} copied trades exported`);

    // Export Pending Copy Trades
    console.log('Exporting pending copy trades...');
    data.pendingCopyTrades = await prisma.pendingCopyTrade.findMany();
    console.log(`  - ${data.pendingCopyTrades.length} pending copy trades exported`);

    // Export Referral Commissions
    console.log('Exporting referral commissions...');
    data.referralCommissions = await prisma.referralCommission.findMany();
    console.log(`  - ${data.referralCommissions.length} referral commissions exported`);

    // Export Referral Settings
    console.log('Exporting referral settings...');
    data.referralSettings = await prisma.referralSettings.findMany();
    console.log(`  - ${data.referralSettings.length} referral settings exported`);

    // Export Email Verifications
    console.log('Exporting email verifications...');
    data.emailVerifications = await prisma.emailVerification.findMany();
    console.log(`  - ${data.emailVerifications.length} email verifications exported`);

    // Export Admin Messages
    console.log('Exporting admin messages...');
    data.adminMessages = await prisma.adminMessage.findMany();
    console.log(`  - ${data.adminMessages.length} admin messages exported`);

    // Export KYCs
    console.log('Exporting KYCs...');
    data.kycs = await prisma.kYC.findMany();
    console.log(`  - ${data.kycs.length} KYCs exported`);

    // Save to file
    const exportDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(exportDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log('\n========================================');
    console.log('EXPORT COMPLETE!');
    console.log('========================================');
    console.log(`File saved to: ${filepath}`);
    console.log(`Total records exported:`);
    console.log(`  - Users: ${data.users.length}`);
    console.log(`  - Trades: ${data.trades.length}`);
    console.log(`  - Deposits: ${data.deposits.length}`);
    console.log(`  - Withdrawals: ${data.withdrawals.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
