import { describe, expect, it } from "@jest/globals";

import { redactSecrets } from "./logger.js";

describe("redactSecrets", () => {
  it("redacts a labelled secret value, keeping the key label intact", () => {
    const redacted = redactSecrets('access_token: "AbCdEf123456"');

    expect(redacted).toContain("access_token");
    expect(redacted).toContain("[redacted]");
    expect(redacted).not.toContain("AbCdEf123456");
  });

  it("redacts a Bearer-scheme token", () => {
    const redacted = redactSecrets(
      "authorization header was Bearer AbCdEf123456.GhIjKl",
    );

    expect(redacted).toBe("authorization header was Bearer [redacted]");
  });

  it("redacts token-shaped values nested inside a JSON-stringified object", () => {
    const body = JSON.stringify({
      user: "alex",
      credentials: { refresh_token: "supersecretrefreshvalue123" },
    });

    const redacted = redactSecrets(body);

    expect(redacted).not.toContain("supersecretrefreshvalue123");
    expect(redacted).toContain("[redacted]");
    // Non-secret structure survives redaction untouched.
    expect(redacted).toContain('"user":"alex"');
  });

  it("leaves ordinary text with no secret-shaped values unchanged", () => {
    const message = "Page Alpha Studio published a reel.";

    expect(redactSecrets(message)).toBe(message);
  });
});
