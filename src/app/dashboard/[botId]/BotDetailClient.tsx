"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Cmd = {
  id: string;
  trigger: string;
  response: string;
  buttons: { text: string; url: string }[];
  isCommand: boolean;
  enabled: boolean;
};

type BotData = {
  id: string;
  name: string;
  username: string;
  status: string;
  userCount: number;
  config: {
    welcomeEnabled: boolean;
    commandsEnabled: boolean;
    moderationEnabled: boolean;
    broadcastEnabled: boolean;
    welcomeMessage: string;
    moderation: {
      bannedWords?: string[];
      antiSpam?: boolean;
      maxMessagesPer10s?: number;
      deleteOnViolation?: boolean;
    };
  };
  commands: Cmd[];
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        style={{ width: "auto" }}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export default function BotDetailClient({ bot }: { bot: BotData }) {
  const router = useRouter();
  const [config, setConfig] = useState(bot.config);
  const [commands, setCommands] = useState(bot.commands);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function flash(type: "ok" | "err", text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function api(body: object) {
    const res = await fetch(`/api/bots/${bot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Gagal");
    return data;
  }

  async function saveConfig() {
    setBusy(true);
    try {
      await api({ action: "updateConfig", config });
      flash("ok", "Pengaturan tersimpan");
    } catch (e) {
      flash("err", (e as Error).message);
    }
    setBusy(false);
  }

  async function toggleActive() {
    const active = bot.status !== "ACTIVE";
    try {
      await api({ action: "setActive", active });
      router.refresh();
    } catch (e) {
      flash("err", (e as Error).message);
    }
  }

  async function deleteBot() {
    if (!confirm(`Hapus bot @${bot.username}? Tindakan ini permanen.`)) return;
    await fetch(`/api/bots/${bot.id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  // ---- commands ----
  function addCommandRow() {
    setCommands([
      ...commands,
      { id: "", trigger: "", response: "", buttons: [], isCommand: true, enabled: true },
    ]);
  }

  function updateCmd(idx: number, patch: Partial<Cmd>) {
    setCommands(commands.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function saveCmd(idx: number) {
    const c = commands[idx];
    if (!c.trigger || !c.response) return flash("err", "Trigger & response wajib diisi");
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      flash("ok", "Command tersimpan");
      router.refresh();
    } catch (e) {
      flash("err", (e as Error).message);
    }
    setBusy(false);
  }

  async function deleteCmd(idx: number) {
    const c = commands[idx];
    if (c.id) {
      await fetch(`/api/bots/${bot.id}/commands?commandId=${c.id}`, {
        method: "DELETE",
      });
    }
    setCommands(commands.filter((_, i) => i !== idx));
  }

  async function sendBroadcast() {
    if (!broadcastMsg.trim()) return;
    if (!confirm(`Kirim ke ${bot.userCount} user?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      flash("ok", `Terkirim: ${data.sent}/${data.total} (gagal ${data.failed})`);
      setBroadcastMsg("");
    } catch (e) {
      flash("err", (e as Error).message);
    }
    setBusy(false);
  }

  const mod = config.moderation;

  return (
    <div className="container">
      <div className="row between" style={{ marginBottom: 16 }}>
        <Link href="/dashboard">&larr; Kembali</Link>
        <span className={`badge ${bot.status.toLowerCase()}`}>{bot.status}</span>
      </div>

      <div className="card">
        <div className="row between">
          <div>
            <h1 style={{ margin: 0 }}>{bot.name}</h1>
            <div className="muted">@{bot.username} · {bot.userCount} user</div>
          </div>
          <div className="row">
            <button className="secondary" onClick={toggleActive}>
              {bot.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
            </button>
            <button className="danger" onClick={deleteBot}>
              Hapus
            </button>
          </div>
        </div>
      </div>

      {msg && <div className={`notice ${msg.type === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

      {/* Feature toggles + welcome */}
      <div className="card">
        <h2>Fitur</h2>
        <div className="grid">
          <Toggle
            label="Welcome / Auto-reply"
            checked={config.welcomeEnabled}
            onChange={(v) => setConfig({ ...config, welcomeEnabled: v })}
          />
          <Toggle
            label="Custom Commands"
            checked={config.commandsEnabled}
            onChange={(v) => setConfig({ ...config, commandsEnabled: v })}
          />
          <Toggle
            label="Manajemen Grup (moderasi)"
            checked={config.moderationEnabled}
            onChange={(v) => setConfig({ ...config, moderationEnabled: v })}
          />
          <Toggle
            label="Broadcast"
            checked={config.broadcastEnabled}
            onChange={(v) => setConfig({ ...config, broadcastEnabled: v })}
          />
        </div>

        <label>Pesan Welcome (gunakan {"{name}"} untuk nama user)</label>
        <textarea
          value={config.welcomeMessage}
          onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
        />

        {config.moderationEnabled && (
          <>
            <label>Kata Terlarang (pisahkan dengan koma)</label>
            <input
              value={(mod.bannedWords ?? []).join(", ")}
              onChange={(e) =>
                setConfig({
                  ...config,
                  moderation: {
                    ...mod,
                    bannedWords: e.target.value
                      .split(",")
                      .map((w) => w.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
            <div style={{ marginTop: 12 }}>
              <Toggle
                label="Anti-spam (batasi pesan beruntun)"
                checked={mod.antiSpam ?? false}
                onChange={(v) =>
                  setConfig({ ...config, moderation: { ...mod, antiSpam: v } })
                }
              />
            </div>
          </>
        )}

        <button style={{ marginTop: 16 }} onClick={saveConfig} disabled={busy}>
          Simpan Pengaturan
        </button>
      </div>

      {/* Commands */}
      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Commands & Auto-reply</h2>
          <button className="secondary" onClick={addCommandRow}>
            + Tambah
          </button>
        </div>
        {commands.length === 0 && (
          <p className="muted">Belum ada command.</p>
        )}
        {commands.map((c, idx) => (
          <div key={idx} className="card" style={{ background: "var(--panel-2)" }}>
            <div className="row" style={{ gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label>Trigger</label>
                <input
                  placeholder={c.isCommand ? "/help" : "harga"}
                  value={c.trigger}
                  onChange={(e) => updateCmd(idx, { trigger: e.target.value })}
                />
              </div>
              <div style={{ width: 140 }}>
                <label>Tipe</label>
                <select
                  value={c.isCommand ? "command" : "keyword"}
                  onChange={(e) =>
                    updateCmd(idx, { isCommand: e.target.value === "command" })
                  }
                >
                  <option value="command">Command (/x)</option>
                  <option value="keyword">Keyword</option>
                </select>
              </div>
            </div>
            <label>Response</label>
            <textarea
              value={c.response}
              onChange={(e) => updateCmd(idx, { response: e.target.value })}
            />
            <div className="row between" style={{ marginTop: 10 }}>
              <Toggle
                label="Aktif"
                checked={c.enabled}
                onChange={(v) => updateCmd(idx, { enabled: v })}
              />
              <div className="row">
                <button className="ghost" onClick={() => deleteCmd(idx)}>
                  Hapus
                </button>
                <button onClick={() => saveCmd(idx)} disabled={busy}>
                  Simpan
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast */}
      {config.broadcastEnabled && (
        <div className="card">
          <h2>Broadcast</h2>
          <p className="muted">
            Kirim pesan ke {bot.userCount} user yang pernah chat bot ini.
          </p>
          <textarea
            placeholder="Tulis pesan broadcast..."
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
          />
          <button
            style={{ marginTop: 12 }}
            onClick={sendBroadcast}
            disabled={busy || !broadcastMsg.trim()}
          >
            Kirim Broadcast
          </button>
        </div>
      )}
    </div>
  );
}
