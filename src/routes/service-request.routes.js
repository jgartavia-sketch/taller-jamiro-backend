import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const router = Router();

const serviceRequestSchema = z.object({
  name: z.string().trim().min(3).max(100),
  brand: z.string().trim().min(2).max(80),
  model: z.string().trim().min(1).max(80),
  year: z.string().trim().regex(/^\d{4}$/, "El año debe tener cuatro dígitos."),
  service: z.string().trim().min(3).max(120),
  problem: z.string().trim().min(5).max(1500),
  preferredDate: z.string().trim().optional().or(z.literal("")),
});

router.post("/", async (req, res, next) => {
  try {
    const input = serviceRequestSchema.parse(req.body);
    const preferredDate = input.preferredDate ? new Date(`${input.preferredDate}T12:00:00.000Z`) : null;
    if (preferredDate && Number.isNaN(preferredDate.getTime())) return res.status(400).json({ error: "La fecha preferida no es válida." });

    const request = await prisma.serviceRequest.create({ data: { ...input, preferredDate } });
    res.status(201).json({ ok: true, request: { id: request.id, status: request.status, createdAt: request.createdAt } });
  } catch (error) {
    next(error);
  }
});

export default router; 