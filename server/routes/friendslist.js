const express = require("express");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

router.get("/friends/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const friends = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: id }, { receiverId: id }],
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    const formattedFriends = friends.map((f) => {
      const friend = f.senderId === id ? f.receiver : f.sender;
      return { id: friend.id, name: friend.name };
    });

    res.json(formattedFriends);
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

module.exports = router;
