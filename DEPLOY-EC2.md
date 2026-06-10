# Deploy ke EC2 (self-signed, tanpa domain)

Panduan menjalankan platform di satu instance EC2 Ubuntu memakai sertifikat
self-signed (tidak perlu beli domain). Telegram mengizinkan webhook ke IP +
self-signed cert selama port 443/80/88/8443 dan certificate publiknya diupload.

## 1. Prasyarat di EC2

```bash
# Update + tools
sudo apt update && sudo apt install -y git curl

# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Docker (untuk Postgres)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # logout/login agar berlaku
```

## 2. Security Group (penting!)

Di AWS Console → EC2 → Security Group instance, buka **inbound**:

| Type        | Port | Source     | Catatan                          |
|-------------|------|------------|----------------------------------|
| Custom TCP  | 8443 | 0.0.0.0/0  | Port webhook (Telegram → server) |
| SSH         | 22   | IP kamu    | Akses admin                      |

> Telegram hanya menerima webhook di port **443, 80, 88, atau 8443**. Kita pakai 8443.

## 3. Clone & install

```bash
git clone <repo-mu> botplatform && cd botplatform
npm install
cp .env.example .env
```

## 4. Generate sertifikat self-signed

Ganti `EC2_PUBLIC_IP` dengan IP publik EC2-mu (atau DNS publik AWS).
`CN` **harus** sama dengan host di `PUBLIC_BASE_URL`.

```bash
EC2_PUBLIC_IP=54.175.200.213
openssl req -newkey rsa:2048 -sha256 -nodes \
  -keyout certs/private.key \
  -x509 -days 3650 \
  -out certs/public.pem \
  -subj "/CN=${EC2_PUBLIC_IP}"
```

Hasil:
- `certs/private.key` → dipakai server HTTPS (rahasia)
- `certs/public.pem`  → diupload ke Telegram (publik)

## 5. Isi `.env`

```env
DATABASE_URL="postgresql://botadmin:botpass@localhost:5432/botplatform?schema=public"
PUBLIC_BASE_URL="https://54.175.200.213:8443"
WEBHOOK_CERT_PATH="./certs/public.pem"
ENCRYPTION_KEY="6a34950b5e62462b02d482c84180da40cac84a7b120578037d7dee900aa4ec7e"
WEBHOOK_SECRET_SALT="b4e091937af67c0eb2ce3c779f3327b2efac0fdfd5367d17c45c112982aa432d"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="jakarta132"
SESSION_SECRET="2f02ac9331c9464c2997a2ca7d84fde7caf9545c3d4772dc674496f9b96875f1"
```

Generate secret:
```bash
openssl rand -hex 32
```

## 6. Database + migrasi

```bash
docker compose up -d            # start Postgres
set -a; source .env; set +a     # muat .env ke shell (untuk db:seed)
npx prisma db push              # buat semua tabel dari schema
npm run db:seed                 # buat admin user dari .env
```

## 7. Build

```bash
npm run build
```

## 8. Jalankan di HTTPS port 8443

Next.js sendiri tidak melayani HTTPS langsung. Dua opsi:

### Opsi A — Nginx sebagai TLS terminator (disarankan)

```bash
sudo apt install -y nginx
```

`/etc/nginx/sites-available/botplatform`:
```nginx
server {
    listen 8443 ssl;
    server_name 12.34.56.78;

    ssl_certificate     /home/ubuntu/botplatform/certs/public.pem;
    ssl_certificate_key /home/ubuntu/botplatform/certs/private.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Telegram-Bot-Api-Secret-Token $http_x_telegram_bot_api_secret_token;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/botplatform /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Jalankan app (port 3000) dengan pm2 agar persisten:
```bash
sudo npm install -g pm2
pm2 start "npm start" --name botplatform
pm2 save && pm2 startup
```

### Opsi B — tanpa Nginx (Node HTTPS langsung)

Pakai paket seperti `local-ssl-proxy` atau jalankan Next di belakang
`https` reverse-proxy sederhana. Opsi A lebih solid untuk produksi.

## 9. Cek

- Buka `https://12.34.56.78:8443` → halaman login (browser akan warning
  self-signed, klik lanjutkan).
- Login dengan kredensial admin.
- Tambah bot: paste token dari @BotFather → webhook otomatis di-set.

Verifikasi webhook bot:
```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```
`url` harus menunjuk ke `https://12.34.56.78:8443/api/webhook/<botId>` dan
`has_custom_certificate: true`.

## Troubleshooting

- **`SSL error` / webhook tidak masuk**: CN cert tidak cocok dengan IP di
  `PUBLIC_BASE_URL`, atau cert publik tidak terupload. Pastikan
  `WEBHOOK_CERT_PATH` benar lalu klik "Aktifkan"/refresh webhook di dashboard.
- **Port diblok**: cek Security Group AWS port 8443.
- **Pindah ke domain nanti**: arahkan domain ke IP, pasang Let's Encrypt,
  kosongkan `WEBHOOK_CERT_PATH`, ubah `PUBLIC_BASE_URL`, lalu refresh webhook.
