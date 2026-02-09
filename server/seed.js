const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { hashPassword } = require("./utils/hash_pass");

async function main() {
  // Seed Users
  // console.log("Seeding Users...");
  // const user1 = await prisma.user.create({
  //   data: {
  //     name: "Alice",
  //     email: "alice@example.com",
  //     password: hashPassword("password"),
  //   },
  // });

  // const user2 = await prisma.user.create({
  //   data: {
  //     name: "Bob",
  //     email: "bob@example.com",
  //     password: hashPassword("password"),
  //   },
  // });

  // const user3 = await prisma.user.create({
  //   data: {
  //     name: "Charlie",
  //     email: "charlie@example.com",
  //     password: hashPassword("password"),
  //   },
  // });

  // // Seed Friendships
  // console.log("Seeding Friendships...");
  // await prisma.friendship.createMany({
  //   data: [
  //     { senderId: user1.id, receiverId: user2.id, status: "accepted" },
  //     { senderId: user2.id, receiverId: user3.id, status: "pending" },
  //   ],
  // });

  // Seed Servers
  console.log("Seeding Servers...");
  const server1 = await prisma.server.create({
    data: {
      name: "Developers Hub",
      thumbnail: "devhub.png",
      description: "A server for developers.",
    },
  });

  // Seed Channels
  console.log("Seeding Channels...");
  const channel1 = await prisma.channel.create({
    data: {
      name: "General",
      description: "General discussion",
      serverId: server1.id,
    },
  });

  const channel2 = await prisma.channel.create({
    data: {
      name: "Code Review",
      description: "Discuss and review code",
      serverId: server1.id,
    },
  });

  // Seed Server Memberships
  console.log("Seeding Server Memberships...");
  await prisma.serverMembership.createMany({
    data: [
      { serverId: server1.id, userId: user1.id },
      { serverId: server1.id, userId: user2.id },
    ],
  });

  // Seed Channel Memberships
  console.log("Seeding Channel Memberships...");
  await prisma.channelMembership.createMany({
    data: [
      {
        channelId: channel1.id,
        userId: user1.id,
      },
      {
        channelId: channel1.id,
        userId: user2.id,
      },
    ],
  });

  // Seed Calls
  console.log("Seeding Calls...");
  await prisma.call.create({
    data: {
      callerId: user1.id,
      accepterId: user2.id,
      roomId: "room1-uuid",
    },
  });

  // Seed Messages
  console.log("Seeding Messages...");
  await prisma.message.createMany({
    data: [
      {
        channelId: channel1.id,
        userId: user1.id,
        content: "Hello everyone!",
      },
      {
        channelId: channel1.id,
        userId: user2.id,
        content: "Hi Alice!",
      },
    ],
  });

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
