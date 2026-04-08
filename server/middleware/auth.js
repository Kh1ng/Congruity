const { authenticateToken } = require("../services/supabaseService");
const { sendError } = require("../utils/http");

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
    sendError(res, 401, "Authentication failed", error);
  }
}

module.exports = {
  requireAuth,
};
