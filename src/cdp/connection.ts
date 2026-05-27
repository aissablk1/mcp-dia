import CDP from "chrome-remote-interface";
import { EventEmitter } from "node:events";
import { CDPError } from "../utils/errors.js";
import type { Tab } from "./types.js";

interface CDPConfig {
  host: string;
  port: number;
  reconnectMax: number;
}

export class CDPConnection extends EventEmitter {
  private static instance: CDPConnection | null = null;
  private client: CDP.Client | null = null;
  private config: CDPConfig;
  private connected = false;
  private reconnecting = false;

  private constructor(config: CDPConfig) {
    super();
    this.config = config;
  }

  static getInstance(config: CDPConfig): CDPConnection {
    if (!CDPConnection.instance) {
      CDPConnection.instance = new CDPConnection(config);
    }
    return CDPConnection.instance;
  }

  static resetInstance(): void {
    CDPConnection.instance?.disconnect();
    CDPConnection.instance = null;
  }

  async connect(): Promise<void> {
    try {
      this.client = await CDP({ host: this.config.host, port: this.config.port });
      this.connected = true;
      this.client.on("disconnect", () => this.handleDisconnect());
      this.emit("connected");
    } catch {
      throw new CDPError(
        `Failed to connect to Dia at ${this.config.host}:${this.config.port}. ` +
        `Launch Dia with: open -a "Dia" --args --remote-debugging-port=${this.config.port}`,
        "CONNECTION_FAILED"
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try { await this.client.close(); } catch {}
      this.client = null;
    }
    this.connected = false;
  }

  isConnected(): boolean { return this.connected; }

  async listTargets(): Promise<Tab[]> {
    const targets = await CDP.List({ host: this.config.host, port: this.config.port });
    return targets
      .filter((t) => t.type === "page")
      .map((t) => ({ id: t.id, url: t.url, title: t.title, active: false }));
  }

  async attachToTab(tabId: string): Promise<CDP.Client> {
    const targets = await CDP.List({ host: this.config.host, port: this.config.port });
    const target = targets.find((t) => t.id === tabId);
    if (!target) throw new CDPError(`Tab not found: ${tabId}`, "TAB_NOT_FOUND");
    return CDP({ host: this.config.host, port: this.config.port, target });
  }

  async getActiveTab(): Promise<CDP.Client> {
    if (!this.client) throw new CDPError("Not connected to Dia", "NOT_CONNECTED");
    return this.client;
  }

  private async handleDisconnect(): Promise<void> {
    this.connected = false;
    this.emit("disconnected");
    if (!this.reconnecting) await this.attemptReconnect();
  }

  private async attemptReconnect(): Promise<void> {
    this.reconnecting = true;
    let delay = 1000;
    while (!this.connected && delay <= this.config.reconnectMax) {
      this.emit("reconnecting", { delay });
      await new Promise((r) => setTimeout(r, delay));
      try {
        await this.connect();
        this.reconnecting = false;
        this.emit("reconnected");
        return;
      } catch {
        delay = Math.min(delay * 2, this.config.reconnectMax);
      }
    }
    this.reconnecting = false;
    this.emit("reconnect_failed");
  }
}
