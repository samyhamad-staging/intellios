import { db } from "./index";
import { users } from "./schema";

async function check() {
  const u = await db.select({ email: users.email, role: users.role, enterpriseId: users.enterpriseId }).from(users);
  console.log("Users:", JSON.stringify(u, null, 2));
  process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
