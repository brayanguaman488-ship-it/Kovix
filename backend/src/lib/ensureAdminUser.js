import bcrypt from "bcryptjs";

import { prisma } from "./prisma.js";

export async function ensureAdminUser() {
  const username = (process.env.ADMIN_USERNAME || "admin").trim();
  const password = String(process.env.ADMIN_PASSWORD || "123456");

  if (!username || !password) {
    throw new Error("ADMIN_USERNAME y ADMIN_PASSWORD son obligatorios");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      fullName: "Administrador KOVIX",
      role: "ADMIN",
    },
    create: {
      username,
      passwordHash,
      fullName: "Administrador KOVIX",
      role: "ADMIN",
    },
  });

  return username;
}
