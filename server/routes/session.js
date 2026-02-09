const express = require("express");
const authenticate = require("../middleware/security.middleware");
const router = express.Router();

router.get("/", authenticate, (req, res) => {
  res.json({ userId: req.userId });
});

module.exports = router;
