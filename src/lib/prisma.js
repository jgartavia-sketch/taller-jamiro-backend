import { PrismaClient } from "@prisma/client";

export const prisma = globalThis.__jamiroPrisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__jamiroPrisma = prisma;
}

