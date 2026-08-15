import { randomBytes } from "node:crypto";

import { describe, expect, it } from "@jest/globals";

import { createSecretBox, SealedValueError } from "./secret-box.js";

describe("createSecretBox", () => {
  it("round-trips a plaintext through seal and open", () => {
    const box = createSecretBox(randomBytes(32));

    const sealed = box.seal("a very secret access token");

    expect(box.open(sealed)).toBe("a very secret access token");
  });

  it("throws SealedValueError when the key is not 32 bytes", () => {
    expect(() => createSecretBox(randomBytes(16))).toThrow(SealedValueError);
  });

  it("produces a different envelope each time the same plaintext is sealed", () => {
    const box = createSecretBox(randomBytes(32));

    const first = box.seal("same plaintext");
    const second = box.seal("same plaintext");

    expect(first).not.toBe(second);
    // Both must still open back to the identical plaintext — the difference is the nonce, not
    // the recovered value.
    expect(box.open(first)).toBe("same plaintext");
    expect(box.open(second)).toBe("same plaintext");
  });

  it("rejects a tampered envelope with SealedValueError", () => {
    const box = createSecretBox(randomBytes(32));
    const sealed = box.seal("do not modify me");
    const parts = sealed.split(".");
    // Flip the ciphertext segment (last part) so GCM authentication fails on open.
    const tampered = [...parts.slice(0, 3), `x${String(parts[3])}`].join(".");

    expect(() => box.open(tampered)).toThrow(SealedValueError);
  });

  it("rejects opening a value sealed with a different key", () => {
    const sealed = createSecretBox(randomBytes(32)).seal("cross-key value");
    const otherBox = createSecretBox(randomBytes(32));

    expect(() => otherBox.open(sealed)).toThrow(SealedValueError);
  });
});
