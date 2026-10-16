// Bounded process-local limits. Deploy one API instance or use a shared gateway
// limiter when scaling. Trust only the proxy topology configured in app.js.
export function rateLimit({ limit, windowMs, maxKeys = 10000 }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    let bucket = buckets.get(key);
    if (!bucket || bucket.expires <= now) {
      if (buckets.size >= maxKeys) {
        for (const [storedKey, value] of buckets) if (value.expires <= now) buckets.delete(storedKey);
        if (buckets.size >= maxKeys) return res.status(429).json({ error: "Demasiadas solicitudes. Intentá de nuevo más tarde." });
      }
      bucket = { count: 0, expires: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      res.set("Retry-After", String(Math.ceil((bucket.expires - now) / 1000)));
      return res.status(429).json({ error: "Demasiados intentos. Esperá unos minutos antes de continuar." });
    }
    next();
  };
}
