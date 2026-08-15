import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { longLivedTokenFor } from "./fake-meta.js";
import { ALPHA, BOTH_USERS } from "./fixtures.js";
import {
  connectUser,
  GRAPH_VERSION,
  startTestStack,
  TEST_APP_SECRET,
  type TestStack,
} from "./harness.js";
import { createHmac } from "node:crypto";
import { request } from "node:http";

function rawPost(
  stack: TestStack,
  host: string,
): Promise<{ status: number; body: string }> {
  const target = new URL(`${stack.baseUrl}/mcp`);
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  });

  return new Promise((resolve, reject) => {
    const call = request(
      {
        hostname: target.hostname,
        port: target.port,
        path: target.pathname,
        method: "POST",
        headers: {
          host,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ status: response.statusCode ?? 0, body });
        });
      },
    );

    call.on("error", reject);
    call.end(payload);
  });
}

describe("transport hardening", () => {
  let stack: TestStack;

  beforeAll(async () => {
    stack = await startTestStack(BOTH_USERS);
  });

  afterAll(async () => {
    await stack.close();
  });

  it("refuses a cross-origin browser request to /mcp", async () => {
    const alpha = await connectUser(stack, ALPHA.fbUserId);

    const response = await fetch(`${stack.baseUrl}/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${alpha.accessToken}`,
        origin: "https://attacker.example",
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });

    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).toContain("attacker.example");
  });

  // Host is a forbidden header name for fetch, which silently drops it — the rebinding case can
  // only be posed with a raw request.
  it("refuses a request whose Host header is not this server", async () => {
    const rebound = await rawPost(stack, "rebound.attacker.example");

    expect(rebound.status).toBe(403);
    expect(rebound.body).toContain("Invalid Host");

    const legitimate = await rawPost(stack, new URL(stack.baseUrl).host);

    expect(legitimate.status).toBe(401);
  });

  it("still serves the same-origin browser case", async () => {
    const alpha = await connectUser(stack, ALPHA.fbUserId);

    const response = await fetch(`${stack.baseUrl}/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${alpha.accessToken}`,
        origin: stack.baseUrl,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });

    expect(response.status).toBe(200);
  });

  it("signs every Graph call with appsecret_proof", async () => {
    await connectUser(stack, ALPHA.fbUserId);

    // The journey above only proves the proof was accepted if the fake would have rejected its
    // absence — so assert the fake actually enforces it.
    const token = longLivedTokenFor(ALPHA.fbUserId);
    const unsigned = await fetch(
      `${stack.fake.baseUrl}/${GRAPH_VERSION}/me?fields=id,name`,
      { headers: { authorization: `Bearer ${token}` } },
    );

    expect(unsigned.status).toBe(400);
    expect(JSON.stringify(await unsigned.json())).toContain("appsecret_proof");

    const proof = createHmac("sha256", TEST_APP_SECRET).update(token).digest("hex");
    const signed = await fetch(
      `${stack.fake.baseUrl}/${GRAPH_VERSION}/me?fields=id,name&appsecret_proof=${proof}`,
      { headers: { authorization: `Bearer ${token}` } },
    );

    expect(signed.status).toBe(200);
  });
});
