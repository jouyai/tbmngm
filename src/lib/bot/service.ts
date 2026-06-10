import { prisma } from "@/lib/db";
import { encrypt, decrypt, deriveWebhookSecret } from "@/lib/crypto";
import { getMe, setWebhook, deleteWebhook } from "./telegram-api";
import { invalidateBot } from "./registry";

function webhookUrl(telegramBotId: string): string {
  const base = process.env.PUBLIC_BASE_URL;
  if (!base) throw new Error("PUBLIC_BASE_URL is not set");
  return `${base.replace(/\/$/, "")}/api/webhook/${telegramBotId}`;
}

// Add a new bot from a pasted token: validate, store, register webhook.
export async function addBot(token: string) {
  const me = await getMe(token); // throws if token invalid
  const telegramBotId = String(me.id);

  const existing = await prisma.bot.findUnique({ where: { telegramBotId } });
  if (existing) throw new Error("Bot ini sudah terdaftar.");

  const webhookSecret = deriveWebhookSecret(telegramBotId);

  const bot = await prisma.bot.create({
    data: {
      tokenEnc: encrypt(token),
      telegramBotId,
      username: me.username,
      name: me.first_name,
      status: "ACTIVE",
      webhookSecret,
      config: { create: {} }, // defaults from schema
    },
  });

  try {
    await setWebhook(token, webhookUrl(telegramBotId), webhookSecret);
  } catch (e) {
    await prisma.bot.update({
      where: { id: bot.id },
      data: { status: "ERROR", lastError: (e as Error).message },
    });
    throw new Error(`Bot tersimpan tapi gagal set webhook: ${(e as Error).message}`);
  }

  return bot;
}

// Re-register webhook (e.g. after changing PUBLIC_BASE_URL).
export async function refreshWebhook(botId: string) {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) throw new Error("Bot tidak ditemukan");
  const token = decrypt(bot.tokenEnc);
  await setWebhook(token, webhookUrl(bot.telegramBotId), bot.webhookSecret);
  await prisma.bot.update({
    where: { id: botId },
    data: { status: "ACTIVE", lastError: null },
  });
}

export async function setBotActive(botId: string, active: boolean) {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) throw new Error("Bot tidak ditemukan");
  const token = decrypt(bot.tokenEnc);

  if (active) {
    await setWebhook(token, webhookUrl(bot.telegramBotId), bot.webhookSecret);
  } else {
    await deleteWebhook(token);
  }

  await prisma.bot.update({
    where: { id: botId },
    data: { status: active ? "ACTIVE" : "INACTIVE" },
  });
  invalidateBot(bot.telegramBotId);
}

export async function removeBot(botId: string) {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) return;
  try {
    await deleteWebhook(decrypt(bot.tokenEnc));
  } catch {
    /* token may be revoked; delete anyway */
  }
  invalidateBot(bot.telegramBotId);
  await prisma.bot.delete({ where: { id: botId } });
}

export async function listBots() {
  return prisma.bot.findMany({
    orderBy: { createdAt: "desc" },
    include: { config: true, _count: { select: { users: true, commands: true } } },
  });
}
