import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { resolve } from "path";

// Load env
dotenv.config({ path: resolve(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found");
  process.exit(1);
}

const defaultTiers = [
  {
    name: "BRONZE",
    nameKo: "브론즈",
    minAmount: 0,
    discountRate: "0.00",
    pointRate: "1.00",
    color: "#CD7F32",
    icon: "Star",
    sortOrder: 1,
    periodMonths: 6,
    isActive: true,
  },
  {
    name: "SILVER",
    nameKo: "실버",
    minAmount: 50000,
    discountRate: "2.00",
    pointRate: "2.00",
    color: "#C0C0C0",
    icon: "Star",
    sortOrder: 2,
    periodMonths: 6,
    isActive: true,
  },
  {
    name: "GOLD",
    nameKo: "골드",
    minAmount: 150000,
    discountRate: "3.00",
    pointRate: "3.00",
    color: "#FFD700",
    icon: "Crown",
    sortOrder: 3,
    periodMonths: 6,
    isActive: true,
  },
  {
    name: "PLATINUM",
    nameKo: "플래티넘",
    minAmount: 300000,
    discountRate: "5.00",
    pointRate: "4.00",
    color: "#E5E4E2",
    icon: "Crown",
    sortOrder: 4,
    periodMonths: 6,
    isActive: true,
  },
  {
    name: "DIAMOND",
    nameKo: "다이아몬드",
    minAmount: 500000,
    discountRate: "7.00",
    pointRate: "5.00",
    color: "#B9F2FF",
    icon: "Gem",
    sortOrder: 5,
    periodMonths: 6,
    isActive: true,
  },
];

async function seed() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  // Check if tiers already exist
  const [rows] = await connection.execute("SELECT COUNT(*) as cnt FROM membership_tiers");
  if (rows[0].cnt > 0) {
    console.log(`Already have ${rows[0].cnt} tiers. Skipping seed.`);
    await connection.end();
    return;
  }

  // Insert default tiers
  for (const tier of defaultTiers) {
    await connection.execute(
      `INSERT INTO membership_tiers (name, nameKo, minAmount, discountRate, pointRate, color, icon, sortOrder, periodMonths, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tier.name, tier.nameKo, tier.minAmount, tier.discountRate, tier.pointRate, tier.color, tier.icon, tier.sortOrder, tier.periodMonths, tier.isActive]
    );
    console.log(`Inserted tier: ${tier.nameKo} (${tier.name})`);
  }

  console.log("Default tiers seeded successfully!");
  await connection.end();
}

seed().catch(console.error);
