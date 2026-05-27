export class CDPError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "CDPError";
  }
}

export class AIBridgeError extends Error {
  constructor(message: string) {
    super(`AI Bridge: ${message}`);
    this.name = "AIBridgeError";
  }
}

export class ToolError extends Error {
  constructor(tool: string, message: string) {
    super(`[${tool}] ${message}`);
    this.name = "ToolError";
  }
}
