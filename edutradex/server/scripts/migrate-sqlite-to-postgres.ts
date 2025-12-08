import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

async function migrate() {
  const sqlitePath = path.join(__dirname, '../prisma/dev.db');

  console.log('Connecting to SQLite database:', sqlitePath);
  const sqlite = new Database(sqlitePath, { readonly: true });

  console.log('\n=== Starting Migration ===\n');

  try {
    // 1. Migrate Users (no dependencies)
    console.log('Migrating Users...');
    const users = sqlite.prepare('SELECT * FROM User').all() as any[];
    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          liveBalance: user.liveBalance,
          demoBalance: user.demoBalance,
          activeAccountType: user.activeAccountType,
          isActive: Boolean(user.isActive),
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
          emailVerified: Boolean(user.emailVerified),
          emailVerifiedAt: user.emailVerifiedAt ? new Date(user.emailVerifiedAt) : null,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          referralEarnings: user.referralEarnings || 0,
          totalReferrals: user.totalReferrals || 0,
        },
      });
    }
    console.log(`  ✓ Migrated ${users.length} users`);

    // 2. Migrate Sessions
    console.log('Migrating Sessions...');
    const sessions = sqlite.prepare('SELECT * FROM Session').all() as any[];
    for (const session of sessions) {
      await prisma.session.upsert({
        where: { id: session.id },
        update: {},
        create: {
          id: session.id,
          userId: session.userId,
          token: session.token,
          expiresAt: new Date(session.expiresAt),
          createdAt: new Date(session.createdAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${sessions.length} sessions`);

    // 3. Migrate MarketConfig
    console.log('Migrating MarketConfig...');
    const marketConfigs = sqlite.prepare('SELECT * FROM MarketConfig').all() as any[];
    for (const config of marketConfigs) {
      await prisma.marketConfig.upsert({
        where: { id: config.id },
        update: {},
        create: {
          id: config.id,
          symbol: config.symbol,
          marketType: config.marketType,
          name: config.name,
          isActive: Boolean(config.isActive),
          payoutPercent: config.payoutPercent,
          minTradeAmount: config.minTradeAmount,
          maxTradeAmount: config.maxTradeAmount,
          volatilityMode: config.volatilityMode,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${marketConfigs.length} market configs`);

    // 4. Migrate SystemConfig
    console.log('Migrating SystemConfig...');
    const systemConfigs = sqlite.prepare('SELECT * FROM SystemConfig').all() as any[];
    for (const config of systemConfigs) {
      await prisma.systemConfig.upsert({
        where: { id: config.id },
        update: {},
        create: {
          id: config.id,
          key: config.key,
          value: config.value,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${systemConfigs.length} system configs`);

    // 5. Migrate SpreadConfig
    console.log('Migrating SpreadConfig...');
    const spreadConfigs = sqlite.prepare('SELECT * FROM SpreadConfig').all() as any[];
    for (const config of spreadConfigs) {
      await prisma.spreadConfig.upsert({
        where: { id: config.id },
        update: {},
        create: {
          id: config.id,
          symbol: config.symbol,
          markupPips: config.markupPips,
          isActive: Boolean(config.isActive),
          description: config.description,
          createdAt: new Date(config.createdAt),
          updatedAt: new Date(config.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${spreadConfigs.length} spread configs`);

    // 6. Migrate PaymentMethod
    console.log('Migrating PaymentMethods...');
    const paymentMethods = sqlite.prepare('SELECT * FROM PaymentMethod').all() as any[];
    for (const method of paymentMethods) {
      await prisma.paymentMethod.upsert({
        where: { id: method.id },
        update: {},
        create: {
          id: method.id,
          type: method.type,
          name: method.name,
          code: method.code,
          cryptoCurrency: method.cryptoCurrency,
          network: method.network,
          walletAddress: method.walletAddress,
          mobileProvider: method.mobileProvider,
          phoneNumber: method.phoneNumber,
          accountName: method.accountName,
          iconUrl: method.iconUrl,
          iconBg: method.iconBg,
          displayOrder: method.displayOrder,
          minAmount: method.minAmount,
          maxAmount: method.maxAmount,
          processingTime: method.processingTime,
          isActive: Boolean(method.isActive),
          isPopular: Boolean(method.isPopular),
          createdAt: new Date(method.createdAt),
          updatedAt: new Date(method.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${paymentMethods.length} payment methods`);

    // 7. Migrate ReferralSettings
    console.log('Migrating ReferralSettings...');
    const referralSettings = sqlite.prepare('SELECT * FROM ReferralSettings').all() as any[];
    for (const setting of referralSettings) {
      await prisma.referralSettings.upsert({
        where: { id: setting.id },
        update: {},
        create: {
          id: setting.id,
          signupBonus: setting.signupBonus,
          depositCommission: setting.depositCommission,
          tradeCommission: setting.tradeCommission,
          minWithdrawal: setting.minWithdrawal,
          maxCommissionPerUser: setting.maxCommissionPerUser,
          isActive: Boolean(setting.isActive),
          requireVerification: Boolean(setting.requireVerification),
          createdAt: new Date(setting.createdAt),
          updatedAt: new Date(setting.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${referralSettings.length} referral settings`);

    // 8. Migrate Trades
    console.log('Migrating Trades...');
    const trades = sqlite.prepare('SELECT * FROM Trade').all() as any[];
    for (const trade of trades) {
      await prisma.trade.upsert({
        where: { id: trade.id },
        update: {},
        create: {
          id: trade.id,
          userId: trade.userId,
          market: trade.market,
          symbol: trade.symbol,
          direction: trade.direction,
          amount: trade.amount,
          entryPrice: trade.entryPrice,
          exitPrice: trade.exitPrice,
          duration: trade.duration,
          payoutPercent: trade.payoutPercent,
          status: trade.status,
          result: trade.result,
          profit: trade.profit,
          accountType: trade.accountType,
          openedAt: new Date(trade.openedAt),
          closedAt: trade.closedAt ? new Date(trade.closedAt) : null,
          expiresAt: new Date(trade.expiresAt),
          isCopyTrade: Boolean(trade.isCopyTrade),
        },
      });
    }
    console.log(`  ✓ Migrated ${trades.length} trades`);

    // 9. Migrate Deposits
    console.log('Migrating Deposits...');
    const deposits = sqlite.prepare('SELECT * FROM Deposit').all() as any[];
    for (const deposit of deposits) {
      await prisma.deposit.upsert({
        where: { id: deposit.id },
        update: {},
        create: {
          id: deposit.id,
          userId: deposit.userId,
          amount: deposit.amount,
          method: deposit.method,
          status: deposit.status,
          phoneNumber: deposit.phoneNumber,
          mobileProvider: deposit.mobileProvider,
          cryptoCurrency: deposit.cryptoCurrency,
          walletAddress: deposit.walletAddress,
          transactionHash: deposit.transactionHash,
          adminNote: deposit.adminNote,
          processedBy: deposit.processedBy,
          processedAt: deposit.processedAt ? new Date(deposit.processedAt) : null,
          createdAt: new Date(deposit.createdAt),
          updatedAt: new Date(deposit.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${deposits.length} deposits`);

    // 10. Migrate Withdrawals
    console.log('Migrating Withdrawals...');
    const withdrawals = sqlite.prepare('SELECT * FROM Withdrawal').all() as any[];
    for (const withdrawal of withdrawals) {
      await prisma.withdrawal.upsert({
        where: { id: withdrawal.id },
        update: {},
        create: {
          id: withdrawal.id,
          userId: withdrawal.userId,
          amount: withdrawal.amount,
          method: withdrawal.method,
          status: withdrawal.status,
          phoneNumber: withdrawal.phoneNumber,
          mobileProvider: withdrawal.mobileProvider,
          cryptoCurrency: withdrawal.cryptoCurrency,
          walletAddress: withdrawal.walletAddress,
          adminNote: withdrawal.adminNote,
          processedBy: withdrawal.processedBy,
          processedAt: withdrawal.processedAt ? new Date(withdrawal.processedAt) : null,
          createdAt: new Date(withdrawal.createdAt),
          updatedAt: new Date(withdrawal.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${withdrawals.length} withdrawals`);

    // 11. Migrate KYC
    console.log('Migrating KYC...');
    const kycs = sqlite.prepare('SELECT * FROM KYC').all() as any[];
    for (const kyc of kycs) {
      await prisma.kYC.upsert({
        where: { id: kyc.id },
        update: {},
        create: {
          id: kyc.id,
          userId: kyc.userId,
          firstName: kyc.firstName,
          lastName: kyc.lastName,
          dateOfBirth: kyc.dateOfBirth ? new Date(kyc.dateOfBirth) : null,
          nationality: kyc.nationality,
          address: kyc.address,
          city: kyc.city,
          country: kyc.country,
          postalCode: kyc.postalCode,
          phoneNumber: kyc.phoneNumber,
          documentType: kyc.documentType,
          documentNumber: kyc.documentNumber,
          documentFront: kyc.documentFront,
          documentBack: kyc.documentBack,
          selfieWithId: kyc.selfieWithId,
          status: kyc.status,
          rejectionReason: kyc.rejectionReason,
          reviewedBy: kyc.reviewedBy,
          reviewedAt: kyc.reviewedAt ? new Date(kyc.reviewedAt) : null,
          adminNote: kyc.adminNote,
          submittedAt: kyc.submittedAt ? new Date(kyc.submittedAt) : null,
          createdAt: new Date(kyc.createdAt),
          updatedAt: new Date(kyc.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${kycs.length} KYC records`);

    // 12. Migrate SupportTickets
    console.log('Migrating SupportTickets...');
    const tickets = sqlite.prepare('SELECT * FROM SupportTicket').all() as any[];
    for (const ticket of tickets) {
      await prisma.supportTicket.upsert({
        where: { id: ticket.id },
        update: {},
        create: {
          id: ticket.id,
          userId: ticket.userId,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          message: ticket.message,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          adminReply: ticket.adminReply,
          repliedBy: ticket.repliedBy,
          repliedAt: ticket.repliedAt ? new Date(ticket.repliedAt) : null,
          closedBy: ticket.closedBy,
          closedAt: ticket.closedAt ? new Date(ticket.closedAt) : null,
          createdAt: new Date(ticket.createdAt),
          updatedAt: new Date(ticket.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${tickets.length} support tickets`);

    // 13. Migrate CopyTradingLeader
    console.log('Migrating CopyTradingLeaders...');
    const leaders = sqlite.prepare('SELECT * FROM CopyTradingLeader').all() as any[];
    for (const leader of leaders) {
      await prisma.copyTradingLeader.upsert({
        where: { id: leader.id },
        update: {},
        create: {
          id: leader.id,
          userId: leader.userId,
          displayName: leader.displayName,
          description: leader.description,
          avatarUrl: leader.avatarUrl,
          status: leader.status,
          totalTrades: leader.totalTrades,
          winningTrades: leader.winningTrades,
          totalProfit: leader.totalProfit,
          winRate: leader.winRate,
          maxFollowers: leader.maxFollowers,
          isPublic: Boolean(leader.isPublic),
          adminNote: leader.adminNote,
          approvedAt: leader.approvedAt ? new Date(leader.approvedAt) : null,
          rejectedAt: leader.rejectedAt ? new Date(leader.rejectedAt) : null,
          suspendedAt: leader.suspendedAt ? new Date(leader.suspendedAt) : null,
          createdAt: new Date(leader.createdAt),
          updatedAt: new Date(leader.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${leaders.length} copy trading leaders`);

    // 14. Migrate CopyTradingFollower
    console.log('Migrating CopyTradingFollowers...');
    const followers = sqlite.prepare('SELECT * FROM CopyTradingFollower').all() as any[];
    for (const follower of followers) {
      await prisma.copyTradingFollower.upsert({
        where: { id: follower.id },
        update: {},
        create: {
          id: follower.id,
          followerId: follower.followerId,
          leaderId: follower.leaderId,
          copyMode: follower.copyMode,
          fixedAmount: follower.fixedAmount,
          maxDailyTrades: follower.maxDailyTrades,
          isActive: Boolean(follower.isActive),
          tradesToday: follower.tradesToday,
          lastTradeDate: follower.lastTradeDate ? new Date(follower.lastTradeDate) : null,
          totalCopied: follower.totalCopied,
          totalProfit: follower.totalProfit,
          createdAt: new Date(follower.createdAt),
          updatedAt: new Date(follower.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${followers.length} copy trading followers`);

    // 15. Migrate ReferralCommission
    console.log('Migrating ReferralCommissions...');
    const commissions = sqlite.prepare('SELECT * FROM ReferralCommission').all() as any[];
    for (const commission of commissions) {
      await prisma.referralCommission.upsert({
        where: { id: commission.id },
        update: {},
        create: {
          id: commission.id,
          earnerId: commission.earnerId,
          generatorId: commission.generatorId,
          type: commission.type,
          amount: commission.amount,
          percentage: commission.percentage,
          sourceAmount: commission.sourceAmount,
          sourceId: commission.sourceId,
          status: commission.status,
          creditedAt: commission.creditedAt ? new Date(commission.creditedAt) : null,
          description: commission.description,
          createdAt: new Date(commission.createdAt),
          updatedAt: new Date(commission.updatedAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${commissions.length} referral commissions`);

    // 16. Migrate EmailVerification
    console.log('Migrating EmailVerifications...');
    const emailVerifications = sqlite.prepare('SELECT * FROM EmailVerification').all() as any[];
    for (const ev of emailVerifications) {
      await prisma.emailVerification.upsert({
        where: { id: ev.id },
        update: {},
        create: {
          id: ev.id,
          email: ev.email,
          code: ev.code,
          type: ev.type,
          expiresAt: new Date(ev.expiresAt),
          verified: Boolean(ev.verified),
          createdAt: new Date(ev.createdAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${emailVerifications.length} email verifications`);

    // 17. Migrate AdminMessage
    console.log('Migrating AdminMessages...');
    const adminMessages = sqlite.prepare('SELECT * FROM AdminMessage').all() as any[];
    for (const msg of adminMessages) {
      await prisma.adminMessage.upsert({
        where: { id: msg.id },
        update: {},
        create: {
          id: msg.id,
          senderId: msg.senderId,
          recipientId: msg.recipientId,
          subject: msg.subject,
          content: msg.content,
          type: msg.type,
          isRead: Boolean(msg.isRead),
          sentViaEmail: Boolean(msg.sentViaEmail),
          createdAt: new Date(msg.createdAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${adminMessages.length} admin messages`);

    // 18. Migrate CopiedTrade
    console.log('Migrating CopiedTrades...');
    const copiedTrades = sqlite.prepare('SELECT * FROM CopiedTrade').all() as any[];
    for (const ct of copiedTrades) {
      await prisma.copiedTrade.upsert({
        where: { id: ct.id },
        update: {},
        create: {
          id: ct.id,
          followerId: ct.followerId,
          leaderId: ct.leaderId,
          originalTradeId: ct.originalTradeId,
          copiedTradeId: ct.copiedTradeId,
          amount: ct.amount,
          profit: ct.profit,
          createdAt: new Date(ct.createdAt),
        },
      });
    }
    console.log(`  ✓ Migrated ${copiedTrades.length} copied trades`);

    // 19. Migrate PendingCopyTrade
    console.log('Migrating PendingCopyTrades...');
    const pendingCopyTrades = sqlite.prepare('SELECT * FROM PendingCopyTrade').all() as any[];
    for (const pct of pendingCopyTrades) {
      await prisma.pendingCopyTrade.upsert({
        where: { id: pct.id },
        update: {},
        create: {
          id: pct.id,
          followerId: pct.followerId,
          originalTradeId: pct.originalTradeId,
          symbol: pct.symbol,
          direction: pct.direction,
          suggestedAmount: pct.suggestedAmount,
          entryPrice: pct.entryPrice,
          duration: pct.duration,
          market: pct.market,
          status: pct.status,
          expiresAt: new Date(pct.expiresAt),
          createdAt: new Date(pct.createdAt),
          processedAt: pct.processedAt ? new Date(pct.processedAt) : null,
        },
      });
    }
    console.log(`  ✓ Migrated ${pendingCopyTrades.length} pending copy trades`);

    console.log('\n=== Migration Complete! ===\n');

    // Summary
    console.log('Summary:');
    console.log(`  Users: ${users.length}`);
    console.log(`  Trades: ${trades.length}`);
    console.log(`  Deposits: ${deposits.length}`);
    console.log(`  Withdrawals: ${withdrawals.length}`);
    console.log(`  Payment Methods: ${paymentMethods.length}`);
    console.log(`  Market Configs: ${marketConfigs.length}`);

  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
