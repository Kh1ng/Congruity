const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { hashPassword } = require("./utils/hash_pass");

async function main() {
  await prisma.user.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      password: hashPassword("password"),
    },
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
