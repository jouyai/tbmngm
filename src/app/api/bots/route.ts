import { NextRequest } from "next/server";
import { addBot, listBots } from "@/lib/bot/service";
import { guard, ok, fail } from "@/lib/api-helpers";

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return ok(await listBots());
}

export async function POST(req: NextRequest) {
  const denied = await guard();
  if (denied) return denied;

  const { token } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return fail("Token wajib diisi");

  try {
    const bot = await addBot(token.trim());
    return ok({ id: bot.id, username: bot.username, name: bot.name });
  } catch (e) {
    return fail((e as Error).message);
  }
}
