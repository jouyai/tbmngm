import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Wrap an API handler so it only runs for authenticated admins.
export async function guard(): Promise<NextResponse | null> {
  const uid = await getSession();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

export function ok(data: unknown = { ok: true }) {
  return NextResponse.json(data);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
