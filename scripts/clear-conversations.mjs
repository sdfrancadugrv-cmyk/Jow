import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.whatsappConversation.deleteMany({});
  console.log(`${result.count} conversa(s) apagada(s).`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
