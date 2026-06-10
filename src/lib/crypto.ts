import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex chars (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

// Encrypt a bot token. Output format: iv:authTag:ciphertext (all hex).
export function encrypt(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decrypt(payload: string): string {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Invalid encrypted payload");
  }
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

// Per-bot webhook secret token (sent by Telegram in X-Telegram-Bot-Api-Secret-Token header).
// Derived deterministically so we can recompute/verify without storing extra data.
export function deriveWebhookSecret(telegramBotId: string): string {
  const salt = process.env.WEBHOOK_SECRET_SALT ?? "dev-salt";
  return crypto
    .createHmac("sha256", salt)
    .update(telegramBotId)
    .digest("hex")
    .slice(0, 48); // Telegram allows 1-256 chars, A-Z a-z 0-9 _ -
}
