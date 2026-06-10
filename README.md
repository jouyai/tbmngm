# Telegram Bot Platform (Multi-Bot / Bot Cloning)

Satu core bot, banyak instance. Tambah bot baru cukup **paste token** di
dashboard — webhook diset otomatis, tanpa restart server. Tiap bot punya
config sendiri (fitur on/off, pesan welcome, command custom, moderasi,
broadcast).

## Fitur

- **Tambah bot via dashboard** — paste token, validasi otomatis (`getMe`), set webhook.
- **Welcome / auto-reply** — sambut member baru & balasan keyword.
- **Custom commands** — `/command` dan keyword auto-reply + inline button.
- **Manajemen grup** — filter kata terlarang & anti-spam (bot harus admin).
- **Broadcast** — kirim massal ke semua user bot (rate-limited).
- **Toggle fitur per bot** — nyalakan/matikan modul tanpa sentuh kode.
- **Aman** — token terenkripsi (AES-256-GCM), webhook secret per bot, login admin.

## Arsitektur

```
Telegram --webhook--> /api/webhook/[telegramBotId] --> registry (cache grammY)
                                                          --> feature modules
Dashboard (Next.js) --> API routes --> service layer --> Postgres (Prisma)
```

- **grammY** instance dibuat dinamis dari token di DB, di-cache per proses.
- Ubah config dari dashboard → cache di-invalidate → webhook berikutnya pakai config baru.

## Stack

TypeScript · Next.js 15 (App Router) · grammY · Prisma · PostgreSQL

## Struktur

```
prisma/schema.prisma        Model: Bot, BotConfig, CustomCommand, BotUser, AdminUser
src/lib/crypto.ts           Enkripsi token + derive webhook secret
src/lib/auth.ts             Session login admin
src/lib/bot/
  factory.ts                Build grammY bot dari config + modul
  registry.ts               Cache instance per botId
  service.ts                Add/remove/activate bot + setWebhook
  config-service.ts         Update config & commands
  broadcast.ts              Broadcast rate-limited
  telegram-api.ts           getMe / setWebhook (support self-signed cert)
  modules/                  welcome, commands, moderation
src/app/api/webhook/[botId] Endpoint update Telegram
src/app/dashboard/          UI list + detail bot
```

## Quick start (lokal)

```bash
npm install
cp .env.example .env         # isi ENCRYPTION_KEY dll (lihat di bawah)
docker compose up -d         # Postgres (butuh Docker)
npx prisma migrate dev       # buat tabel
npm run db:seed              # buat admin user
npm run dev                  # http://localhost:3000
```

Generate secret yang dibutuhkan `.env`:
```bash
openssl rand -hex 32   # untuk ENCRYPTION_KEY, WEBHOOK_SECRET_SALT, SESSION_SECRET
```

> **Webhook butuh HTTPS publik.** Di lokal, Telegram tak bisa menjangkau
> `localhost`. Untuk uji end-to-end pakai ngrok (`ngrok http 3000`, lalu set
> `PUBLIC_BASE_URL` ke URL ngrok) atau deploy ke EC2.

## Deploy ke EC2 (self-signed, tanpa domain)

Lihat **[DEPLOY-EC2.md](./DEPLOY-EC2.md)** — langkah lengkap: security group,
generate cert, Nginx TLS di port 8443, pm2, dan verifikasi webhook.

## Cara pakai

1. Login dashboard (kredensial dari `.env`).
2. Buat bot di [@BotFather](https://t.me/BotFather), salin token.
3. Paste token di "Tambah Bot Baru" → bot langsung aktif.
4. Klik bot → atur welcome, command, moderasi, atau kirim broadcast.

## Catatan keamanan

- Token **tidak** disimpan plaintext — dienkripsi dengan `ENCRYPTION_KEY`.
  Jangan ganti key ini setelah ada bot tersimpan (token lama jadi tak terbaca).
- Tiap webhook diverifikasi lewat header `X-Telegram-Bot-Api-Secret-Token`.
- Ganti `ADMIN_PASSWORD` default sebelum produksi.
