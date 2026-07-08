export interface Config {
  cdpHost: string;
  cdpPort: number;
  aiBridge: boolean;
  allowEval: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  reconnectMax: number;
}

const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export function loadConfig(): Config {
  const rawLevel = process.env.DIA_LOG_LEVEL;
  const logLevel = (LOG_LEVELS as readonly string[]).includes(rawLevel ?? "")
    ? (rawLevel as Config["logLevel"])
    : "info";

  return {
    cdpHost: process.env.DIA_CDP_HOST ?? "localhost",
    cdpPort: parsePositiveInt(process.env.DIA_CDP_PORT, 9222),
    aiBridge: process.env.DIA_AI_BRIDGE !== "false",
    allowEval: process.env.DIA_ALLOW_EVAL !== "false",
    logLevel,
    reconnectMax: parsePositiveInt(process.env.DIA_RECONNECT_MAX, 30000),
  };
}
