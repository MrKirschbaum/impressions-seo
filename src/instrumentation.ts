/**
 * Next.js startup hook. Runs once when the server process boots (node runtime
 * only) — we use it to start the recurring-scan scheduler. Enabled via
 * `experimental.instrumentationHook` in next.config.mjs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
