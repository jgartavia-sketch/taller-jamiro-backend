import { rateLimit } from "./middleware/security.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { ZodError } from "zod";
import { config } from "./config.js";
import authRoutes from "./routes/auth.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import usedPartRoutes from "./routes/used-part.routes.js";
import serviceRequestRoutes from "./routes/service-request.routes.js";
import workshopRoutes from "./routes/workshop.routes.js";
import adminPortalRoutes from "./routes/admin-portal.routes.js";

export const app = express();

app.disable("x-powered-by");
// Render normally uses one reverse proxy; set only after verifying your topology.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.frontendUrls.includes(origin)) return callback(null, true);
    const error = new Error("Origen no autorizado.");
    error.status = 403;
    callback(error);
  },
}));
app.use("/api", rateLimit({ limit: 600, windowMs: 60_000 }));
const loginLimit = rateLimit({ limit: 30, windowMs: 15 * 60_000 });
app.use(["/api/auth/login", "/api/staff/login", "/api/admin-portal/login"], loginLimit);
const publicWriteLimit = rateLimit({ limit: 30, windowMs: 60 * 60_000 });
app.use(["/api/auth/register", "/api/used-part-requests", "/api/service-requests"], publicWriteLimit);
app.use("/api/workshop", express.json({ limit: "15mb" }));
app.use(express.json({ limit: "100kb" }));
morgan.token("safe-path", (req) => req.path);
app.use(morgan(":method :safe-path :status :response-time ms"));

app.get("/", (_req, res) => res.json({
  service: "Taller Multiservicios Jamiro API",
  status: "online",
  supportEmail: config.supportEmail,
}));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/used-part-requests", usedPartRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin-portal", adminPortalRoutes);
app.use("/api/workshop", workshopRoutes);
app.use("/api/admin", adminRoutes);

app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
app.use((error, _req, res, _next) => {
  if (error instanceof ZodError) {
    const passwordIssue = error.issues.find((issue) => ["password", "confirmPassword"].includes(issue.path[0]));
    return res.status(400).json({ error: passwordIssue?.message || "Revisá los datos enviados.", details: error.issues });
  }
  if (error?.code === "P2002") {
    return res.status(409).json({ error: "Ese registro ya existe." });
  }
  if (error?.code === "P2025") return res.status(404).json({ error: "El registro no existe." });
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "Las imágenes superan el tamaño permitido." });
  if (error?.type === "entity.parse.failed") return res.status(400).json({ error: "El cuerpo JSON no es válido." });
  if ([400, 403, 409].includes(error?.status)) return res.status(error.status).json({ error: error.message });
  console.error("Error interno:", error?.code || error?.name || "unknown");
  res.status(500).json({ error: "Ocurrió un error interno." });
});
