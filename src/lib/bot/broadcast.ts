import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

// Telegram allows ~30 messages/sec globally. We stay well under that.
const DELAY_MS = 50; // ~20 msg/sec
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sendMessage(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  return res.json();
}

export type BroadcastResult = {
  total: number;
  sent: number;
  failed: number;
  blocked: number;
};

// Send a message to every tracked user of a bot.
// Runs sequentially with a small delay to respect rate limits.
export async function broadcast(
  botId: string,
  text: string
): Promise<BroadcastResult> {
  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) throw new Error("Bot tidak ditemukan");

  const token = decrypt(bot.tokenEnc);
  const users = await prisma.botUser.findMany({
    where: { botId, isBlocked: false },
    select: { id: true, chatId: true },
  });

  const result: BroadcastResult = {
    total: users.length,
    sent: 0,
    failed: 0,
    blocked: 0,
  };

  for (const u of users) {
    try {
      const r = await sendMessage(token, u.chatId, text);
      if (r.ok) {
        result.sent++;
      } else {
        result.failed++;
        // 403 = user blocked the bot; mark so we skip next time.
        if (r.error_code === 403) {
          result.blocked++;
          await prisma.botUser.update({
            where: { id: u.id },
            data: { isBlocked: true },
          });
        }
      }
    } catch {
      result.failed++;
    }
    await sleep(DELAY_MS);
  }

  return result;
}
