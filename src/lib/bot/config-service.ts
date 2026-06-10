import { prisma } from "@/lib/db";
import { invalidateBot } from "./registry";
import type { ModerationSettings, InlineButton } from "./types";

async function botRouteId(botId: string): Promise<string | null> {
  const bot = await prisma.bot.findUnique({
    where: { id: botId },
    select: { telegramBotId: true },
  });
  return bot?.telegramBotId ?? null;
}

export type ConfigUpdate = {
  welcomeEnabled?: boolean;
  commandsEnabled?: boolean;
  moderationEnabled?: boolean;
  broadcastEnabled?: boolean;
  welcomeMessage?: string;
  moderation?: ModerationSettings;
};

export async function updateConfig(botId: string, data: ConfigUpdate) {
  await prisma.botConfig.update({
    where: { botId },
    data: {
      ...data,
      moderation: data.moderation as object | undefined,
    },
  });
  const routeId = await botRouteId(botId);
  if (routeId) invalidateBot(routeId);
}

export async function listCommands(botId: string) {
  return prisma.customCommand.findMany({
    where: { botId },
    orderBy: { createdAt: "asc" },
  });
}

export async function upsertCommand(
  botId: string,
  input: {
    id?: string;
    trigger: string;
    response: string;
    buttons?: InlineButton[];
    isCommand: boolean;
    enabled: boolean;
  }
) {
  if (input.id) {
    await prisma.customCommand.update({
      where: { id: input.id },
      data: {
        trigger: input.trigger,
        response: input.response,
        buttons: (input.buttons ?? []) as object,
        isCommand: input.isCommand,
        enabled: input.enabled,
      },
    });
  } else {
    await prisma.customCommand.create({
      data: {
        botId,
        trigger: input.trigger,
        response: input.response,
        buttons: (input.buttons ?? []) as object,
        isCommand: input.isCommand,
        enabled: input.enabled,
      },
    });
  }
  const routeId = await botRouteId(botId);
  if (routeId) invalidateBot(routeId);
}

export async function deleteCommand(botId: string, commandId: string) {
  await prisma.customCommand.delete({ where: { id: commandId } });
  const routeId = await botRouteId(botId);
  if (routeId) invalidateBot(routeId);
}

export function getBotDetail(botId: string) {
  return prisma.bot.findUnique({
    where: { id: botId },
    include: { config: true, commands: true, _count: { select: { users: true } } },
  });
}
