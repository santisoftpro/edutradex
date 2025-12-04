import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== Recent Users ===');
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
      referredBy: true,
      totalReferrals: true,
      referralEarnings: true,
      createdAt: true,
    }
  });

  users.forEach(u => {
    console.log(`- ${u.name} (${u.email})`);
    console.log(`  Code: ${u.referralCode}`);
    console.log(`  Referred By: ${u.referredBy || 'None'}`);
    console.log(`  Total Referrals: ${u.totalReferrals}, Earnings: $${u.referralEarnings}`);
    console.log(`  Created: ${u.createdAt}`);
    console.log('');
  });

  console.log('\n=== Referral Settings ===');
  const settings = await prisma.referralSettings.findFirst();
  if (settings) {
    console.log(`Signup Bonus: $${settings.signupBonus}`);
    console.log(`Deposit Commission: ${settings.depositCommission}%`);
    console.log(`Trade Commission: ${settings.tradeCommission}%`);
    console.log(`Is Active: ${settings.isActive}`);
  } else {
    console.log('No settings found - will be created on first use');
  }

  console.log('\n=== Referral Commissions ===');
  const commissions = await prisma.referralCommission.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      earner: { select: { name: true } },
      generator: { select: { name: true } },
    }
  });

  if (commissions.length === 0) {
    console.log('No commissions recorded yet');
  } else {
    commissions.forEach(c => {
      console.log(`- ${c.type}: $${c.amount} earned by ${c.earner.name} from ${c.generator.name}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
