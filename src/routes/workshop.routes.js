import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";

const router = Router();
const statuses = ["RECEIVED", "DIAGNOSIS", "IN_PROGRESS", "WAITING_PARTS", "QUALITY_CHECK", "READY", "DELIVERED", "CANCELLED"];
const photoSchema = z.string().max(1_500_000).refine((value) => /^data:image\/(jpeg|png|webp);base64,/.test(value), "Formato de imagen no permitido.");
const photosSchema = z.array(photoSchema).max(8).default([]);

const createSchema = z.object({
  customerId: z.uuid(), plate: z.string().trim().min(2).max(20), brand: z.string().trim().min(2).max(60),
  model: z.string().trim().min(1).max(60), year: z.string().trim().regex(/^\d{4}$/), color: z.string().trim().min(2).max(40),
  mileage: z.coerce.number().int().min(0).max(5_000_000), fuelLevel: z.enum(["EMPTY", "QUARTER", "HALF", "THREE_QUARTERS", "FULL"]),
  reason: z.string().trim().min(3).max(1000), visibleDamage: z.string().trim().max(1000).optional().or(z.literal("")),
  receivedItems: z.string().trim().max(1000).optional().or(z.literal("")), estimatedDelivery: z.string().trim().optional().or(z.literal("")),
  photos: photosSchema,
});

const updateSchema = z.object({ status: z.enum(statuses), note: z.string().trim().min(3).max(1500), photos: photosSchema });

const includeOrder = {
  customer: { select: { id: true, customerCode: true, name: true, email: true, phone: true } },
  vehicle: true,
  photos: { where: { updateId: null }, orderBy: { createdAt: "asc" } },
  updates: { include: { photos: true, createdByStaff: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
};

function orderCode() {
  return `JAM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

router.get("/staff/orders", requireStaff, async (_req, res, next) => {
  try {
    const orders = await prisma.serviceOrder.findMany({ include: includeOrder, orderBy: { updatedAt: "desc" }, take: 100 });
    res.json({ orders });
  } catch (error) { next(error); }
});

router.post("/staff/orders", requireStaff, async (req, res, next) => {
  try {
    const input = createSchema.parse(req.body);
    const customer = await prisma.user.findFirst({ where: { id: input.customerId, role: "CUSTOMER" } });
    if (!customer) return res.status(404).json({ error: "El cliente no existe." });

    const order = await prisma.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.upsert({
        where: { userId_plate: { userId: customer.id, plate: input.plate.toUpperCase() } },
        update: { brand: input.brand, model: input.model, year: input.year, color: input.color },
        create: { userId: customer.id, plate: input.plate.toUpperCase(), brand: input.brand, model: input.model, year: input.year, color: input.color },
      });
      return tx.serviceOrder.create({
        data: {
          orderCode: orderCode(), customerId: customer.id, vehicleId: vehicle.id, mileage: input.mileage, fuelLevel: input.fuelLevel,
          reason: input.reason, visibleDamage: input.visibleDamage || null, receivedItems: input.receivedItems || null,
          estimatedDelivery: input.estimatedDelivery ? new Date(`${input.estimatedDelivery}T12:00:00`) : null,
          createdByStaffId: req.staff.id,
          photos: { create: input.photos.map((dataUrl, index) => ({ dataUrl, caption: `Recepción ${index + 1}` })) },
          updates: { create: { status: "RECEIVED", note: "Vehículo recibido en el taller.", createdByStaffId: req.staff.id } },
        }, include: includeOrder,
      });
    });
    res.status(201).json({ order });
  } catch (error) { next(error); }
});

router.post("/staff/orders/:id/updates", requireStaff, async (req, res, next) => {
  try {
    const input = updateSchema.parse(req.body);
    const existing = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "La orden no existe." });
    const order = await prisma.$transaction(async (tx) => {
      const update = await tx.serviceUpdate.create({ data: {
        serviceOrderId: existing.id, status: input.status, note: input.note, createdByStaffId: req.staff.id,
      }});
      if (input.photos.length) {
        await tx.servicePhoto.createMany({ data: input.photos.map((dataUrl, index) => ({
          serviceOrderId: existing.id, updateId: update.id, dataUrl, caption: `Actualización ${index + 1}`,
        })) });
      }
      await tx.serviceOrder.update({ where: { id: existing.id }, data: { status: input.status, deliveredAt: input.status === "DELIVERED" ? new Date() : null } });
      return tx.serviceOrder.findUnique({ where: { id: existing.id }, include: includeOrder });
    });
    res.json({ order });
  } catch (error) { next(error); }
});

router.get("/customer/orders", requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.serviceOrder.findMany({ where: { customerId: req.user.id }, include: includeOrder, orderBy: { updatedAt: "desc" }, take: 50 });
    res.json({ orders });
  } catch (error) { next(error); }
});

export default router;