import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";

function readStaffAccounts() {
  const accounts = [];

  for (let index = 1; index <= 20; index += 1) {
    const name = String(process.env[`STAFF_${index}_NAME`] || "").trim();
    const email = String(process.env[`STAFF_${index}_EMAIL`] || "").trim().toLowerCase();
    const password = String(process.env[`STAFF_${index}_PASSWORD`] || "");

    const role = String(process.env[`STAFF_${index}_ROLE`] || "MECHANIC").trim().toUpperCase();
    if (!["MECHANIC", "RECEPTION"].includes(role)) throw new Error(`STAFF_${index}_ROLE no es válido.`);

    const hasAnyValue = Boolean(name || email || password);
    if (!hasAnyValue) continue;

    if (!name || !email || !password) {
      throw new Error(`STAFF_${index} está incompleto. Debe tener NAME, EMAIL y PASSWORD.`);
    }

    if (password.length < 10 || Buffer.byteLength(password, "utf8") > 72) {
      throw new Error(`STAFF_${index}_PASSWORD debe tener al menos 10 caracteres y como máximo 72 bytes.`);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`STAFF_${index}_EMAIL no es válido.`);
    accounts.push({ name, email, password, role });
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

  if (accounts.some((account) => account.email === adminEmail)) {
    throw new Error("El correo de admin no puede utilizarse como cuenta staff.");
  }
  const prepared = await Promise.all(accounts.map(async (account) => ({
    ...account, passwordHash: await bcrypt.hash(account.password, 12),
  })));
  await prisma.$transaction(async (tx) => {
    for (const { name, email, role, passwordHash } of prepared) {
      await tx.staffAccount.upsert({
        where: { email },
        update: { name, role, passwordHash, active: true, tokenVersion: { increment: 1 } },
        create: { name, email, role, passwordHash, active: true },
      });
    }
  });
  console.info(`Cuentas staff configuradas: ${accounts.length}. Las demás cuentas se conservan.`);
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
