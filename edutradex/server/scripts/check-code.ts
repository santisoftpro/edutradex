import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find user with that referral code
  const referrer = await prisma.user.findFirst({
    where: { referralCode: 'NYANV7XZ' },
    select: { id: true, name: true, email: true, referralCode: true, totalReferrals: true }
  });
  console.log('Referrer with code NYANV7XZ:', referrer);

  // Find the user Jesus Santima who should have been referred
  const referred = await prisma.user.findFirst({
    where: { email: 'santisoftpro@gmail.com' },
    select: { id: true, name: true, referredBy: true, referralCode: true }
  });
  console.log('Jesus Santima:', referred);
}

main().finally(() => prisma.$disconnect());
