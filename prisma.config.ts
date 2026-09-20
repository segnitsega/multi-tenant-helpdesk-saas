import "dotenv/config";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

// Migrations / schema work: prefer direct Neon URL (MIGRATE_DATABASE_URL).
// App runtime queries will use DATABASE_URL (and later app_user) via prisma/db.ts.
export default definePrismaConfig({
  orm: ormConfig({
    contract: "./prisma/contract.prisma",
    db: {
      connection:
        process.env["MIGRATE_DATABASE_URL"] ?? process.env["DATABASE_URL"]!,
    },
  }),
});
