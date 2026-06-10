import type { Bot as GrammyBot, Context } from "grammy";
import type { BotBundle } from "../types";
import { prisma } from "@/lib/db";

function render(template: string, ctx: Context): string {
  const name =
    ctx.from?.first_name ??
    ctx.message?.new_chat_members?.[0]?.first_name ??
    "teman";
  return template.replaceAll("{name}", name);
}

// Track users so they can receive broadcasts. Best-effort, never throws.
async function trackUser(bundle: BotBundle, ctx: Context) {
  const chat = ctx.chat;
  const from = ctx.from;
  if (!chat || !from || from.is_bot) return;
  try {
    await prisma.botUser.upsert({
      where: { botId_chatId: { botId: bundle.id, chatId: String(chat.id) } },
      update: { isBlocked: false, firstName: from.first_name, username: from.username },
      create: {
        botId: bundle.id,
        telegramId: String(from.id),
        chatId: String(chat.id),
        firstName: from.first_name,
        username: from.username,
      },
    });
  } catch {
    /* ignore tracking errors */
  }
}

export function registerWelcome(bot: GrammyBot, bundle: BotBundle) {
  // Track every private message sender for broadcast.
  bot.on("message", async (ctx, next) => {
    if (ctx.chat?.type === "private") await trackUser(bundle, ctx);
    await next();
  });

  // /start greeting
  bot.command("start", async (ctx) => {
    const msg = bundle.config?.welcomeMessage ?? "Selamat datang, {name}!";
    await ctx.reply(render(msg, ctx));
  });

  // Greet new group members
  bot.on("message:new_chat_members", async (ctx) => {
    const msg = bundle.config?.welcomeMessage ?? "Selamat datang, {name}!";
    for (const member of ctx.message.new_chat_members) {
      if (member.is_bot) continue;
      await ctx.reply(render(msg, ctx));
    }
  });
}
