import { dateSchema } from "../lib/validation.js";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStaff, requireOperations } from "../middleware/auth.js";

const router = Router();
const statuses = ["RECEIVED", "DIAGNOSIS", "IN_PROGRESS", "WAITING_PARTS", "QUALITY_CHECK", "READY", "DELIVERED", "CANCELLED"];
const photoSchema = z.string().max(1_500_000).refine((value) => {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (match[1] === "jpeg") return bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (match[1] === "png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
}, "Formato de imagen no permitido.");
const photosSchema = z.array(photoSchema).max(8).default([]);

const createSchema = z.object({
  customerId: z.uuid(), plate: z.string().trim().min(2).max(20), brand: z.string().trim().min(2).max(60),
  model: z.string().trim().min(1).max(60), year: z.string().trim().regex(/^\d{4}$/), color: z.string().trim().min(2).max(40),
  mileage: z.coerce.number().int().min(0).max(5_000_000), fuelLevel: z.enum(["EMPTY", "QUARTER", "HALF", "THREE_QUARTERS", "FULL"]),
  reason: z.string().trim().min(3).max(1000), visibleDamage: z.string().trim().max(1000).optional().or(z.literal("")),
  receivedItems: z.string().trim().max(1000).optional().or(z.literal("")), estimatedDelivery: dateSchema,
  photos: photosSchema,
});

const updateSchema = z.object({ status: z.enum(statuses), note: z.string().trim().min(3).max(1500), photos: photosSchema });

const includeOrder = {
  customer: { select: { id: true, customerCode: true, name: true, email: true, phone: true } },
  vehicle: true,
  photos: { where: { updateId: null }, orderBy: { createdAt: "asc" } },
  updates: { include: { photos: true, createdByStaff: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 },
};

function orderCode() {
  return `JAM-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  state: z.enum(["active", "history"]).default("active"),
});
router.get("/staff/orders", requireStaff, requireOperations, async (req, res, next) => {
  try {
    const { page, state } = listQuery.parse(req.query);
    const closed = ["DELIVERED", "CANCELLED"];
    const orders = await prisma.serviceOrder.findMany({
      where: { status: state === "history" ? { in: closed } : { notIn: closed } },
      include: { customer: includeOrder.customer, vehicle: true },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 20, take: 21,
    });
    res.json({ orders: orders.slice(0, 20), page, hasMore: orders.length > 20 });
  } catch (error) { next(error); }
});
router.get("/staff/orders/:id", requireStaff, requireOperations, async (req, res, next) => {
  try {
    const id = z.uuid().parse(req.params.id);
    const order = await prisma.serviceOrder.findUnique({ where: { id }, include: includeOrder });
    if (!order) return res.status(404).json({ error: "La orden no existe." });
    res.json({ order });
  } catch (error) { next(error); }
});

router.post("/staff/orders", requireStaff, requireOperations, async (req, res, next) => {
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
          estimatedDelivery: input.estimatedDelivery ? new Date(`${input.estimatedDelivery}T12:00:00-06:00`) : null,
          createdByStaffId: req.staff.id,
          photos: { create: input.photos.map((dataUrl, index) => ({ dataUrl, caption: `Recepción ${index + 1}` })) },
          updates: { create: { status: "RECEIVED", note: "Vehículo recibido en el taller.", createdByStaffId: req.staff.id } },
        }, include: includeOrder,
      });
    });
    res.status(201).json({ order });
  } catch (error) { next(error); }
});

router.post("/staff/orders/:id/updates", requireStaff, requireOperations, async (req, res, next) => {
  try {
    z.uuid().parse(req.params.id);
    const input = updateSchema.parse(req.body);
    const existing = await prisma.serviceOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "La orden no existe." });
    const order = await prisma.$transaction(async (tx) => {
      const claimed = await tx.serviceOrder.updateMany({
        where: { id: existing.id, updatedAt: existing.updatedAt, status: { notIn: ["DELIVERED", "CANCELLED"] } },
        data: { status: input.status, deliveredAt: input.status === "DELIVERED" ? new Date() : null },
      });
      if (claimed.count !== 1) { const error = new Error("La orden cambió o ya fue cerrada. Actualizá la lista."); error.status = 409; throw error; }
      const update = await tx.serviceUpdate.create({ data: {
        serviceOrderId: existing.id, status: input.status, note: input.note, createdByStaffId: req.staff.id,
      }});
      if (input.photos.length) {
        await tx.servicePhoto.createMany({ data: input.photos.map((dataUrl, index) => ({
          serviceOrderId: existing.id, updateId: update.id, dataUrl, caption: `Actualización ${index + 1}`,
        })) });
      }
      return tx.serviceOrder.findUnique({ where: { id: existing.id }, include: includeOrder });
    });
    res.json({ order });
  } catch (error) { next(error); }
});

router.get("/customer/orders", requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.serviceOrder.findMany({ where: { customerId: req.user.id }, include: { vehicle: true }, orderBy: { updatedAt: "desc" }, take: 50 });
    res.json({ orders });
  } catch (error) { next(error); }
});

router.get("/customer/orders/:id", requireAuth, async (req, res, next) => {
  try {
    const id = z.uuid().parse(req.params.id);
    const order = await prisma.serviceOrder.findFirst({ where: { id, customerId: req.user.id }, include: includeOrder });
    if (!order) return res.status(404).json({ error: "La orden no existe." });
    res.json({ order });
  } catch (error) { next(error); }
});

export default router;