import {
  createDecipheriv,
  createCipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FORMAT_VERSION = "v1";

// Every Meta credential we persist goes through this. Sealed values are self-describing so a
// future key rotation can tell an old envelope from a new one without a schema migration.
export type SecretBox = {
  seal: (plaintext: string) => string;
  open: (sealed: string) => string;
};

export class SealedValueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SealedValueError";
  }
}

export function createSecretBox(key: Buffer): SecretBox {
  if (key.length !== KEY_BYTES) {
    throw new SealedValueError(
      `Token encryption key must be ${String(KEY_BYTES)} bytes, got ${String(key.length)}.`,
    );
  }

  return {
    seal: (plaintext) => {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, key, iv);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);

      return [
        FORMAT_VERSION,
        iv.toString("base64url"),
        cipher.getAuthTag().toString("base64url"),
        ciphertext.toString("base64url"),
      ].join(".");
    },
    open: (sealed) => {
      const parts = sealed.split(".");

      if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
        throw new SealedValueError(
          "Stored credential is not in the expected sealed format.",
        );
      }

      const iv = Buffer.from(parts[1] as string, "base64url");
      const tag = Buffer.from(parts[2] as string, "base64url");
      const ciphertext = Buffer.from(parts[3] as string, "base64url");

      if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
        throw new SealedValueError(
          "Stored credential has a malformed encryption envelope.",
        );
      }

      const decipher = createDecipheriv(ALGORITHM, key, iv);

      decipher.setAuthTag(tag);

      try {
        return Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]).toString("utf8");
      } catch {
        // GCM authentication failure: either the row was tampered with or the key changed.
        throw new SealedValueError(
          "Stored credential could not be decrypted with the current TOKEN_ENCRYPTION_KEY. Reconnect Facebook to store a fresh token.",
        );
      }
    },
  };
}

export type EncryptionKey = {
  key: Buffer;
  ephemeral: boolean;
};

// Zero-env boot is a hard requirement, so an absent key is not a startup failure: we mint one for
// the process and let the caller warn that sealed rows die with the process.
export function resolveEncryptionKey(configured: string | null): EncryptionKey {
  if (!configured) {
    return { key: randomBytes(KEY_BYTES), ephemeral: true };
  }

  const key = Buffer.from(configured, "base64");

  if (key.length !== KEY_BYTES) {
    throw new SealedValueError(
      `TOKEN_ENCRYPTION_KEY must decode to ${String(KEY_BYTES)} bytes of base64. Generate one with: openssl rand -base64 32`,
    );
  }

  return { key, ephemeral: false };
}

// Access tokens, refresh tokens, and authorization codes are 32 random bytes, so a single SHA-256
// is the right primitive: there is no low-entropy guess space for an attacker with the table to
// grind through, and lookups stay a plain indexed equality.
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function newOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
