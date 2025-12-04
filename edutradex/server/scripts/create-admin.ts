import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@optigobroker.com';
  const password = 'Admin123!';
  const name = 'Admin User';

  // Check if admin already exists
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Update existing user to admin
    const updated = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
    console.log('Updated existing user to ADMIN:', updated.email);
  } else {
    // Create new admin user
    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
        demoBalance: 10000,
        isActive: true,
      },
    });
    console.log('Created admin user:', admin.email);
  }

  console.log('\n=== Admin Credentials ===');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('=========================\n');

  await prisma.$disconnect();
}

createAdmin().catch(console.error);
