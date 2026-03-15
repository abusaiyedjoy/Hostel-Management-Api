import dotenv from "dotenv";
dotenv.config();

import { PrismaClient, Role, MealType, MealStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not set in .env file");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // ==================== ADMIN ====================
  const adminPassword = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "admin123",
    10,
  );
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@hostelhub.com" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@hostelhub.com",
      password: adminPassword,
      name: process.env.ADMIN_NAME || "Super Admin",
      phone: process.env.ADMIN_PHONE || "+1-9000000001",
      role: Role.ADMIN,
    },
  });
  console.log("✅ Admin created:", admin.email);

  // ==================== MESS MANAGER ====================
  const messManagerPassword = await bcrypt.hash("manager123", 10);
  const messManager = await prisma.user.upsert({
    where: { email: "manager@delhiboys.com" },
    update: {},
    create: {
      email: "manager@delhiboys.com",
      password: messManagerPassword,
      name: "Rajesh Kumar",
      phone: "+91-9000000002",
      role: Role.MESS_MANAGER,
    },
  });
  console.log("✅ Mess Manager created:", messManager.email);

  // ==================== MESS ====================
  const mess = await prisma.mess.upsert({
    where: { email: "delhiboys@hostelhub.com" },
    update: {},
    create: {
      name: "Delhi Boys Hostel",
      email: "delhiboys@hostelhub.com",
      phone: "+91-9000000002",
      address: "123 Main Street",
      city: "New Delhi",
      state: "Delhi",
      capacity: 50,
      ratePerMeal: 50,
      managerId: messManager.id,
    },
  });
  console.log("✅ Mess created:", mess.name);

  // ==================== MEAL MANAGER ====================
  const mealManagerPassword = await bcrypt.hash("meal123", 10);
  const mealManagerUser = await prisma.user.upsert({
    where: { email: "meals@delhiboys.com" },
    update: {},
    create: {
      email: "meals@delhiboys.com",
      password: mealManagerPassword,
      name: "Priya Singh",
      phone: "+91-9000000003",
      role: Role.MEAL_MANAGER,
    },
  });
  const mealManager = await prisma.mealManager.upsert({
    where: { userId: mealManagerUser.id },
    update: {},
    create: {
      userId: mealManagerUser.id,
      messId: mess.id,
    },
  });
  console.log("✅ Meal Manager created:", mealManagerUser.email);

  // ==================== MEMBERS ====================
  const memberRecords = [];
  for (let i = 1; i <= 5; i++) {
    const email = `member${i}@delhiboys.com`;
    const memberPassword = await bcrypt.hash(`member${i}123`, 10);
    const memberUser = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        password: memberPassword,
        name: `Member ${i}`,
        phone: `+91-900000000${i + 3}`,
        role: Role.MEMBER,
      },
    });
    const member = await prisma.member.upsert({
      where: { userId: memberUser.id },
      update: {},
      create: {
        registrationNo: `DBH-2024-${String(i).padStart(3, "0")}`,
        dateOfJoining: new Date(2024, 0, 15),
        totalBalance: 500,
        userId: memberUser.id,
        messId: mess.id,
      },
    });
    memberRecords.push(member);
    console.log("✅ Member created:", memberUser.email);
  }

  // ==================== MEALS + ENTRIES ====================
  const today = new Date();
  const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];

  for (let i = 0; i < 7; i++) {
    const mealDate = new Date(today);
    mealDate.setDate(mealDate.getDate() - i);

    for (const mealType of mealTypes) {
      const costPerMeal =
        mealType === MealType.BREAKFAST
          ? 30
          : mealType === MealType.LUNCH
            ? 60
            : 50;

      const meal = await prisma.meal.create({
        data: {
          mealType,
          date: mealDate,
          costPerMeal,
          totalCost: costPerMeal * memberRecords.length,
          messId: mess.id,
          mealManagerId: mealManager.id,
        },
      });

      for (const member of memberRecords) {
        await prisma.mealEntry.create({
          data: {
            status: MealStatus.TAKEN,
            cost: costPerMeal,
            userId: member.userId,
            memberId: member.id,
            mealId: meal.id,
          },
        });
      }
    }
  }
  console.log("✅ Meals and entries created for last 7 days");

  console.log("\n🎉 Seeding completed!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 Admin:        admin@hostelhub.com   / admin123");
  console.log("📧 Mess Manager: manager@delhiboys.com / manager123");
  console.log("📧 Meal Manager: meals@delhiboys.com   / meal123");
  console.log("📧 Member 1:     member1@delhiboys.com / member1123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
