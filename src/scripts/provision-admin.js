import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

function readAdmin() {
  const name = "Jairo";
  const email = String(process.env.ADMIN_EMAIL || "automotrizjamirosc@gmail.com")
    .trim()
    .toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");

  if (!password) throw new Error("Falta ADMIN_PASSWORD.");
  if (password.length < 10) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 10 caracteres.");
  }

  return { name, email, password };
}

async function provision() {
  const account = readAdmin();
  const passwordHash = await bcrypt.hash(account.password, 12);

  await prisma.staffAccount.upsert({
    where: { email: account.email },
    update: { name: account.name, passwordHash, active: true },
    create: { name: account.name, email: account.email, passwordHash, active: true },
  });

  console.info(`Cuenta administrativa activa: ${account.email}`);
}

try {
  await provision();
} catch (error) {
  console.error("No se pudo provisionar la cuenta administrativa.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
