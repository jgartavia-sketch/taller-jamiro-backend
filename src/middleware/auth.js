import { hasOperationsAccess } from "../lib/staff-permissions.js";
import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

function bearerToken(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

export async function requireAuth(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Debés iniciar sesión." });

    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    if (payload.kind !== "customer" || typeof payload.sub !== "string") {
      return res.status(401).json({ error: "Esta sesión no corresponde a un cliente." });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || payload.version !== user.tokenVersion) return res.status(401).json({ error: "La sesión ya no es válida." });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "La sesión venció o no es válida." });
  }
}

export async function requireStaff(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Debés iniciar sesión como empleado." });

    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    if (!["staff", "admin"].includes(payload.kind)) {
      return res.status(401).json({ error: "Esta sesión no corresponde al personal." });
    }

    const staff = await prisma.staffAccount.findUnique({ where: { id: payload.sub } });
    if (!staff || !staff.active || payload.version !== staff.tokenVersion) {
      return res.status(401).json({ error: "La cuenta del empleado no está activa." });
    }

    if (payload.kind === "admin" && staff.email !== config.adminEmail) {
      return res.status(401).json({ error: "La cuenta administrativa no es válida." });
    }

    req.staff = staff;
    next();
  } catch {
    return res.status(401).json({ error: "La sesión venció o no es válida." });
  }
}

export function requireAdminKey(req, res, next) {
  const supplied = Buffer.from(req.get("x-admin-key") || "");
  const expected = Buffer.from(config.adminApiKey);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return res.status(401).json({ error: "Acceso administrativo no autorizado." });
  }
  next();
}

export function requireOperations(req, res, next) {
  if (!hasOperationsAccess(req.staff, config.adminEmail)) {
    return res.status(403).json({ error: "Esta función requiere una cuenta autorizada del personal o del administrador." });
  }
  next();
}
