import { createClient } from "@supabase/supabase-js";
import { db } from "./index";
import { users } from "./schema";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seed() {
  console.log("🌱 Seeding Admin User...");
  const email = "test@example.com";
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "Testing123",
    email_confirm: true,
  });

  if (data.user) {
    await db.insert(users).values({
      id: data.user.id,
      email,
      name: "Super Admin",
    }).onConflictDoNothing();
    console.log("✅ Created: test@example.com / Testing123");
  } else {
    console.log("ℹ️ User already exists");
  }
}

seed();