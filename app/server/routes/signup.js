const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const { hashPassword } = require("../utils/hash_pass");

const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const hashedPassword = hashPassword(password);

    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, name },
    });

    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    res.status(201).json({ token });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(400).json({ error: "Error creating user" });
  }
});

module.exports = router;
