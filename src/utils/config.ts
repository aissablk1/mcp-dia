export interface Config {
  cdpHost: string;
  cdpPort: number;
  aiBridge: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  reconnectMax: number;
}

export function loadConfig(): Config {
  return {
    cdpHost: process.env.DIA_CDP_HOST ?? "localhost",
    cdpPort: parseInt(process.env.DIA_CDP_PORT ?? "9222", 10),
    aiBridge: process.env.DIA_AI_BRIDGE !== "false",
    logLevel: (process.env.DIA_LOG_LEVEL as Config["logLevel"]) ?? "info",
    reconnectMax: parseInt(process.env.DIA_RECONNECT_MAX ?? "30000", 10),
  };
}
