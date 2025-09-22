# Merchant Payments API

A production-ready **Node.js + Express** backend for managing merchant payments, orders, payouts, and webhook integrations.  
Built with **Prisma ORM** and deployed on **AWS EC2** with a managed **PostgreSQL (Neon)** database.

---

## 🌐 Live URL
- **Base API**: `http://52.77.238.249:3001`
- **Health**: `http://52.77.238.249:3001/health` → expected `{ "ok": true }`

> The frontend talks to this API via a secure Vercel proxy (`/_api` path). See the frontend README for details.

---

## 🚀 What this service does
- Accepts and tracks **orders** (create → confirm/fail) in fiat & crypto
- Manages **payouts** (request and mark as sent)
- Emits **webhook events** (`order.created`, `order.confirmed`, `order.failed`) and logs deliveries
- Provides **API key** endpoints (demo rotation + masked display)
- Exposes clean REST endpoints for a merchant dashboard frontend

---

## 🛠 Tech Stack
- **Runtime:** Node.js (Express)
- **Database:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Deploy:** AWS EC2 + PM2
- **CORS:** Configured via `WEB_ORIGIN`

---

## 📦 Getting Started (local)

### 1) Clone & install
```bash
git clone https://github.com/<your-username>/merchant-payments-api-express.git
cd merchant-payments-api-express
npm ci
```

### 2) Configure environment
Create `.env`:
```env
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require"
PORT=3001
JWT_SECRET="change-me"
WEB_ORIGIN="http://localhost:3000"  # or your Vercel URL in prod
```

### 3) Prisma client & migrations
```bash
npx prisma generate
npx prisma migrate dev   # or: npx prisma migrate deploy (for prod)
```

### 4) Run
```bash
npm run dev
```

---

## 📚 API Reference (quick)

### Health
```http
GET /health
```
Response:
```json
{ "ok": true }
```

### Orders
```http
GET  /orders?page=1&pageSize=20&status=&symbol=&q=
POST /orders
POST /orders/:id/confirm   # { "txHash": "0x..." }
POST /orders/:id/fail      # { "reason": "..." }
```

**Create example**
```bash
curl -X POST http://52.77.238.249:3001/orders \
  -H "Content-Type: application/json" \
  -d '{"fiatAmount":94.22,"fiatCurrency":"USD","cryptoAmount":0.0345,"cryptoSymbol":"ETH","address":"0xabc","network":"sepolia"}'
```

**Confirm example**
```bash
curl -X POST http://52.77.238.249:3001/orders/<ORDER_ID>/confirm \
  -H "Content-Type: application/json" \
  -d '{"txHash":"0xdeadbeef"}'
```

### Payouts
```http
GET  /payouts?page=1&pageSize=20
POST /payouts               # { "amount": 120, "currency": "USD" }
POST /payouts/:id/send      # mark status=SENT
```

### Settings (API key)
```http
GET  /settings/api-key
POST /settings/rotate
```

### Webhooks
```http
GET  /webhooks/endpoints
GET  /webhooks/deliveries?limit=50
POST /webhooks/seed          # seed example endpoint (dev)
POST /webhooks/test          # emit a test event
```

---

## 🗂 Environment Variables

| Name          | Required | Example / Notes                                    |
|---------------|:--------:|----------------------------------------------------|
| `DATABASE_URL`|    ✅    | `postgresql://user:pass@host/db?sslmode=require`   |
| `PORT`        |    ❇️    | Default `3001`                                     |
| `JWT_SECRET`  |    ✅    | Any strong secret                                  |
| `WEB_ORIGIN`  |    ✅    | e.g. `https://<your-vercel>.vercel.app`            |

---

## 🚀 Deploy to EC2 (summary)

```bash
# SSH
ssh -i /path/to/key.pem ubuntu@52.77.238.249

# First-time setup
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm i -g pm2

# Code + env + DB
git clone https://github.com/<your-username>/merchant-payments-api-express.git
cd merchant-payments-api-express
nano .env
npm ci
npx prisma generate
npx prisma migrate deploy

# Start
pm2 start "node src/index.js" --name mpd-api
pm2 save
```

**Security Group inbound:** SSH `22` (your IP), API `3001` (0.0.0.0/0 for demo).

---

## 🔁 Redeploy
```bash
ssh -i /path/to/key.pem ubuntu@52.77.238.249 << 'EOS'
cd ~/merchant-payments-api-express
git fetch --all && git pull origin main
npm ci
npx prisma generate
npx prisma migrate deploy
pm2 reload mpd-api
EOS
```

---

## 🧰 Troubleshooting
- **CORS**: set `WEB_ORIGIN` to your frontend origin (Vercel) and `pm2 restart mpd-api`  
- **DB (P1001)**: verify `DATABASE_URL` and `sslmode=require` (Neon)  
- **Timeout**: open security group port **3001** inbound

---

## 📜 License
MIT
