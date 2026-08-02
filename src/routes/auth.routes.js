import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { publicUser } from "../lib/public-user.js";
import { sendWelcomeEmail } from "../lib/email.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(3).max(100),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(8).max(30),
  password: z.string().min(8).max(100),
  referral: z.string().trim().max(30).optional().or(z.literal("")),
});
const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(100),
});

function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) return res.status(409).json({ error: "Ese correo ya tiene una cuenta." });

    let referralCode = null;
    if (input.referral) {
      referralCode = await prisma.referralCode.findUnique({
        where: { code: input.referral.toUpperCase() },
      });
      if (!referralCode || referralCode.usedAt || referralCode.expiresAt <= new Date()) {
        return res.status(400).json({ error: "El código de referido no es válido o ya venció." });
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          customerCode: `JAM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash: await bcrypt.hash(input.password, 12),
          referredById: referralCode?.ownerId,
        },
      });

      if (referralCode) {
        await tx.referralCode.update({
          where: { id: referralCode.id },
          data: { usedAt: new Date(), usedById: created.id },
        });
        await tx.user.update({
          where: { id: referralCode.ownerId },
          data: {
            referralPoints: { increment: config.referralRewardPoints },
            referralCount: { increment: 1 },
          },
        });
        await tx.pointMovement.create({
          data: {
            userId: referralCode.ownerId,
            type: "REFERRAL",
            points: config.referralRewardPoints,
            description: `Referido confirmado: ${created.name}`,
            referenceId: `referral:${referralCode.id}`,
          },
        });
      }
      return created;
    });

    const customer = publicUser(user);
    res.status(201).json({ token: createToken(user), customer });

    sendWelcomeEmail(user).catch((error) => {
      console.error(`No se pudo enviar el correo de bienvenida a ${user.email}:`, error.message);
    });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ error: "Correo o contraseña incorrectos." });
    }
    res.json({ token: createToken(user), customer: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const movements = await prisma.pointMovement.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const referral = await prisma.referralCode.findFirst({
      where: { ownerId: req.user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      customer: publicUser(req.user),
      movements: movements.map((item) => ({
        id: item.id,
        kind: item.type,
        points: item.points,
        amount_colones: item.amountColones,
        description: item.description,
        created_at: item.createdAt,
      })),
      referral: referral ? { code: referral.code, expiry: referral.expiresAt } : null,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", (_req, res) => res.json({ ok: true }));

export default router;