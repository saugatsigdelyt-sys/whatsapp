import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create a test user
  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  // Create a test business
  const business = await prisma.business.upsert({
    where: { slug: "test-business" },
    update: {},
    create: {
      name: "Test Business",
      slug: "test-business",
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  });

  console.log(`✅ Created user: ${user.email}`);
  console.log(`✅ Created business: ${business.name}`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
