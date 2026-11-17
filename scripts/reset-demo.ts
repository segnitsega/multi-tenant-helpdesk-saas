import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { systemDb } from "../src/server/db/system";

async function main() {
  const workspace = await systemDb.orm.public.Workspace.where({
    slug: "demo",
  }).first();
  if (!workspace) {
    throw new Error("Demo workspace not found. Run pnpm db:seed first.");
  }

  const tickets = await systemDb.orm.public.Ticket.where({
    workspaceId: workspace.id,
  }).all();

  for (const ticket of tickets) {
    await systemDb.orm.public.Message.where({ ticketId: ticket.id }).delete();
    await systemDb.orm.public.Ticket.where({ id: ticket.id }).delete();
  }

  const inbound = await systemDb.orm.public.InboundEmail.where({
    workspaceId: workspace.id,
  }).all();
  for (const row of inbound) {
    await systemDb.orm.public.InboundEmail.where({ id: row.id }).delete();
  }

  console.log(
    JSON.stringify(
      {
        workspace: workspace.slug,
        deletedTickets: tickets.length,
        deletedInboundEmails: inbound.length,
        next: "pnpm db:seed",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await systemDb.close();
  });
