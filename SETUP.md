# WhatsApp SaaS — Developer Setup Guide

## Prerequisites

Make sure you have these installed before starting:
- Node.js 20+ (`node -v`)
- pnpm 9+ (`npm install -g pnpm`)
- Git

---

## Step 1 — Install dependencies

```bash
cd whatsapp-saas   # or wherever you cloned this
pnpm install
```

This installs everything across all apps and packages at once.

---

## Step 2 — Set up Supabase (PostgreSQL)

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Pick a name and a strong DB password (save this!)
3. Once created: **Project Settings → Database → Connection String → URI**
4. Copy the URI — it looks like: `postgresql://postgres:PASSWORD@db.YOURREF.supabase.co:5432/postgres`

---

## Step 3 — Set up Upstash (Redis)

1. Go to [console.upstash.com](https://console.upstash.com) → **Create Database**
2. Choose the free tier, pick a region close to you
3. After creation go to **Details** and copy the **Redis URL** (starts with `rediss://`)

---

## Step 4 — Configure environment variables

Copy `.env.example` values into each app's `.env.local`:

**`apps/api/.env.local`**
```env
DATABASE_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres"
REDIS_URL="rediss://:TOKEN@ENDPOINT.upstash.io:6379"
API_PORT=4000
JWT_SECRET="run: openssl rand -hex 32"
ENCRYPTION_KEY="run: openssl rand -hex 32"
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
WEBHOOK_CALLBACK_URL="https://YOUR-NGROK-URL/webhook"
WEBHOOK_VERIFY_TOKEN="any-random-string-you-choose"
```

**`apps/webhook/.env.local`**
```env
DATABASE_URL="same as above"
REDIS_URL="same as above"
WEBHOOK_PORT=4001
WEBHOOK_VERIFY_TOKEN="SAME string as above"
NODE_ENV="development"
```

**`apps/web/.env.local`**
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -hex 32"
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_WEBHOOK_URL="http://localhost:4001"
```

> **Generate secrets:** Run `openssl rand -hex 32` in your terminal (or Git Bash on Windows).

---

## Step 5 — Push the database schema

```bash
cd packages/database
cp ../../apps/api/.env.local .env   # Prisma needs DATABASE_URL here
pnpm db:push                         # Creates all tables in Supabase
pnpm db:seed                         # Creates a test user (admin@example.com / password123)
```

After running `db:push`, verify the tables appeared in your Supabase dashboard under **Table Editor**.

---

## Step 6 — Start the development servers

Open **3 terminal windows**:

**Terminal 1 — API Server**
```bash
cd apps/api
pnpm dev
# Running on http://localhost:4000
```

**Terminal 2 — Webhook Receiver**
```bash
cd apps/webhook
pnpm dev
# Running on http://localhost:4001
```

**Terminal 3 — Next.js Frontend**
```bash
cd apps/web
pnpm dev
# Running on http://localhost:3000
```

Or run everything from root (requires turbo):
```bash
pnpm dev
```

---

## Step 7 — Set up ngrok (for webhook testing)

Meta needs a public HTTPS URL to send webhook events to. Use ngrok to expose your local webhook receiver:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 4001
```

This gives you a URL like: `https://abc123.ngrok-free.app`

Your webhook URL will be: `https://abc123.ngrok-free.app/webhook`

Update `apps/api/.env.local`:
```env
WEBHOOK_CALLBACK_URL="https://abc123.ngrok-free.app/webhook"
```

---

## Step 8 — Meta Developer Setup

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps → Create App**
2. Choose **Business** type
3. Add **WhatsApp** product to your app
4. In **WhatsApp → API Setup**:
   - Note your **Phone Number ID** and **WhatsApp Business Account ID**
   - Generate a **temporary access token** (or use a System User token)
5. In **App Settings → Basic**:
   - Note your **App ID** and **App Secret**

---

## Step 9 — Import credentials & register webhook

1. Open `http://localhost:3000`
2. Register an account (or log in as `admin@example.com` / `password123`)
3. Go to **Settings** → paste in your App ID, App Secret, Access Token, WABA ID, Phone Number ID → **Import credentials**
4. Go to **Webhooks** → click **Register webhook with Meta**

Meta will send a GET request to your ngrok URL to verify — the webhook receiver handles this automatically.

---

## Step 10 — Test it!

Send a WhatsApp message **to** your test phone number. Within seconds it should appear in the **Messages** inbox on your dashboard.

---

## Project Structure

```
whatsapp-saas/
├── apps/
│   ├── web/          → Next.js 14 dashboard (port 3000)
│   ├── api/          → Express REST API (port 4000)
│   └── webhook/      → Webhook receiver + BullMQ worker (port 4001)
├── packages/
│   ├── database/     → Prisma schema (shared)
│   └── types/        → TypeScript types (shared)
├── .env.example      → Environment variable reference
└── SETUP.md          → This file
```

## Default Test Credentials (after seed)
- Email: `admin@example.com`
- Password: `password123`

---

## Troubleshooting

**"Cannot find module '@whatsapp-saas/database'"**
→ Run `pnpm install` from the root again. Workspace packages need to be linked.

**Prisma errors on db:push**
→ Make sure `DATABASE_URL` in `packages/database/.env` matches your Supabase URI exactly.

**Webhook verification fails**
→ Make sure `WEBHOOK_VERIFY_TOKEN` is the same string in both `apps/api/.env.local` and `apps/webhook/.env.local`.

**Meta says "callback URL unreachable"**
→ Your ngrok tunnel must be running and `WEBHOOK_CALLBACK_URL` must point to the current ngrok URL (it changes each restart on free tier — upgrade to a static domain or use Cloudflare Tunnel).
