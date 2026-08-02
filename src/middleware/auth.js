import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Debés iniciar sesión." });

    const payload = jwt.verify(token, config.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: "La sesión ya no es válida." });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "La sesión venció o no es válida." });
  }
}

export function requireAdminKey(req, res, next) {
  if (req.get("x-admin-key") !== config.adminApiKey) {
    return res.status(401).json({ error: "Acceso administrativo no autorizado." });
  }
  next();
}

