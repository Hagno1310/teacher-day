import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require(require.resolve("@next/env", { paths: [require.resolve("next")] }));
loadEnvConfig(process.cwd(), true);

const { configuredGeminiModels, createAiModerator } = await import("../lib/gemini.js");
const keys = (process.env.GEMINI_API_KEYS || "").split(",").map((key) => key.trim()).filter(Boolean);
if (!keys.length) {
  console.error("GEMINI_API_KEYS is empty. Configure it in .env before running this check.");
  process.exitCode = 1;
} else {
  let available = 0;
  for (const model of configuredGeminiModels()) {
    const start = Date.now();
    const moderate = createAiModerator({ keys, models: [model] });
    const result = await moderate("Chúc thầy cô ngày 20/11 thật vui, luôn mạnh khỏe và hạnh phúc!");
    console.log(JSON.stringify({ model, status: result.status, elapsedMs: Date.now() - start }));
    if (result.status === "approved") available++;
  }
  if (!available) process.exitCode = 1;
}
