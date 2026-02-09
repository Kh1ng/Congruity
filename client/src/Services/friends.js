import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Fetch the friends list for a given user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Array>} The list of friends.
 */
export const getFriendsList = async (userId) => {
  if (!userId) {
    console.error("No user ID provided");
    return [];
  }

  try {
    // Fetch friendships where the user is either the sender or the receiver
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: "accepted", // Ensure only accepted friendships are retrieved
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Process the friendships to get a list of friend IDs or usernames
    const friendsList = friendships.map((friendship) => {
      if (friendship.senderId === userId) {
        return {
          id: friendship.receiver.id,
          username: friendship.receiver.username,
        };
      } else {
        return {
          id: friendship.sender.id,
          username: friendship.sender.username,
        };
      }
    });

    console.log("Processed friends list:", friendsList);
    return friendsList || [];
  } catch (error) {
    console.error("Error fetching friends list:", error);
    return [];
  }
};
