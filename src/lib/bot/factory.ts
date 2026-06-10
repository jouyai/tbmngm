import { Bot as GrammyBot } from "grammy";
import type { BotBundle } from "./types";
import { decrypt } from "@/lib/crypto";
import { registerWelcome } from "./modules/welcome";
import { registerCommands } from "./modules/commands";
import { registerModeration } from "./modules/moderation";
import { prisma } from "@/lib/db";

// Build a fully-wired grammY bot from a DB bundle.
// Feature modules are registered only when enabled in config.
export async function buildBot(bundle: BotBundle): Promise<GrammyBot> {
  const token = decrypt(bundle.tokenEnc);
  const bot = new GrammyBot(token);

  const cfg = bundle.config;

  // Moderation should run first so it can stop forbidden content early.
  if (cfg?.moderationEnabled) registerModeration(bot, bundle);
  if (cfg?.welcomeEnabled ?? true) registerWelcome(bot, bundle);
  if (cfg?.commandsEnabled ?? true) registerCommands(bot, bundle);

  // Global error handler so one bad update never crashes the server.
  bot.catch((err) => {
    console.error(`[bot ${bundle.username}] error:`, err.message);
    prisma.bot
      .update({ where: { id: bundle.id }, data: { lastError: err.message } })
      .catch(() => {});
  });

  // Required before handling webhook updates.
  await bot.init();
  return bot;
}
