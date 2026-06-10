import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listBots } from "@/lib/bot/service";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const uid = await getSession();
  if (!uid) redirect("/login");

  const bots = await listBots();
  const plain = bots.map((b) => ({
    id: b.id,
    name: b.name,
    username: b.username,
    status: b.status,
    lastError: b.lastError,
    users: b._count.users,
    commands: b._count.commands,
  }));

  return <DashboardClient initialBots={plain} />;
}
