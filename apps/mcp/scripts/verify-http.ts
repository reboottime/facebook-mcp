import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

// Proves the built HTTP entry boots with no configuration at all. The child is spawned with an
// env containing only PATH and the two flags below — no DATABASE_URL, no FB app credentials, no
// TOKEN_ENCRYPTION_KEY — and SOCIAL_MCP_NO_ENV_FILE stops it reading apps/mcp/.env.local, so an
// operator token on disk can never turn this into a live call.
const entry = fileURLToPath(new URL("../dist/http/main.js", import.meta.url));
const PORT = "8791";
const BASE = `http://localhost:${PORT}`;

const failures: string[] = [];
let stderr = "";

const child = spawn(process.execPath, [entry], {
  env: { PATH: process.env.PATH ?? "", SOCIAL_MCP_NO_ENV_FILE: "1", PORT },
  stdio: ["ignore", "pipe", "pipe"],
});

child.stdout.on("data", (chunk: Buffer) => {
  // stdout is the JSON-RPC channel on the sibling entry; nothing should ever be written here.
  failures.push(`the HTTP entry wrote to stdout: ${chunk.toString("utf8").trim()}`);
});

child.stderr.on("data", (chunk: Buffer) => {
  stderr += chunk.toString("utf8");
});

try {
  await waitForListening();

  process.stdout.write(`booted with no env on ${BASE}\n\n`);

  const home = await fetch(`${BASE}/`);

  process.stdout.write(`GET / -> ${String(home.status)}\n`);
  expect(home.status === 200, `GET / returned ${String(home.status)}, expected 200`);

  const homeBody = await home.text();

  expect(
    homeBody.includes("FB_APP_ID"),
    "the home page does not explain that Facebook Login is unconfigured",
  );

  const unauthorized = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  const challenge = unauthorized.headers.get("www-authenticate") ?? "";

  process.stdout.write(
    `POST /mcp (no token) -> ${String(unauthorized.status)} :: ${challenge}\n`,
  );
  expect(
    unauthorized.status === 401,
    `POST /mcp without a token returned ${String(unauthorized.status)}, expected 401`,
  );
  expect(
    challenge.includes("resource_metadata="),
    "the 401 does not advertise resource_metadata",
  );

  const resourceMetadataUrl = /resource_metadata="([^"]+)"/.exec(challenge)?.[1];

  expect(Boolean(resourceMetadataUrl), "no resource_metadata URL to follow");

  const prm = await fetch(resourceMetadataUrl as string);
  const prmBody = (await prm.json()) as Record<string, unknown>;

  process.stdout.write(
    `GET ${String(resourceMetadataUrl)} -> ${String(prm.status)} :: ${JSON.stringify(prmBody)}\n`,
  );
  expect(prm.status === 200, "protected resource metadata did not resolve");
  expect(
    Array.isArray(prmBody.authorization_servers) &&
      prmBody.authorization_servers.length > 0,
    "protected resource metadata has no authorization_servers",
  );

  const as = await fetch(`${BASE}/.well-known/oauth-authorization-server`);
  const asBody = (await as.json()) as Record<string, unknown>;

  process.stdout.write(
    `GET /.well-known/oauth-authorization-server -> ${String(as.status)} :: ${JSON.stringify(asBody)}\n`,
  );
  expect(as.status === 200, "authorization server metadata did not resolve");
  expect(
    JSON.stringify(asBody.code_challenge_methods_supported) === '["S256"]',
    "authorization server metadata does not require PKCE S256",
  );
  expect(
    asBody.authorization_response_iss_parameter_supported === true,
    "authorization server metadata does not advertise RFC 9207 iss support",
  );

  const login = await fetch(`${BASE}/auth/facebook`, { redirect: "manual" });

  process.stdout.write(`GET /auth/facebook -> ${String(login.status)}\n`);
  expect(
    login.status === 503,
    `unconfigured Facebook Login returned ${String(login.status)}, expected 503`,
  );

  process.stdout.write(`\nstderr:\n${stderr.trim()}\n`);
  expect(
    stderr.includes("TOKEN_ENCRYPTION_KEY is unset"),
    "no stderr warning about the ephemeral encryption key",
  );
  expect(
    stderr.includes("DATABASE_URL is unset"),
    "no stderr warning about the in-memory PGlite fallback",
  );
} finally {
  child.kill("SIGTERM");
}

process.stdout.write(
  `\n${failures.length === 0 ? "zero-env HTTP verification PASSED" : `zero-env HTTP verification FAILED:\n  ${failures.join("\n  ")}`}\n`,
);

process.exitCode = failures.length === 0 ? 0 : 1;

function expect(condition: boolean, failure: string): void {
  if (!condition) {
    failures.push(failure);
  }
}

async function waitForListening(): Promise<void> {
  const deadline = Date.now() + 30_000;

  for (;;) {
    if (child.exitCode !== null) {
      throw new Error(`the HTTP entry exited early:\n${stderr}`);
    }

    try {
      await fetch(`${BASE}/`);

      return;
    } catch {
      if (Date.now() > deadline) {
        throw new Error(`the HTTP entry never started listening:\n${stderr}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
}
