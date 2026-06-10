import { NextRequest } from "next/server";
import { removeBot, setBotActive, refreshWebhook } from "@/lib/bot/service";
import { getBotDetail, updateConfig } from "@/lib/bot/config-service";
import { guard, ok, fail } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { botId } = await params;
  const bot = await getBotDetail(botId);
  if (!bot) return fail("Bot tidak ditemukan", 404);
  return ok(bot);
}

// Update config / toggle active / refresh webhook depending on `action`.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { botId } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    if (body.action === "setActive") {
      await setBotActive(botId, !!body.active);
    } else if (body.action === "refreshWebhook") {
      await refreshWebhook(botId);
    } else if (body.action === "updateConfig") {
      await updateConfig(botId, body.config ?? {});
    } else {
      return fail("Aksi tidak dikenali");
    }
    return ok();
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { botId } = await params;
  await removeBot(botId);
  return ok();
}
