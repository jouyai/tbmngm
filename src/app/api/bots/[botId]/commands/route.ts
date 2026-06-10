import { NextRequest } from "next/server";
import { listCommands, upsertCommand, deleteCommand } from "@/lib/bot/config-service";
import { guard, ok, fail } from "@/lib/api-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { botId } = await params;
  return ok(await listCommands(botId));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { botId } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.trigger || !body.response) return fail("Trigger dan response wajib diisi");

  try {
    await upsertCommand(botId, {
      id: body.id,
      trigger: String(body.trigger).trim(),
      response: String(body.response),
      buttons: body.buttons ?? [],
      isCommand: body.isCommand ?? true,
      enabled: body.enabled ?? true,
    });
    return ok();
  } catch (e) {
    return fail((e as Error).message);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ botId: string }> }
) {
  const denied = await guard();
  if (denied) return denied;
  const { botId } = await params;
  const { searchParams } = new URL(req.url);
  const commandId = searchParams.get("commandId");
  if (!commandId) return fail("commandId wajib diisi");
  await deleteCommand(botId, commandId);
  return ok();
}
