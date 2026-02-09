import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getMessages = async (channelId) => {
  try {
    const messages = await prisma.message.findMany({
      where: { channelId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true } }, // Include user info (e.g., name)
      },
    });

    return messages.map((message) => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      user: { id: message.user.id, name: message.user.name },
    }));
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

export const postMessage = async (channelId, content, userId) => {
  try {
    const newMessage = await prisma.message.create({
      data: {
        channelId,
        content,
        userId,
      },
    });

    return newMessage;
  } catch (error) {
    console.error("Error posting message:", error);
    throw error;
  }
};
