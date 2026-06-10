import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getBotDetail } from "@/lib/bot/config-service";
import BotDetailClient from "./BotDetailClient";
import type { ModerationSettings, InlineButton } from "@/lib/bot/types";

export const dynamic = "force-dynamic";

export default async function BotDetailPage({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const uid = await getSession();
  if (!uid) redirect("/login");

  const { botId } = await params;
  const bot = await getBotDetail(botId);
  if (!bot) notFound();

  const data = {
    id: bot.id,
    name: bot.name,
    username: bot.username,
    status: bot.status,
    userCount: bot._count.users,
    config: {
      welcomeEnabled: bot.config?.welcomeEnabled ?? true,
      commandsEnabled: bot.config?.commandsEnabled ?? true,
      moderationEnabled: bot.config?.moderationEnabled ?? false,
      broadcastEnabled: bot.config?.broadcastEnabled ?? true,
      welcomeMessage: bot.config?.welcomeMessage ?? "",
      moderation: (bot.config?.moderation as ModerationSettings) ?? {},
    },
    commands: bot.commands.map((c) => ({
      id: c.id,
      trigger: c.trigger,
      response: c.response,
      buttons: (c.buttons as InlineButton[]) ?? [],
      isCommand: c.isCommand,
      enabled: c.enabled,
    })),
  };

  return <BotDetailClient bot={data} />;
}
