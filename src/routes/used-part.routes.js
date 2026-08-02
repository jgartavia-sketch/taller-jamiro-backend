import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const router = Router();

const requestSchema = z.object({
  name: z.string().trim().min(3).max(100),
  brand: z.string().trim().min(2).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.string().trim().regex(/^\d{4}$/, "El año debe tener cuatro dígitos."),
  part: z.string().trim().min(2).max(160),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
});

router.post("/", async (req, res, next) => {
  try {
    const input = requestSchema.parse(req.body);
    const request = await prisma.usedPartRequest.create({
      data: {
        ...input,
        details: input.details || null,
      },
    });

    res.status(201).json({
      ok: true,
      request: {
        id: request.id,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;