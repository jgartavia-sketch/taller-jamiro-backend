import "dotenv/config";

const required = ["DATABASE_URL", "JWT_SECRET", "ADMIN_API_KEY"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta ${key} en las variables de entorno.`);
}

if (process.env.NODE_ENV === "production") {
  for (const key of ["JWT_SECRET", "ADMIN_API_KEY"]) {
    if (process.env[key].length < 32 || /reemplazar|changeme|example/i.test(process.env[key])) {
      throw new Error(`${key} debe ser un secreto aleatorio de al menos 32 caracteres.`);
    }
  }
  const origins = String(process.env.FRONTEND_URL || "").split(",").map((url) => url.trim());
  if (!origins.length || origins.some((url) => !url.startsWith("https://"))) {
    throw new Error("FRONTEND_URL debe contener los orígenes HTTPS autorizados en producción.");
  }
}

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  adminApiKey: process.env.ADMIN_API_KEY,
  adminEmail: String(process.env.ADMIN_EMAIL || "automotrizjamirosc@gmail.com").trim().toLowerCase(),
  frontendUrls: String(process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  supportEmail: process.env.SUPPORT_EMAIL || "systemlabcr@gmail.com",
  emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
  emailPort: Number(process.env.EMAIL_PORT || 465),
  emailSecure: String(process.env.EMAIL_SECURE || "true").toLowerCase() === "true",
  emailUser: String(process.env.EMAIL_USER || "").trim(),
  emailPass: String(process.env.EMAIL_PASS || "").trim(),
  emailFrom: String(process.env.EMAIL_FROM || "").trim(),
  referralRewardPoints: Math.max(0, Number(process.env.REFERRAL_REWARD_POINTS || 100)),
  referralExpiryHours: Math.max(1, Number(process.env.REFERRAL_EXPIRY_HOURS || 72)),
};
