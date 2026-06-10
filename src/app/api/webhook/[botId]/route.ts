import { NextRequest, NextResponse } from "next/server";
import { webhookCallback } from "grammy";
import { getBotInstance } from "@/lib/bot/registry";
import { deriveWebhookSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Telegram posts updates here: /api/webhook/<telegramBotId>
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const { botId } = await params;

  // Verify the secret header so nobody can spoof updates.
  const sentSecret = req.headers.get("x-telegram-bot-api-secret-token");
  const expected = deriveWebhookSecret(botId);
  if (sentSecret !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const bot = await getBotInstance(botId);
  if (!bot) {
    // Unknown or inactive bot. 200 so Telegram stops retrying.
    return NextResponse.json({ ok: true, ignored: true });
  }

  // grammY's webhook handler adapts the Next.js request/response.
  const handle = webhookCallback(bot, "std/http");
  return handle(req);
}

// Simple health/info check
export async function GET() {
  return NextResponse.json({ ok: true, message: "webhook endpoint up" });
}
