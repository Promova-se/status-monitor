import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";

const db = new PrismaClient();

const ARGON_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Defina ADMIN_EMAIL e ADMIN_PASSWORD no arquivo .env antes de rodar o seed.",
    );
  }
  if (password.length < 10) {
    throw new Error("A senha do admin deve ter pelo menos 10 caracteres.");
  }

  // Garante login ÚNICO: se já existe qualquer admin, não cria outro.
  const existing = await db.admin.count();
  if (existing > 0) {
    const current = await db.admin.findFirst();
    if (current && current.email === email) {
      // Mesmo email → atualiza a senha (útil para redefinir).
      const passwordHash = await hash(password, ARGON_OPTS);
      await db.admin.update({
        where: { id: current.id },
        data: { passwordHash },
      });
      console.log(`✔ Senha do admin (${email}) atualizada.`);
      return;
    }
    console.log(
      "⚠ Já existe um admin cadastrado. Nenhum novo admin será criado (login único).",
    );
    return;
  }

  const passwordHash = await hash(password, ARGON_OPTS);
  await db.admin.create({ data: { email, passwordHash } });
  console.log(`✔ Admin criado: ${email}`);
  console.log("→ Agora troque ADMIN_PASSWORD no .env por segurança.");
}

main()
  .catch((e) => {
    console.error(e.message ?? e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
