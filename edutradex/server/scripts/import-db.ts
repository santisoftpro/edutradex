/**
 * Database Import Script
 * Imports data from JSON backup into the database
 *
 * Usage: npx ts-node scripts/import-db.ts [backup-file.json]
 * Default: imports from backup/database-latest.json
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  users?: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    liveBalance: number;
    demoBalance: number;
    activeAccountType: string;
    isActive: boolean;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
    referralCode: string | null;
    referredBy: string | null;
    referralEarnings: number;
    totalReferrals: number;
    createdAt: string;
    updatedAt: string;
  }>;
  trades?: Array<Record<string, unknown>>;
  deposits?: Array<Record<string, unknown>>;
  withdrawals?: Array<Record<string, unknown>>;
  kyc?: Array<Record<string, unknown>>;
  paymentMethods?: Array<Record<string, unknown>>;
  marketConfigs?: Array<Record<string, unknown>>;
  systemConfigs?: Array<Record<string, unknown>>;
  copyTradingLeaders?: Array<Record<string, unknown>>;
  copyTradingFollowers?: Array<Record<string, unknown>>;
}

async function importDatabase() {
  const backupFile = process.argv[2] || path.join(__dirname, '..', 'backup', 'database-latest.json');

  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`Importing from: ${backupFile}`);
  const data: BackupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

  try {
    // Import in correct order (respecting foreign keys)

    // 1. System Configs
    if (data.systemConfigs && data.systemConfigs.length > 0) {
      console.log(`Importing ${data.systemConfigs.length} system configs...`);
      for (const config of data.systemConfigs) {
        await prisma.systemConfig.upsert({
          where: { key: config.key as string },
          update: { value: config.value as string },
          create: {
            key: config.key as string,
            value: config.value as string,
          },
        });
      }
    }

    // 2. Market Configs
    if (data.marketConfigs && data.marketConfigs.length > 0) {
      console.log(`Importing ${data.marketConfigs.length} market configs...`);
      for (const config of data.marketConfigs) {
        await prisma.marketConfig.upsert({
          where: { symbol: config.symbol as string },
          update: {
            name: config.name as string,
            marketType: config.marketType as string,
            isActive: config.isActive as boolean,
            payoutPercent: config.payoutPercent as number,
            minTradeAmount: config.minTradeAmount as number,
            maxTradeAmount: config.maxTradeAmount as number,
            volatilityMode: config.volatilityMode as string,
          },
          create: {
            symbol: config.symbol as string,
            name: config.name as string,
            marketType: config.marketType as string,
            isActive: config.isActive as boolean,
            payoutPercent: config.payoutPercent as number,
            minTradeAmount: config.minTradeAmount as number,
            maxTradeAmount: config.maxTradeAmount as number,
            volatilityMode: config.volatilityMode as string,
          },
        });
      }
    }

    // 3. Payment Methods
    if (data.paymentMethods && data.paymentMethods.length > 0) {
      console.log(`Importing ${data.paymentMethods.length} payment methods...`);
      for (const method of data.paymentMethods) {
        await prisma.paymentMethod.upsert({
          where: { id: method.id as string },
          update: {
            type: method.type as string,
            name: method.name as string,
            isActive: method.isActive as boolean,
            minAmount: method.minAmount as number,
            maxAmount: method.maxAmount as number,
            processingTime: method.processingTime as string,
            instructions: method.instructions as string | null,
            config: method.config as Record<string, unknown> || {},
          },
          create: {
            id: method.id as string,
            type: method.type as string,
            name: method.name as string,
            isActive: method.isActive as boolean,
            minAmount: method.minAmount as number,
            maxAmount: method.maxAmount as number,
            processingTime: method.processingTime as string,
            instructions: method.instructions as string | null,
            config: method.config as Record<string, unknown> || {},
          },
        });
      }
    }

    // 4. Users (need to create without password, admin should reset)
    if (data.users && data.users.length > 0) {
      console.log(`Importing ${data.users.length} users...`);
      console.log('  NOTE: Users will need to reset their passwords!');
      for (const user of data.users) {
        const exists = await prisma.user.findUnique({ where: { id: user.id } });
        if (!exists) {
          // Create user with a placeholder password (should be reset)
          await prisma.user.create({
            data: {
              id: user.id,
              email: user.email,
              name: user.name,
              password: '$2a$12$placeholder.password.needs.reset.by.admin',
              role: user.role,
              liveBalance: user.liveBalance,
              demoBalance: user.demoBalance,
              activeAccountType: user.activeAccountType,
              isActive: user.isActive,
              emailVerified: user.emailVerified,
              emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
              referralCode: user.referralCode,
              referredBy: user.referredBy,
              referralEarnings: user.referralEarnings,
              totalReferrals: user.totalReferrals,
              createdAt: new Date(user.createdAt),
              updatedAt: new Date(user.updatedAt),
            },
          });
        }
      }
    }

    // 5. KYC records
    if (data.kyc && data.kyc.length > 0) {
      console.log(`Importing ${data.kyc.length} KYC records...`);
      for (const record of data.kyc) {
        const exists = await prisma.kYC.findUnique({ where: { id: record.id as string } });
        if (!exists) {
          await prisma.kYC.create({
            data: record as Parameters<typeof prisma.kYC.create>[0]['data'],
          });
        }
      }
    }

    // 6. Deposits
    if (data.deposits && data.deposits.length > 0) {
      console.log(`Importing ${data.deposits.length} deposits...`);
      for (const deposit of data.deposits) {
        const exists = await prisma.deposit.findUnique({ where: { id: deposit.id as string } });
        if (!exists) {
          await prisma.deposit.create({
            data: {
              ...deposit,
              createdAt: new Date(deposit.createdAt as string),
              updatedAt: new Date(deposit.updatedAt as string),
              processedAt: deposit.processedAt ? new Date(deposit.processedAt as string) : null,
            } as Parameters<typeof prisma.deposit.create>[0]['data'],
          });
        }
      }
    }

    // 7. Withdrawals
    if (data.withdrawals && data.withdrawals.length > 0) {
      console.log(`Importing ${data.withdrawals.length} withdrawals...`);
      for (const withdrawal of data.withdrawals) {
        const exists = await prisma.withdrawal.findUnique({ where: { id: withdrawal.id as string } });
        if (!exists) {
          await prisma.withdrawal.create({
            data: {
              ...withdrawal,
              createdAt: new Date(withdrawal.createdAt as string),
              updatedAt: new Date(withdrawal.updatedAt as string),
              processedAt: withdrawal.processedAt ? new Date(withdrawal.processedAt as string) : null,
            } as Parameters<typeof prisma.withdrawal.create>[0]['data'],
          });
        }
      }
    }

    // 8. Trades
    if (data.trades && data.trades.length > 0) {
      console.log(`Importing ${data.trades.length} trades...`);
      for (const trade of data.trades) {
        const exists = await prisma.trade.findUnique({ where: { id: trade.id as string } });
        if (!exists) {
          await prisma.trade.create({
            data: {
              ...trade,
              openedAt: new Date(trade.openedAt as string),
              expiresAt: new Date(trade.expiresAt as string),
              closedAt: trade.closedAt ? new Date(trade.closedAt as string) : null,
              createdAt: new Date(trade.createdAt as string),
              updatedAt: new Date(trade.updatedAt as string),
            } as Parameters<typeof prisma.trade.create>[0]['data'],
          });
        }
      }
    }

    // 9. Copy Trading Leaders
    if (data.copyTradingLeaders && data.copyTradingLeaders.length > 0) {
      console.log(`Importing ${data.copyTradingLeaders.length} copy trading leaders...`);
      for (const leader of data.copyTradingLeaders) {
        const exists = await prisma.copyTradingLeader.findUnique({ where: { id: leader.id as string } });
        if (!exists) {
          await prisma.copyTradingLeader.create({
            data: leader as Parameters<typeof prisma.copyTradingLeader.create>[0]['data'],
          });
        }
      }
    }

    // 10. Copy Trading Followers
    if (data.copyTradingFollowers && data.copyTradingFollowers.length > 0) {
      console.log(`Importing ${data.copyTradingFollowers.length} copy trading followers...`);
      for (const follower of data.copyTradingFollowers) {
        const exists = await prisma.copyTradingFollower.findUnique({ where: { id: follower.id as string } });
        if (!exists) {
          await prisma.copyTradingFollower.create({
            data: follower as Parameters<typeof prisma.copyTradingFollower.create>[0]['data'],
          });
        }
      }
    }

    console.log('\n=== Import Complete ===');
    console.log('IMPORTANT: Users will need to reset their passwords using "Forgot Password"');

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importDatabase();
