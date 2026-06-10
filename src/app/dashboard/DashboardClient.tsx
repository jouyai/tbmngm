"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BotRow = {
  id: string;
  name: string;
  username: string;
  status: string;
  lastError: string | null;
  users: number;
  commands: number;
};

export default function DashboardClient({
  initialBots,
}: {
  initialBots: BotRow[];
}) {
  const router = useRouter();
  const [bots, setBots] = useState(initialBots);
  const [token, setToken] = useState("");
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function refresh() {
    const res = await fetch("/api/bots");
    if (res.ok) {
      const data = await res.json();
      setBots(
        data.map((b: any) => ({
          id: b.id,
          name: b.name,
          username: b.username,
          status: b.status,
          lastError: b.lastError,
          users: b._count?.users ?? 0,
          commands: b._count?.commands ?? 0,
        }))
      );
    }
  }

  async function addBot(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setMsg(null);
    const res = await fetch("/api/bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setAdding(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ type: "ok", text: `Bot @${data.username} berhasil ditambahkan!` });
      setToken("");
      await refresh();
    } else {
      setMsg({ type: "err", text: data.error ?? "Gagal menambahkan bot" });
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="container">
      <div className="row between" style={{ marginBottom: 20 }}>
        <h1>Bot Platform</h1>
        <button className="ghost" onClick={logout}>
          Keluar
        </button>
      </div>

      <div className="card">
        <h2>Tambah Bot Baru</h2>
        <p className="muted">
          Buat bot di @BotFather, lalu paste token-nya di sini. Webhook akan
          otomatis diset.
        </p>
        <form onSubmit={addBot}>
          <label>Bot Token</label>
          <input
            placeholder="123456:ABC-DEF..."
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          {msg && (
            <div className={`notice ${msg.type === "ok" ? "ok" : "err"}`}>
              {msg.text}
            </div>
          )}
          <button style={{ marginTop: 12 }} disabled={adding || !token.trim()}>
            {adding ? "Memvalidasi..." : "Tambah Bot"}
          </button>
        </form>
      </div>

      <h2>Daftar Bot ({bots.length})</h2>
      {bots.length === 0 && (
        <div className="card">
          <p className="muted">Belum ada bot. Tambahkan bot pertamamu di atas.</p>
        </div>
      )}
      {bots.map((b) => (
        <Link key={b.id} href={`/dashboard/${b.id}`} style={{ color: "inherit" }}>
          <div className="card" style={{ cursor: "pointer" }}>
            <div className="row between">
              <div>
                <div style={{ fontWeight: 600 }}>{b.name}</div>
                <div className="muted">@{b.username}</div>
              </div>
              <div className="row">
                <span className="muted">{b.users} user · {b.commands} cmd</span>
                <span className={`badge ${b.status.toLowerCase()}`}>{b.status}</span>
              </div>
            </div>
            {b.lastError && (
              <div className="notice err" style={{ marginTop: 8 }}>
                {b.lastError}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
