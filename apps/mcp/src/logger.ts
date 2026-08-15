// stdout is the JSON-RPC channel on the stdio transport, so every diagnostic in this process —
// including the ones the HTTP entry writes — goes to stderr. Nothing here ever calls console.log.

// Backstop, not the primary defence: call sites are written never to hand a credential to the
// logger in the first place. This catches the value that slips through inside an error message
// or a serialized request body.
const LABELLED_SECRET =
  /\b(access_token|refresh_token|client_secret|fb_exchange_token|appsecret_proof|code_verifier|authorization|password|token)\b(["']?\s*[:=]\s*["']?)([A-Za-z0-9._~+/=-]{6,})/gi;
const BEARER = /\b(Bearer|OAuth)\s+[A-Za-z0-9._~+/=-]{6,}/gi;

export function redactSecrets(text: string): string {
  return text
    .replace(LABELLED_SECRET, (_match, key: string, separator: string) => {
      return `${key}${separator}[redacted]`;
    })
    .replace(BEARER, (_match, scheme: string) => `${scheme} [redacted]`);
}

export function logInfo(message: string): void {
  write("info", message);
}

export function logWarn(message: string): void {
  write("warn", message);
}

export function logError(message: string, error?: unknown): void {
  const detail =
    error === undefined
      ? ""
      : ` — ${error instanceof Error ? error.message : String(error)}`;

  write("error", `${message}${detail}`);
}

function write(level: "info" | "warn" | "error", message: string): void {
  process.stderr.write(`[social-mcp] ${level}: ${redactSecrets(message)}\n`);
}
