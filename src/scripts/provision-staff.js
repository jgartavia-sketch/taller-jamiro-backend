import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

function readStaffAccounts() {
  const accounts = [];

  for (let index = 1; index <= 20; index += 1) {
    const name = String(process.env[`STAFF_${index}_NAME`] || "").trim();
    const email = String(process.env[`STAFF_${index}_EMAIL`] || "").trim().toLowerCase();
    const password = String(process.env[`STAFF_${index}_PASSWORD`] || "");

    const hasAnyValue = Boolean(name || email || password);
    if (!hasAnyValue) continue;

    if (!name || !email || !password) {
      throw new Error(`STAFF_${index} está incompleto. Debe tener NAME, EMAIL y PASSWORD.`);
    }

    if (password.length < 8) {
      throw new Error(`STAFF_${index}_PASSWORD debe tener al menos 8 caracteres.`);
    }

    accounts.push({ name, email, password });
  }

  if (accounts.length === 0) {
    throw new Error("No hay cuentas STAFF configuradas.");
  }

  const emails = accounts.map((account) => account.email);
  if (new Set(emails).size !== emails.length) {
    throw new Error("Hay correos STAFF duplicados en las variables de entorno.");
  }

  return accounts;
}

async function provision() {
  const accounts = readStaffAccounts();
  const adminEmail = String(process.env.ADMIN_EMAIL || "automotrizjamirosc@gmail.com")
    .trim()
    .toLowerCase();

  for (const account of accounts) {
    const passwordHash = await bcrypt.hash(account.password, 12);

    await prisma.staffAccount.upsert({
      where: { email: account.email },
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

    console.info(`Cuenta staff activa: ${account.name} <${account.email}>`);
  }

  const allowedEmails = [...accounts.map((account) => account.email), adminEmail];
  const deactivated = await prisma.staffAccount.updateMany({
    where: {
      email: { notIn: allowedEmails },
      active: true,
    },
    data: { active: false },
  });

  console.info(`Cuentas staff configuradas: ${accounts.length}`);
  console.info(`Cuentas antiguas desactivadas: ${deactivated.count}`);
}

try {
  await provision();
} catch (error) {
  console.error("No se pudieron provisionar las cuentas staff.");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
