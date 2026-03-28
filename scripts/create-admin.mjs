/**
 * Script: create-admin.mjs
 * Cria (ou atualiza) o usuário administrador no banco de dados.
 * Admin tem acesso total a todos os planos e funcionalidades — presente e futuras.
 *
 * Uso:
 *   node scripts/create-admin.mjs
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const ADMIN_PHONE    = "5555997275348";
const ADMIN_PASSWORD = "#viDareta7";
const ADMIN_NAME     = "Alessandro — Admin";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔐 Criando usuário administrador...\n");

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.client.upsert({
    where:  { phone: ADMIN_PHONE },
    update: {
      password:      hash,
      status:        "active",
      isAdmin:       true,
      planExpiresAt: new Date("2099-12-31"),
    },
    create: {
      phone:         ADMIN_PHONE,
      name:          ADMIN_NAME,
      password:      hash,
      status:        "active",
      plan:          "admin",
      isAdmin:       true,
      planExpiresAt: new Date("2099-12-31"),
    },
  });

  console.log("✅ Admin criado com sucesso!\n");
  console.log("📋 Suas credenciais:");
  console.log(`   Telefone : ${ADMIN_PHONE}`);
  console.log(`   Senha    : ${ADMIN_PASSWORD}`);
  console.log(`   isAdmin  : true (acesso total)`);
  console.log(`   Expira   : nunca (31/12/2099)\n`);
  console.log(`   ID no banco: ${admin.id}\n`);
}

main()
  .catch(e => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
