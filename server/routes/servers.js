const express = require("express");

const router = express.Router();

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const servers = await getServersList(userId);
    res.json(servers);
  } catch (error) {
    console.error("Error fetching servers:", error);
    res.status(500).json({ error: "Could not fetch servers" });
  }
});

module.exports = router;
