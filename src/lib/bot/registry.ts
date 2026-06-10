import type { Bot as GrammyBot } from "grammy";
import { prisma } from "@/lib/db";
import { buildBot } from "./factory";
import type { BotBundle } from "./types";

// Cache built grammY instances keyed by telegramBotId (route id).
// Survives across requests within the same Node process.
const cache = new Map<string, GrammyBot>();

function loadBundle(telegramBotId: string): Promise<BotBundle | null> {
  return prisma.bot.findUnique({
    where: { telegramBotId },
    include: { config: true, commands: true },
  });
}

// Get (or build) a running bot instance for a given telegram bot id.
export async function getBotInstance(
  telegramBotId: string
): Promise<GrammyBot | null> {
  const cached = cache.get(telegramBotId);
  if (cached) return cached;

  const bundle = await loadBundle(telegramBotId);
  if (!bundle || bundle.status === "INACTIVE") return null;

  const bot = await buildBot(bundle);
  cache.set(telegramBotId, bot);
  return bot;
}

// Invalidate cache after a bot's config/commands change so the next
// webhook rebuilds with fresh settings.
export function invalidateBot(telegramBotId: string) {
  cache.delete(telegramBotId);
}

export function invalidateAll() {
  cache.clear();
}
