/**
 * SuperAdmin Seed Script
 *
 * Creates the initial SuperAdmin account for the platform.
 * Run with: npx tsx src/scripts/seed-superadmin.ts
 *
 * Environment variables:
 *   SUPERADMIN_EMAIL - Email for the SuperAdmin (optional, defaults to super@edutradex.com)
 *   SUPERADMIN_PASSWORD - Password for the SuperAdmin (optional, will generate secure password if not provided)
 *   SUPERADMIN_NAME - Name for the SuperAdmin (optional, defaults to "Super Admin")
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { query, queryOne } from '../config/db.js';

const SALT_ROUNDS = 10;

function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }
  // Ensure at least one of each required type
  password = password.substring(0, length - 4) + 'Aa1!';
  // Shuffle the last 4 characters into the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function seedSuperAdmin(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║              SuperAdmin Account Seeder                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Get configuration from environment or use defaults
  const email = process.env.SUPERADMIN_EMAIL || 'super@edutradex.com';
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';
  const providedPassword = process.env.SUPERADMIN_PASSWORD;

  // Check if SuperAdmin already exists
  const existing = await queryOne<{ id: string; email: string }>(
    `SELECT id, email FROM "User" WHERE email = $1`,
    [email.toLowerCase()]
  );

  if (existing) {
    console.log('⚠️  SuperAdmin already exists with this email!');
    console.log(`   Email: ${existing.email}`);
    console.log('\n   To reset the password, use the SuperAdmin panel or run:');
    console.log('   npx tsx src/scripts/seed-superadmin.ts --reset\n');

    // Check if --reset flag is provided
    if (process.argv.includes('--reset')) {
      console.log('🔄 Resetting password...\n');
      const newPassword = providedPassword || generateSecurePassword();
      const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

      await query(
        `UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE id = $2`,
        [hashedPassword, existing.id]
      );

      console.log('✅ Password reset successfully!\n');
      console.log('╔═══════════════════════════════════════════════════════════════╗');
      console.log('║                    NEW CREDENTIALS                             ║');
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log(`║  Email:    ${email.padEnd(50)} ║`);
      console.log(`║  Password: ${newPassword.padEnd(50)} ║`);
      console.log('╠═══════════════════════════════════════════════════════════════╣');
      console.log('║  ⚠️  SAVE THIS PASSWORD - IT WILL NOT BE SHOWN AGAIN!         ║');
      console.log('╚═══════════════════════════════════════════════════════════════╝\n');
      return;
    }

    return;
  }

  // Check if any SuperAdmin exists
  const anySuperAdmin = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM "User" WHERE role = 'SUPERADMIN'`
  );

  if (parseInt(anySuperAdmin?.count || '0', 10) > 0) {
    console.log('ℹ️  A SuperAdmin account already exists in the system.');
    console.log('   Proceeding to create an additional SuperAdmin...\n');
  }

  // Generate password if not provided
  const password = providedPassword || generateSecurePassword();
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Create the SuperAdmin
  try {
    const superAdmin = await queryOne<{ id: string; email: string }>(
      `INSERT INTO "User" (
        id, email, password, name, role, "isActive", "isProtected",
        "demoBalance", "liveBalance", "activeAccountType", "emailVerified"
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, 'SUPERADMIN', true, true,
        0, 0, 'LIVE', true
      )
      RETURNING id, email`,
      [email.toLowerCase(), hashedPassword, name]
    );

    if (!superAdmin) {
      throw new Error('Failed to create SuperAdmin - no result returned');
    }

    console.log('✅ SuperAdmin created successfully!\n');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    SUPERADMIN CREDENTIALS                      ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Email:    ${email.padEnd(50)} ║`);
    console.log(`║  Password: ${password.padEnd(50)} ║`);
    console.log(`║  Name:     ${name.padEnd(50)} ║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  ⚠️  SAVE THIS PASSWORD - IT WILL NOT BE SHOWN AGAIN!         ║');
    console.log('║  🔒 This account is PROTECTED and cannot be deleted.           ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Account Details:');
    console.log(`   ID: ${superAdmin.id}`);
    console.log(`   Role: SUPERADMIN`);
    console.log(`   Protected: Yes (cannot be deleted)`);
    console.log(`   Status: Active\n`);

    console.log('🌐 Access the SuperAdmin panel at:');
    console.log('   http://localhost:3000/superadmin\n');

  } catch (error) {
    console.error('❌ Failed to create SuperAdmin:', error);
    throw error;
  }
}

// Run the seeder
seedSuperAdmin()
  .then(() => {
    console.log('Seeding completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
