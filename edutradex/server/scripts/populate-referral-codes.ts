import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateReferralCode(name: string): string {
  const namePrefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${namePrefix}${randomSuffix}`;
}

async function main() {
  console.log('Populating referral codes for existing users...');

  // Find users without referral codes
  const usersWithoutCode = await prisma.user.findMany({
    where: { referralCode: null },
    select: { id: true, name: true },
  });

  console.log(`Found ${usersWithoutCode.length} users without referral codes`);

  for (const user of usersWithoutCode) {
    let referralCode = generateReferralCode(user.name);
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure uniqueness
    while (attempts < maxAttempts) {
      const existing = await prisma.user.findFirst({
        where: { referralCode },
      });

      if (!existing) break;

      referralCode = generateReferralCode(user.name);
      attempts++;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { referralCode },
    });

    console.log(`Updated user ${user.name} with referral code: ${referralCode}`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
