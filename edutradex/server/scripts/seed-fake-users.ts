import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Realistic first names
const firstNames = [
  'James', 'Michael', 'Robert', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher', 'Daniel',
  'Matthew', 'Anthony', 'Mark', 'Steven', 'Andrew', 'Joshua', 'Kevin', 'Brian', 'Edward', 'Ronald',
  'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail',
  'Emily', 'Elizabeth', 'Sofia', 'Avery', 'Ella', 'Scarlett', 'Grace', 'Victoria', 'Riley', 'Aria',
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Cameron', 'Avery', 'Quinn', 'Skyler'
];

// Realistic last names
const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
];

// Gmail variations
const gmailVariations = [
  (first: string, last: string) => `${first.toLowerCase()}.${last.toLowerCase()}`,
  (first: string, last: string) => `${first.toLowerCase()}${last.toLowerCase()}`,
  (first: string, last: string) => `${first.toLowerCase()}_${last.toLowerCase()}`,
  (first: string, last: string) => `${first.toLowerCase()}${last.toLowerCase()}${Math.floor(Math.random() * 99)}`,
  (first: string, last: string) => `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(Math.random() * 999)}`,
  (first: string, last: string) => `${first.charAt(0).toLowerCase()}${last.toLowerCase()}`,
  (first: string, last: string) => `${first.toLowerCase()}${last.charAt(0).toLowerCase()}${Math.floor(Math.random() * 99)}`,
  (first: string, last: string) => `${last.toLowerCase()}.${first.toLowerCase()}`,
];

// Leader descriptions
const leaderDescriptions = [
  'Professional trader with 5+ years of experience in forex and binary options. Focused on technical analysis.',
  'Full-time trader specializing in EUR/USD and GBP/USD pairs. Consistent profits since 2019.',
  'Risk-managed trading strategy with focus on capital preservation. 70%+ win rate.',
  'Algorithmic trading enthusiast. Using price action and support/resistance levels.',
  'Day trader focusing on high-probability setups. Transparent trading history.',
  'Former investment banker turned independent trader. Specializing in volatile markets.',
  'Technical analyst with expertise in candlestick patterns and trend following.',
  'Swing trader with a disciplined approach. Patient entries, calculated exits.',
  'Momentum trader catching big moves. High reward-to-risk ratio strategy.',
  'Conservative trading style. Slow and steady wins the race.',
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEmail(firstName: string, lastName: string): string {
  const variation = getRandomElement(gmailVariations);
  return `${variation(firstName, lastName)}@gmail.com`;
}

function generateBalance(): number {
  // Random balance between 100 and 50000
  return Math.floor(Math.random() * 49900) + 100;
}

async function seedFakeUsers() {
  console.log('Starting to seed fake users...\n');

  const hashedPassword = await bcrypt.hash('Demo123!', 10);
  const usersToCreate = 25;
  const leadersToCreate = 8;

  const createdUsers: { id: string; name: string }[] = [];

  // Create regular users
  for (let i = 0; i < usersToCreate; i++) {
    const firstName = getRandomElement(firstNames);
    const lastName = getRandomElement(lastNames);
    const name = `${firstName} ${lastName}`;
    const email = generateEmail(firstName, lastName);
    const balance = generateBalance();

    try {
      // Check if email already exists
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        console.log(`  Skipping ${email} (already exists)`);
        continue;
      }

      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'USER',
          isActive: true,
          demoBalance: balance,
        },
      });

      createdUsers.push({ id: user.id, name: user.name });
      console.log(`  Created user: ${name} (${email}) - Balance: $${balance}`);
    } catch (error) {
      console.log(`  Error creating user ${email}:`, error);
    }
  }

  console.log(`\nCreated ${createdUsers.length} users`);

  // Create leaders from some users
  console.log('\nCreating copy trading leaders...\n');

  const leaderCandidates = createdUsers.slice(0, leadersToCreate);

  for (const user of leaderCandidates) {
    const displayName = user.name.split(' ')[0] + 'Trader' + Math.floor(Math.random() * 999);
    const description = getRandomElement(leaderDescriptions);

    // Generate realistic stats
    const totalTrades = Math.floor(Math.random() * 300) + 50;
    const winRate = Math.floor(Math.random() * 25) + 65; // 65-90%
    const winningTrades = Math.floor(totalTrades * (winRate / 100));
    const totalProfit = Math.floor(Math.random() * 15000) + 1000;

    try {
      const leader = await prisma.copyTradingLeader.create({
        data: {
          userId: user.id,
          displayName,
          description,
          status: 'APPROVED',
          totalTrades,
          winningTrades,
          winRate,
          totalProfit,
          maxFollowers: 100,
          isPublic: true,
          approvedAt: new Date(),
        },
      });

      console.log(`  Created leader: ${displayName}`);
      console.log(`    Win Rate: ${winRate}% | Trades: ${totalTrades} | Profit: $${totalProfit}`);
    } catch (error) {
      console.log(`  Error creating leader for ${user.name}:`, error);
    }
  }

  // Create some fake trades for leaders to make it look more realistic
  console.log('\nCreating trade history for leaders...\n');

  const leaders = await prisma.copyTradingLeader.findMany({
    where: { status: 'APPROVED' },
    include: { user: true },
  });

  const symbols = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP', 'NZD/USD'];

  for (const leader of leaders) {
    const numTrades = Math.floor(Math.random() * 20) + 10;

    for (let i = 0; i < numTrades; i++) {
      const symbol = getRandomElement(symbols);
      const direction = Math.random() > 0.5 ? 'UP' : 'DOWN';
      const amount = Math.floor(Math.random() * 100) + 10;
      const duration = getRandomElement([60, 120, 180, 300]);
      const entryPrice = 1.0 + Math.random() * 0.5;
      const isWin = Math.random() < (leader.winRate / 100);
      const result = isWin ? 'WIN' : 'LOSS';
      const profit = isWin ? amount * 0.85 : -amount;
      const exitPrice = isWin
        ? (direction === 'UP' ? entryPrice + 0.001 : entryPrice - 0.001)
        : (direction === 'UP' ? entryPrice - 0.001 : entryPrice + 0.001);

      // Random date in the past 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const openedAt = new Date();
      openedAt.setDate(openedAt.getDate() - daysAgo);
      openedAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const closedAt = new Date(openedAt.getTime() + duration * 1000);

      try {
        await prisma.trade.create({
          data: {
            userId: leader.userId,
            symbol,
            direction,
            amount,
            entryPrice,
            exitPrice,
            duration,
            payoutPercent: 85,
            status: 'CLOSED',
            result,
            profit,
            market: 'forex',
            openedAt,
            closedAt,
            expiresAt: closedAt,
            isCopyTrade: false,
          },
        });
      } catch (error) {
        // Ignore errors
      }
    }
    console.log(`  Created ${numTrades} trades for ${leader.displayName}`);
  }

  // Create some followers relationships
  console.log('\nCreating follower relationships...\n');

  const allUsers = await prisma.user.findMany({
    where: {
      leaderProfile: null, // Users who are not leaders
    },
    take: 15,
  });

  for (const user of allUsers) {
    // Each user follows 1-3 random leaders
    const numToFollow = Math.floor(Math.random() * 3) + 1;
    const leadersToFollow = leaders.sort(() => Math.random() - 0.5).slice(0, numToFollow);

    for (const leader of leadersToFollow) {
      if (leader.userId === user.id) continue; // Can't follow yourself

      try {
        await prisma.copyTradingFollower.create({
          data: {
            followerId: user.id,
            leaderId: leader.id,
            copyMode: Math.random() > 0.5 ? 'AUTOMATIC' : 'MANUAL',
            fixedAmount: Math.floor(Math.random() * 50) + 10,
            maxDailyTrades: 50,
            isActive: true,
            totalCopied: Math.floor(Math.random() * 20),
            totalProfit: Math.floor(Math.random() * 500) - 100,
          },
        });
        console.log(`  ${user.name} now follows ${leader.displayName}`);
      } catch (error) {
        // Ignore duplicate follows
      }
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log('\nSummary:');
  console.log(`  - Users created: ${createdUsers.length}`);
  console.log(`  - Leaders created: ${leaderCandidates.length}`);
  console.log(`  - Default password for all users: Demo123!`);
}

seedFakeUsers()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
