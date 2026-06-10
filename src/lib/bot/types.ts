import type { Bot, BotConfig, CustomCommand } from "@prisma/client";

// Full bot data needed to build a running grammY instance.
export type BotBundle = Bot & {
  config: BotConfig | null;
  commands: CustomCommand[];
};

export type ModerationSettings = {
  bannedWords?: string[];
  antiSpam?: boolean;
  maxMessagesPer10s?: number;
  deleteOnViolation?: boolean;
};

export type InlineButton = { text: string; url: string };
