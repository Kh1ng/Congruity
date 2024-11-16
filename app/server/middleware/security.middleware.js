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
