import { InlineKeyboard, type Bot as GrammyBot, type Context } from "grammy";
import type { BotBundle, InlineButton } from "../types";

function render(template: string, ctx: Context): string {
  const name = ctx.from?.first_name ?? "teman";
  return template.replaceAll("{name}", name);
}

function buildKeyboard(buttons: InlineButton[]): InlineKeyboard | undefined {
  if (!buttons.length) return undefined;
  const kb = new InlineKeyboard();
  for (const b of buttons) {
    if (b.text && b.url) kb.url(b.text, b.url).row();
  }
  return kb;
}

export function registerCommands(bot: GrammyBot, bundle: BotBundle) {
  const active = bundle.commands.filter((c) => c.enabled);
  const commandTriggers = active.filter((c) => c.isCommand);
  const keywordTriggers = active.filter((c) => !c.isCommand);

  // Slash commands: trigger stored like "/help" or "help"
  for (const cmd of commandTriggers) {
    const name = cmd.trigger.replace(/^\//, "").toLowerCase();
    bot.command(name, async (ctx) => {
      const buttons = (cmd.buttons as InlineButton[]) ?? [];
      await ctx.reply(render(cmd.response, ctx), {
        reply_markup: buildKeyboard(buttons),
      });
    });
  }

  // Keyword auto-reply: fire when message text contains the trigger.
  if (keywordTriggers.length) {
    bot.on("message:text", async (ctx, next) => {
      const text = ctx.message.text.toLowerCase();
      for (const kw of keywordTriggers) {
        if (text.includes(kw.trigger.toLowerCase())) {
          const buttons = (kw.buttons as InlineButton[]) ?? [];
          await ctx.reply(render(kw.response, ctx), {
            reply_markup: buildKeyboard(buttons),
          });
          return;
        }
      }
      await next();
    });
  }
}
