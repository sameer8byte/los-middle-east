import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function migratePasswordsToBerypt() {
  console.log("🔄 Starting password migration to bcrypt...");

  try {
    // Get all active partner users with plain text passwords
    const partnerUsers = await prisma.partnerUser.findMany({
      where: {
        NOT: {
          password: {
            startsWith: "$2b$",
          },
        },
      },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    console.log(
      `📋 Found ${partnerUsers.length} users with plain text passwords`
    );

    if (partnerUsers.length === 0) {
      console.log(
        "✅ No users found with plain text passwords. Migration not needed."
      );
      return;
    }

    // Process users in batches to avoid overwhelming the database
    const batchSize = 10;
    let processedCount = 0;

    for (let i = 0; i < partnerUsers.length; i += batchSize) {
      const batch = partnerUsers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          try {
            // Hash the plain text password
            const hashedPassword = await bcrypt.hash(user.password, 12);

            // Update the user's password
            await prisma.partnerUser.update({
              where: { id: user.id },
              data: { password: hashedPassword },
            });

            processedCount++;
            console.log(
              `✅ Migrated password for user: ${user.email} (${processedCount}/${partnerUsers.length})`
            );
          } catch (error) {
            console.error(
              `❌ Failed to migrate password for user ${user.email}:`,
              error
            );
          }
        })
      );
    }

    console.log(
      `🎉 Password migration completed! Processed ${processedCount}/${partnerUsers.length} users.`
    );
  } catch (error) {
    console.error("❌ Password migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migratePasswordsToBerypt().catch((error) => {
  console.error("❌ Migration script failed:", error);
  process.exit(1);
});
