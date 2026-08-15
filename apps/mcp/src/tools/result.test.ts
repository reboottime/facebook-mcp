import { describe, expect, it } from "@jest/globals";

import { GraphApiError, MetaTokenMissingError } from "../graph/index.js";
import { runTool } from "./result.js";

describe("runTool", () => {
  it("returns structured content and JSON text on success", async () => {
    const result = await runTool(async () => ({ ok: true, count: 3 }));

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ ok: true, count: 3 });
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: JSON.stringify({ ok: true, count: 3 }, null, 2),
    });
  });

  it("reports a MetaTokenMissingError's message directly", async () => {
    const result = await runTool(async () => {
      throw new MetaTokenMissingError();
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("META_ACCESS_TOKEN"),
    });
  });

  it("describes a GraphApiError's code, subcode, type, and HTTP status with no advice for an unmapped code", async () => {
    const result = await runTool(async () => {
      throw new GraphApiError("Invalid parameter", {
        status: 400,
        code: 42,
        subcode: 7,
        type: "OAuthException",
      });
    });

    const text = (result.content[0] as { text: string }).text;

    expect(text).toContain("code 42");
    expect(text).toContain("subcode 7");
    expect(text).toContain("type OAuthException");
    expect(text).toContain("HTTP 400");
    expect(text.trim().endsWith(").")).toBe(true);
  });

  it("adds expired-token advice for code 190", async () => {
    const result = await runTool(async () => {
      throw new GraphApiError("Token expired", { status: 401, code: 190 });
    });

    expect((result.content[0] as { text: string }).text).toMatch(
      /re-issue a long-lived token/,
    );
  });

  it("adds rate-limit advice for a rate-limit code", async () => {
    const result = await runTool(async () => {
      throw new GraphApiError("Too many calls", { status: 400, code: 17 });
    });

    expect((result.content[0] as { text: string }).text).toMatch(
      /Meta rate limit/,
    );
  });

  it("adds permission advice for a permission code", async () => {
    const result = await runTool(async () => {
      throw new GraphApiError("Permission denied", { status: 403, code: 200 });
    });

    expect((result.content[0] as { text: string }).text).toMatch(
      /missing a permission/,
    );
  });

  it("falls back to the plain message for a non-Graph Error", async () => {
    const result = await runTool(async () => {
      throw new Error("boom");
    });

    expect((result.content[0] as { text: string }).text).toBe("boom");
  });

  it("stringifies a non-Error thrown value", async () => {
    const result = await runTool(async () => {
      throw "raw string failure";
    });

    expect((result.content[0] as { text: string }).text).toBe(
      "Unexpected failure: raw string failure",
    );
  });
});
