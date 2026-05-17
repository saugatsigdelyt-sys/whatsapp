import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generatePassword(length = 20): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}

async function main() {
  console.log("🌱 Seeding database...");

  // ── Platform Settings (singleton) ─────────────────────────────────────────
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", updatedAt: new Date() },
  });
  console.log("✅ Platform settings initialized");

  // ── Admin account ──────────────────────────────────────────────────────────
  const adminPassword = process.env.ADMIN_PASSWORD ?? generatePassword();
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@whatsapi.buzz" },
    update: { passwordHash: adminHash, role: "SUPER_ADMIN" },
    create: {
      email: "admin@whatsapi.buzz",
      name: "Platform Admin",
      passwordHash: adminHash,
      role: "SUPER_ADMIN",
    },
  });

  // Ensure admin has a business so JWT includes businessId
  const adminBusiness = await prisma.business.upsert({
    where: { slug: "whatsapi-admin" },
    update: {},
    create: { name: "WhatsAPI Admin", slug: "whatsapi-admin" },
  });
  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: adminBusiness.id, userId: adminUser.id } },
    update: { role: "OWNER" },
    create: { businessId: adminBusiness.id, userId: adminUser.id, role: "OWNER" },
  });

  console.log(`✅ Admin account: admin@whatsapi.buzz`);
  console.log(`   Password: ${process.env.ADMIN_PASSWORD ? "(from env)" : adminPassword}`);

  // ── Manager account ────────────────────────────────────────────────────────
  const managerPassword = process.env.MANAGER_PASSWORD ?? generatePassword();
  const managerHash = await bcrypt.hash(managerPassword, 12);

  const managerUser = await prisma.user.upsert({
    where: { email: "manager@whatsapi.buzz" },
    update: { passwordHash: managerHash, role: "SUPER_ADMIN" },
    create: {
      email: "manager@whatsapi.buzz",
      name: "Platform Manager",
      passwordHash: managerHash,
      role: "SUPER_ADMIN",
    },
  });

  // Ensure manager has a business
  const managerBusiness = await prisma.business.upsert({
    where: { slug: "whatsapi-manager" },
    update: {},
    create: { name: "WhatsAPI Manager", slug: "whatsapi-manager" },
  });
  await prisma.businessMember.upsert({
    where: { businessId_userId: { businessId: managerBusiness.id, userId: managerUser.id } },
    update: { role: "OWNER" },
    create: { businessId: managerBusiness.id, userId: managerUser.id, role: "OWNER" },
  });

  console.log(`✅ Manager account: manager@whatsapi.buzz`);
  console.log(`   Password: ${process.env.MANAGER_PASSWORD ? "(from env)" : managerPassword}`);

  // ── Welcome announcement ───────────────────────────────────────────────────
  const annCount = await prisma.announcement.count();
  if (annCount === 0) {
    await prisma.announcement.create({
      data: {
        title: "Welcome to WhatsAPI!",
        body: "Get started by importing your WhatsApp Business account under Dashboard → Account → Phone Numbers.",
        type: "info",
        active: true,
      },
    });
    console.log("✅ Welcome announcement created");
  }

  console.log("\n🎉 Seed complete!");
  console.log("\n⚠️  IMPORTANT: Save these credentials securely and change them after first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
