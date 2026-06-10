import { logout } from "@/lib/auth";
import { ok } from "@/lib/api-helpers";

export async function POST() {
  await logout();
  return ok();
}
