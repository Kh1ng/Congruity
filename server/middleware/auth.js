const { authenticateToken } = require("../services/supabaseService");

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing bearer token" });
      return;
    }

    const token = authHeader.slice("Bearer ".length);
    const user = await authenticateToken(token);
    if (!user?.id) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }

    req.user = user;
    req.accessToken = token;
    next();
  } catch (error) {
    res.status(401).json({
      error: "Authentication failed",
      details: String(error?.message || error),
    });
  }
}

module.exports = {
  requireAuth,
};
