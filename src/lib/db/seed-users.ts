/**
 * Seed script: creates the four default demo users.
 * Run once after db:push: npx tsx src/lib/db/seed-users.ts
 *
 * Demo credentials (change before any non-local use):
 *   admin@intellios.dev     / Admin1234!
 *   designer@intellios.dev  / Designer1234!
 *   reviewer@intellios.dev  / Reviewer1234!
 *   officer@intellios.dev   / Officer1234!
 */

import { db } from "./index";
import { users } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DEMO_USERS = [
  {
    email: "admin@intellios.dev",
    name: "Admin",
    password: "Admin1234!",
    role: "admin",
  },
  {
    email: "designer@intellios.dev",
    name: "Agent Architect",
    password: "Designer1234!",
    role: "architect",
  },
  {
    email: "reviewer@intellios.dev",
    name: "Compliance Reviewer",
    password: "Reviewer1234!",
    role: "reviewer",
  },
  {
    email: "officer@intellios.dev",
    name: "Compliance Officer",
    password: "Officer1234!",
    role: "compliance_officer",
  },
];

async function seedUsers() {
  console.log("Seeding demo users...");

  for (const u of DEMO_USERS) {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, u.email),
    });

    if (existing) {
      console.log(`  skip  ${u.email} (already exists)`);
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 12);
    await db.insert(users).values({
      email: u.email,
      name: u.name,
      passwordHash,
      role: u.role,
    });
    console.log(`  added ${u.email} [${u.role}]`);
  }

  console.log("Done.");
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
