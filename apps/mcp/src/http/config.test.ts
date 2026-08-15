import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { readHttpConfig, resourceUrl } from "./config.js";

// Never read the operator's real .env.local from a unit test.
process.env.SOCIAL_MCP_NO_ENV_FILE = "1";

const TOUCHED_KEYS = ["PORT", "PUBLIC_URL"] as const;
const original = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of TOUCHED_KEYS) {
    original.set(key, process.env[key]);
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of TOUCHED_KEYS) {
    const value = original.get(key);

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("readHttpConfig / PORT", () => {
  it("defaults to port 8787 when PORT is unset", () => {
    expect(readHttpConfig().port).toBe(8787);
  });

  it("parses a valid PORT into a number", () => {
    process.env.PORT = "3000";

    expect(readHttpConfig().port).toBe(3000);
  });

  it("throws for a non-numeric PORT", () => {
    process.env.PORT = "not-a-port";

    expect(() => readHttpConfig()).toThrow(/PORT must be a TCP port number/);
  });

  it("throws for a PORT outside the valid TCP range", () => {
    process.env.PORT = "70000";

    expect(() => readHttpConfig()).toThrow(/PORT must be a TCP port number/);
  });
});

describe("readHttpConfig / PUBLIC_URL", () => {
  it("strips query and fragment from PUBLIC_URL", () => {
    process.env.PUBLIC_URL = "https://example.com/base?foo=bar#frag";

    const { publicUrl } = readHttpConfig();

    expect(publicUrl.search).toBe("");
    expect(publicUrl.hash).toBe("");
    expect(publicUrl.href).toBe("https://example.com/base");
  });

  it("derives the canonical /mcp resource URI from PUBLIC_URL", () => {
    process.env.PUBLIC_URL = "https://example.com";

    const config = readHttpConfig();

    expect(resourceUrl(config).href).toBe("https://example.com/mcp");
  });
});
