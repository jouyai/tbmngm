import { NextRequest } from "next/server";
import { broadcast } from "@/lib/bot/broadcast";
import { guard, ok, fail } from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { botId } = await params;
  const { message } = await req.json().catch(() => ({}));
  if (!message || typeof message !== "string") return fail("Pesan wajib diisi");

  try {
    const result = await broadcast(botId, message);
    return ok(result);
  } catch (e) {
    return fail((e as Error).message);
  }
}
