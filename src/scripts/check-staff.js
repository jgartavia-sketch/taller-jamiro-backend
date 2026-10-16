import "dotenv/config";
import { prisma } from "../lib/prisma.js";
try {
  const accounts = await prisma.staffAccount.findMany({
    select: { name: true, email: true, role: true, active: true },
    orderBy: { name: "asc" },
  });
  console.table(accounts);
  console.info(`Cuentas activas: ${accounts.filter((account) => account.active).length}`);
} catch (error) {
  console.error("No se pudo consultar el personal:", error?.code || error?.name);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
