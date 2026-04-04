import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const CORRECT_ROLES: Record<string, string> = {
  "admin@intellios.dev": "admin",
  "designer@intellios.dev": "architect",
  "reviewer@intellios.dev": "reviewer",
  "officer@intellios.dev": "compliance_officer",
};

const CORRECT_PASSWORDS: Record<string, string> = {
  "admin@intellios.dev": "Admin1234!",
  "designer@intellios.dev": "Designer1234!",
  "reviewer@intellios.dev": "Reviewer1234!",
  "officer@intellios.dev": "Officer1234!",
};

async function checkAndFix() {
  const rows = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role }).from(users);
  console.log("Current users:");
  console.log(JSON.stringify(rows, null, 2));

  for (const row of rows) {
    const expectedRole = CORRECT_ROLES[row.email];
    if (expectedRole && row.role !== expectedRole) {
      console.log(`Fixing role for ${row.email}: ${row.role} → ${expectedRole}`);
      await db.update(users).set({ role: expectedRole }).where(eq(users.id, row.id));
    }
    // Also reset password to be safe
    const expectedPw = CORRECT_PASSWORDS[row.email];
    if (expectedPw) {
      const hash = await bcrypt.hash(expectedPw, 12);
      await db.update(users).set({ passwordHash: hash }).where(eq(users.id, row.id));
      console.log(`Reset password for ${row.email}`);
    }
  }

  const fixed = await db.select({ email: users.email, name: users.name, role: users.role }).from(users);
  console.log("\nAfter fix:");
  console.log(JSON.stringify(fixed, null, 2));
  process.exit(0);
}

checkAndFix().catch((e) => { console.error(e); process.exit(1); });
