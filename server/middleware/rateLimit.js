const buckets = new Map();

function cleanupExpired(now) {
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function createRateLimit({
  windowMs = 60_000,
  max = 60,
  keyFn = (req) => req.ip || "unknown",
} = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${req.method}:${req.path}:${keyFn(req)}`;

    const entry = buckets.get(bucketKey);
    if (!entry || entry.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      if (buckets.size > 5000) cleanupExpired(now);
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(1, retryAfter)));
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    next();
  };
}

module.exports = {
  createRateLimit,
};

