import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding admin user...");

  const passwordHash = await bcrypt.hash("Admin123!", 12);

  const admin = await prisma.admin.upsert({
    where: { email: "admin@optigobroker.com" },
    update: {},
    create: {
      email: "admin@optigobroker.com",
      passwordHash,
      name: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log(`Admin user created/updated: ${admin.email}`);
  console.log("Login credentials:");
  console.log("  Email: admin@optigobroker.com");
  console.log("  Password: Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
