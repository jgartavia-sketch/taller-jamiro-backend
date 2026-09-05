import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(100),
});

function publicAdmin(admin) {
  return { id: admin.id, name: admin.name, email: admin.email };
}

function bearerToken(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function requireAdminSession(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Debés iniciar sesión como administrador." });

    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.kind !== "admin") {
      return res.status(401).json({ error: "Esta sesión no corresponde al administrador." });
    }

    const admin = await prisma.staffAccount.findUnique({ where: { id: payload.sub } });
    if (!admin || !admin.active || admin.email !== config.adminEmail) {
      return res.status(401).json({ error: "La cuenta administrativa no está activa." });
    }

    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ error: "La sesión venció o no es válida." });
  }
}

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    if (input.email !== config.adminEmail) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    const admin = await prisma.staffAccount.findUnique({ where: { email: input.email } });
    if (!admin || !admin.active || !(await bcrypt.compare(input.password, admin.passwordHash))) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }

    const token = jwt.sign(
      { sub: admin.id, kind: "admin" },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn },
    );

    res.json({ token, admin: publicAdmin(admin) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAdminSession, (req, res) => {
  res.json({ admin: publicAdmin(req.admin) });
});

router.get("/customers", requireAdminSession, async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const customers = await prisma.user.findMany({
      where: {
        role: "CUSTOMER",
        ...(q ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { customerCode: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      select: {
        id: true,
        customerCode: true,
        name: true,
        email: true,
        phone: true,
        purchasePoints: true,
        referralPoints: true,
        referralCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    res.json({
      total: customers.length,
      customers: customers.map((customer) => ({
        id: customer.id,
        customerId: customer.customerCode,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        purchasePoints: customer.purchasePoints,
        referralPoints: customer.referralPoints,
        referralCount: customer.referralCount,
        totalPoints: customer.purchasePoints + customer.referralPoints,
        createdAt: customer.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
