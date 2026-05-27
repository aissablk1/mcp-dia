import type { Config } from "./config.js";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;

export class Logger {
  private level: number;
  constructor(logLevel: Config["logLevel"]) {
    this.level = LEVELS[logLevel];
  }
  debug(msg: string, data?: unknown) { if (this.level <= 0) this.write("DEBUG", msg, data); }
  info(msg: string, data?: unknown)  { if (this.level <= 1) this.write("INFO", msg, data); }
  warn(msg: string, data?: unknown)  { if (this.level <= 2) this.write("WARN", msg, data); }
  error(msg: string, data?: unknown) { if (this.level <= 3) this.write("ERROR", msg, data); }
  private write(level: string, msg: string, data?: unknown) {
    const line = `[mcp-dia][${level}] ${msg}`;
    console.error(data ? `${line} ${JSON.stringify(data)}` : line);
  }
}
