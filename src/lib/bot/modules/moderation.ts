import type { Bot as GrammyBot, Context } from "grammy";
import type { BotBundle, ModerationSettings } from "../types";

// In-memory spam tracking per (botId:chatId:userId). Resets on process restart.
const spamWindow = new Map<string, number[]>();

function isSpam(key: string, limit: number, windowMs = 10_000): boolean {
  const now = Date.now();
  const arr = (spamWindow.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  spamWindow.set(key, arr);
  return arr.length > limit;
}

async function canModerate(ctx: Context): Promise<boolean> {
  // Only act in groups where the bot is admin.
  if (ctx.chat?.type !== "group" && ctx.chat?.type !== "supergroup") return false;
  try {
    const me = await ctx.getChatMember(ctx.me.id);
    return me.status === "administrator" || me.status === "creator";
  } catch {
    return false;
  }
}

export function registerModeration(bot: GrammyBot, bundle: BotBundle) {
  const settings = (bundle.config?.moderation as ModerationSettings) ?? {};
  const bannedWords = (settings.bannedWords ?? []).map((w) => w.toLowerCase());
  const antiSpam = settings.antiSpam ?? false;
  const maxMsgs = settings.maxMessagesPer10s ?? 6;
  const deleteOnViolation = settings.deleteOnViolation ?? true;

  if (!bannedWords.length && !antiSpam) return;

  bot.on("message:text", async (ctx, next) => {
    if (!(await canModerate(ctx))) return next();

    const text = ctx.message.text.toLowerCase();

    // Banned words filter
    if (bannedWords.some((w) => text.includes(w))) {
      if (deleteOnViolation) {
        try {
          await ctx.deleteMessage();
        } catch {
          /* missing delete rights */
        }
      }
      await ctx.reply(`⚠️ Pesan dari ${ctx.from?.first_name ?? "user"} dihapus (kata terlarang).`);
      return;
    }

    // Anti-spam
    if (antiSpam && ctx.from) {
      const key = `${bundle.id}:${ctx.chat.id}:${ctx.from.id}`;
      if (isSpam(key, maxMsgs)) {
        try {
          await ctx.deleteMessage();
        } catch {
          /* ignore */
        }
        await ctx.reply(`🚫 ${ctx.from.first_name ?? "User"} terlalu cepat mengirim pesan.`);
        return;
      }
    }

    await next();
  });
}
