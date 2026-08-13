import { runCheckForAllActive } from "../lib/checks";
import { db } from "../lib/db";

const INTERVAL_MIN = Number(process.env.CHECK_INTERVAL_MINUTES ?? 5);
const INTERVAL_MS = Math.max(1, INTERVAL_MIN) * 60 * 1000;

let running = false;

async function tick() {
  if (running) return; // evita sobreposição se uma rodada demorar
  running = true;
  const start = Date.now();
  try {
    const n = await runCheckForAllActive();
    console.log(
      `[${new Date().toISOString()}] ${n} site(s) checado(s) em ${
        Date.now() - start
      } ms`,
    );
  } catch (err) {
    console.error("Erro na rodada de checagem:", err);
  } finally {
    running = false;
  }
}

async function main() {
  console.log(
    `Worker iniciado. Checando sites a cada ${INTERVAL_MIN} min. Ctrl+C para parar.`,
  );
  await tick(); // roda uma vez ao iniciar
  const interval = setInterval(tick, INTERVAL_MS);

  const shutdown = async () => {
    clearInterval(interval);
    await db.$disconnect().catch(() => {});
    console.log("Worker encerrado.");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
