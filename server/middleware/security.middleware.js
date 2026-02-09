const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, "your_secret_key");
    req.user = payload; // Attach user data to the request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  console.log("Authorization header received:", authHeader); // Log the header

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("Missing or invalid Authorization header");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1]; // Extract the token

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token payload:", payload); // Log the decoded payload
    req.userId = payload.userId; // Attach userId to the request
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = authenticate;
