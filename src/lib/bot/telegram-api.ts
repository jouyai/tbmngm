// Thin wrappers over the Telegram Bot API for management actions
// (validate token, set/delete webhook). Uses raw fetch so we don't
// need a full grammY instance just for setup.

import { readFile } from "node:fs/promises";

const API = "https://api.telegram.org";

// When using a self-signed cert (no domain), Telegram needs the PUBLIC
// certificate uploaded alongside setWebhook. Set WEBHOOK_CERT_PATH to the
// .pem path to enable this. Leave unset when behind a real CA (Let's Encrypt).
const CERT_PATH = process.env.WEBHOOK_CERT_PATH;

export type TelegramMe = {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
};

async function call<T>(token: string, method: string, body?: object): Promise<T> {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram API error on ${method}`);
  }
  return data.result as T;
}

// Validate a token and return bot identity.
export function getMe(token: string): Promise<TelegramMe> {
  return call<TelegramMe>(token, "getMe");
}

const ALLOWED_UPDATES = [
  "message",
  "edited_message",
  "callback_query",
  "chat_member",
];

// Point Telegram at our webhook for this bot.
// If WEBHOOK_CERT_PATH is set, uploads the self-signed public cert via multipart.
export async function setWebhook(
  token: string,
  url: string,
  secretToken: string
): Promise<boolean> {
  if (!CERT_PATH) {
    return call<boolean>(token, "setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ALLOWED_UPDATES,
      drop_pending_updates: true,
    });
  }

  // Self-signed: send as multipart/form-data with the certificate file.
  const certPem = await readFile(CERT_PATH);
  const form = new FormData();
  form.append("url", url);
  form.append("secret_token", secretToken);
  form.append("allowed_updates", JSON.stringify(ALLOWED_UPDATES));
  form.append("drop_pending_updates", "true");
  form.append(
    "certificate",
    new Blob([certPem], { type: "application/x-pem-file" }),
    "cert.pem"
  );

  const res = await fetch(`${API}/bot${token}/setWebhook`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || "setWebhook failed");
  return data.result as boolean;
}

export function deleteWebhook(token: string): Promise<boolean> {
  return call<boolean>(token, "deleteWebhook", { drop_pending_updates: false });
}
