import { NextRequest } from "next/server";
import { login } from "@/lib/auth";
import { ok, fail } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));
  if (!username || !password) return fail("Username dan password wajib diisi");
  const success = await login(username, password);
  if (!success) return fail("Login gagal", 401);
  return ok();
}
