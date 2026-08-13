import { runCheckForAllActive } from "../lib/checks";
import { collectInsightsForAllActive } from "../lib/insights";
import { collectPageSpeedForAllActive } from "../lib/pagespeed";
import { db } from "../lib/db";

const INTERVAL_MIN = Number(process.env.CHECK_INTERVAL_MINUTES ?? 5);
const INTERVAL_MS = Math.max(1, INTERVAL_MIN) * 60 * 1000;

// Insights de SEO mudam devagar: coleta a cada 12h (configurável).
const INSIGHT_INTERVAL_H = Number(process.env.INSIGHT_INTERVAL_HOURS ?? 12);
const INSIGHT_INTERVAL_MS = Math.max(1, INSIGHT_INTERVAL_H) * 60 * 60 * 1000;

let running = false;
let insightRunning = false;

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

async function insightTick() {
  if (insightRunning) return;
  insightRunning = true;
  const start = Date.now();
  try {
    const n = await collectInsightsForAllActive();
    await collectPageSpeedForAllActive();
    console.log(
      `[${new Date().toISOString()}] insights + performance de ${n} site(s) em ${
        Date.now() - start
      } ms`,
    );
  } catch (err) {
    console.error("Erro na coleta de insights:", err);
  } finally {
    insightRunning = false;
  }
}

async function main() {
  console.log(
    `Worker iniciado. Checando sites a cada ${INTERVAL_MIN} min. Ctrl+C para parar.`,
  );
  await tick(); // roda uma vez ao iniciar
  await insightTick(); // coleta insights uma vez ao iniciar
  const interval = setInterval(tick, INTERVAL_MS);
  const insightInterval = setInterval(insightTick, INSIGHT_INTERVAL_MS);

  const shutdown = async () => {
    clearInterval(interval);
    clearInterval(insightInterval);
    await db.$disconnect().catch(() => {});
    console.log("Worker encerrado.");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
