import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma.js";

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "123456";
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      fullName: "Administrador KOVIX",
    },
    create: {
      username,
      passwordHash,
      fullName: "Administrador KOVIX",
    },
  });

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
