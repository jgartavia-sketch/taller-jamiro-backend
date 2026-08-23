import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

function readStaff() {
  const name = String(process.env.STAFF_1_NAME || "").trim();
  const email = String(process.env.STAFF_1_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(process.env.STAFF_1_PASSWORD || "");

  if (!name || !email || !password) {
    throw new Error(
      "Faltan STAFF_1_NAME, STAFF_1_EMAIL o STAFF_1_PASSWORD."
    );
  }

  if (password.length < 8) {
    throw new Error(
      "STAFF_1_PASSWORD debe tener al menos 8 caracteres."
    );
  }

  return { name, email, password };
}

async function provision() {
  const account = readStaff();
  const passwordHash = await bcrypt.hash(account.password, 12);

  await prisma.staffAccount.upsert({
    where: {
      email: account.email,
    },
    update: {
      name: account.name,
      passwordHash,
      active: true,
    },
    create: {
      name: account.name,
      email: account.email,
      passwordHash,
      active: true,
    },
  });

  const deactivated = await prisma.staffAccount.updateMany({
    where: {
      email: {
        not: account.email,
      },
      active: true,
    },
    data: {
      active: false,
    },
  });

  console.info(`Única cuenta staff activa: ${account.email}`);
  console.info(`Otras cuentas desactivadas: ${deactivated.count}`);
}

try {
  await provision();
} catch (error) {
  console.error("No se pudo provisionar la cuenta staff.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}