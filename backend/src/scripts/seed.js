import { ensureAdminUser } from "../lib/ensureAdminUser.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  const username = await ensureAdminUser();

  console.log(`Usuario administrador listo: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
