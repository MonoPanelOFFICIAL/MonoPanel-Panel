<div align="center">

<img src="assets/banner.svg" alt="MonoPanel" width="100%" />

<br/>

**The website, billing system and admin panel behind MonoPanel — Discord Bot Hosting & VPS Hosting.**
<br/>
<sub>Black & white. Fast. Built to be run and edited by the people who host on it.</sub>

<br/><br/>

[![License](https://img.shields.io/badge/license-Attribution-white?style=for-the-badge&labelColor=000000)](LICENSE)
[![React](https://img.shields.io/badge/React-19-white?style=for-the-badge&logo=react&logoColor=white&labelColor=000000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-white?style=for-the-badge&logo=typescript&logoColor=white&labelColor=000000)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-white?style=for-the-badge&logo=vite&logoColor=white&labelColor=000000)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-white?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=000000)](https://tailwindcss.com)
[![Node](https://img.shields.io/badge/Node-%E2%89%A518-white?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=000000)](https://nodejs.org)
[![PRs](https://img.shields.io/badge/PRs-welcome-white?style=for-the-badge&labelColor=000000)](CONTRIBUTING.md)

<br/>

[**Preview**](#-preview) ·
[**Features**](#-features) ·
[**Quick start**](#-quick-start) ·
[**Architecture**](#-architecture) ·
[**Admin panel**](#-admin-panel) ·
[**Config**](#-configuration) ·
[**Deploy**](#-production-deployment) ·
[**Security**](#-security-checklist) ·
[**Contribute**](#-contributing)

</div>

<br/>

---

## ◼ What is MonoPanel?

MonoPanel is the full-stack web platform for **MonoPanel**. One repo gives you a public marketing site, customer accounts, a billing and order system, a support desk, an in-dashboard mail inbox and a complete admin panel — with **no external database to set up**.

It can sell up to five kinds of hosting. **You choose which ones in Admin → Hosting Types**; anything you leave off disappears from the whole site (home page, pricing, navigation, checkout, customer panel, admin menu and API), so you only ever sell what you actually run.

| Hosting type | What customers get |
| --- | --- |
| 🤖 **Bot Hosting** | Always-on bot processes: console, files, backups, Git deploys |
| 🖥️ **VPS Hosting** | Root SSH virtual servers with your OS images |
| 🌐 **Website Hosting** | Full-stack sites: front end + back end, free subdomain, custom domains with HTTPS, Git deploys |
| ⬢ **Node.js Hosting** | Node 20/22/24 apps with install/build tasks, Git deploy, live console |
| 🎵 **Lavalink Hosting** | Lavalink v4 nodes with generated config, plugin manager, live player stats and connection details |

Plans, pricing and features are pulled live from your product catalogue. `.env.example` starts with **all five** types switched on. Change the selection any time on the Hosting Types page: the website updates immediately for every visitor (no rebuild, no restart). An install with no `MONOPANEL_HOSTINGS` line keeps selling Bot + VPS only, as earlier versions did.

**Choosing the selection without the admin UI:** set `MONOPANEL_HOSTINGS="bot,nodejs,lavalink"` in `.env`. It is the starting selection; once an admin saves one on the Hosting Types page, that choice wins.

> [!NOTE]
> This repository is the **panel** half of MonoPanel: the website, billing system and admin panel. Every hosting type (bots, VPS, websites, Node.js, Lavalink) is run by the one **MonoPanel daemon** (the `daemon/` repository), one daemon per node. A node can be limited to some types with `NODE_SERVICES` / the node's *Services* setting. The panel never touches customer machines directly; it only sends signed requests to the daemon.

---

## ◼ Preview

<div align="center">

<img src="assets/preview-combined.png" alt="MonoPanel preview: Discord Bot Hosting and VPS Hosting pages" width="80%" />

</div>

<table>
<tr>
<td width="50%" align="center">

<img src="assets/preview-discord-bot.png" alt="Discord Bot Hosting page" width="100%" />

**Discord Bot Hosting**
<br/><sub>Node.js, Python, Bun & Go, always on</sub>

</td>
<td width="50%" align="center">

<img src="assets/preview-vps.png" alt="VPS Hosting page" width="100%" />

**VPS Hosting**
<br/><sub>Full root access, any OS image</sub>

</td>
</tr>
</table>

---

## ◼ At a glance

<table>
<tr>
<td align="center" width="25%"><h3>2</h3><sub>Products sold</sub></td>
<td align="center" width="25%"><h3>5</h3><sub>User roles</sub></td>
<td align="center" width="25%"><h3>1</h3><sub>Database: PostgreSQL</sub></td>
<td align="center" width="25%"><h3>4</h3><sub>Payment methods</sub></td>
</tr>
</table>

---

## ✦ Features

<details open>
<summary><b>🌐 Public website</b></summary>
<br/>

| | |
|---|---|
| **Home page** | Fully redesigned black & white layout: ticker, product cards, infrastructure section, stats, FAQ |
| **Live pricing** | Product cards read prices and feature lists from your real plans, so the site never drifts from what you sell |
| **Product pages** | Dedicated **Bot Hosting**, **VPS Hosting** and **Pricing** pages |
| **Status page** | Incident tracking and scheduled maintenance |
| **Docs & legal** | Docs page plus editable legal pages (Terms, Privacy, …) |

</details>

<details open>
<summary><b>🔐 Accounts & authentication</b></summary>
<br/>

- Email + password sign-up and login
- **Google** sign-in (Firebase) and **Discord** OAuth, both optional
- Role system: `user` · `support` · `moderator` · `admin` · `super_admin`
- JWT sessions, hashed passwords (bcryptjs), API rate limiting and a CORS allow-list
- Optional **VPN / proxy blocking** to reduce abuse

</details>

<details open>
<summary><b>👤 Customer dashboard</b></summary>
<br/>

| Area | What customers get |
|---|---|
| **Overview** | Account summary, credits balance, order history |
| **Billing & Checkout** | Add credits, place orders, redeem **coupons** |
| **Support Tickets** | Open and follow tickets with staff |
| **Mail** | In-dashboard inbox with unread counter, mark-all-read, delete |
| **Activity Log** | Account activity history |
| **Settings** | Link a Discord account, configure webhooks |
| **Quick Links** | One-click sidebar shortcuts to whatever you choose ([details](#-panel-integration--quick-links)) |

</details>

<details open>
<summary><b>💳 Billing</b></summary>
<br/>

Pay with **UPI**, **bank transfer**, **crypto** or **gift cards**.

Every manual payment is **verified by staff before credits are added**, so nothing is granted on trust. Coupons, orders and pending approvals are all managed from the admin panel.

> [!WARNING]
> Instant card payments are **not available**. The Stripe toggle exists as a placeholder only and is blocked server-side until a real processor is integrated.

</details>

<details open>
<summary><b>✉️ Mail</b></summary>
<br/>

A built-in inbox so you can message customers without leaving the platform.

- Staff (`support`, `moderator`, `admin`, `super_admin`) can message **one user** or **broadcast to everyone**
- Customers get an inbox with an **unread counter**
- Admins see every sent message with **read receipts** (e.g. `12/40 read`), grouped per broadcast

</details>

<details open>
<summary><b>🎨 Themes & fonts</b></summary>
<br/>

Ships with the **MonoPanel Black & White** theme. **Chakra Petch** for headings and the logo, **Quicksand** for body text. Switch themes and fonts from **Admin → Fonts & Themes**.

</details>

<details open>
<summary><b>💬 Discord integration</b></summary>
<br/>

Optional account linking plus account and billing notifications through a Discord bot and webhooks.

</details>

---

## ✦ Role matrix

| Capability | `user` | `support` | `moderator` | `admin` | `super_admin` |
|---|:-:|:-:|:-:|:-:|:-:|
| Customer dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send mail (one / broadcast) | ➖ | ✅ | ✅ | ✅ | ✅ |
| Admin panel access | ➖ | ⚙️ | ⚙️ | ✅ | ✅ |

<sub>✅ full access · ⚙️ scoped by the server's role checks · ➖ none. Exact permissions are enforced in <code>server/auth.ts</code>.</sub>

---

## ✦ Architecture

```mermaid
flowchart LR
    subgraph Client["🖥️ Browser"]
        UI["React 19 + Tailwind 4<br/>Vite SPA"]
    end

    subgraph Server["⚙️ Node.js · Express 4 · TypeScript"]
        API["/api/v1/*"]
        AUTH["JWT · roles · rate limit · CORS"]
        SVC["Discord bot · Webhooks"]
    end

    DB[("🗄️ PostgreSQL")]
    EXT["🔌 Google (Firebase)<br/>Discord OAuth<br/>VPN check API"]

    UI -->|HTTPS| API
    API --> AUTH
    API --> DB
    API --> SVC
    SVC --> EXT
    AUTH --> EXT
```

### Request lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer
    participant W as MonoPanel
    participant S as Staff (admin)
    C->>W: Create order / add credits (UPI, bank, crypto, gift card)
    W-->>C: Order recorded as pending
    W->>S: Appears in Orders & Billing queue
    S->>W: Verify payment
    W-->>C: Credits added, notification sent
```

### Tech stack

| Layer | Tools |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion, Lucide icons |
| **Backend** | Node.js, Express 4, TypeScript (run with `tsx`) |
| **Storage** | **PostgreSQL** only (`DATABASE_URL`), like Pterodactyl and Jexactyl. No SQLite, no JSON files |
| **Auth** | JSON Web Tokens, bcryptjs, Firebase (Google sign-in), Discord OAuth2 |
| **Integrations** | discord.js 14 |

---

## ✦ Panel + daemon

| Part | Folder | Job |
|---|---|---|
| **Panel** (this repo) | `panel/` | Website, accounts, billing, support, admin panel |
| **Daemon** | `daemon/` | One agent per node: runs customer servers and customer VPSes |

The panel talks to every daemon over HMAC-signed HTTP. There is **no installer yet**: set up the panel with the quick start below and the daemon by hand (see the daemon README).

---

## ✦ Admin panel

<div align="center">

<img src="assets/preview-admin-combined.png" alt="MonoPanel admin panel: control plane menu and system overview" width="80%" />

</div>

<table>
<tr>
<td width="50%" align="center">

<img src="assets/preview-admin-menu.png" alt="Admin control plane menu" width="100%" />

**Admin control plane**
<br/><sub>Every admin tool in one sidebar</sub>

</td>
<td width="50%" align="center">

<img src="assets/preview-admin-overview.png" alt="System overview dashboard" width="100%" />

**System overview**
<br/><sub>Users, revenue, orders and tickets at a glance</sub>

</td>
</tr>
</table>

<table>
<tr>
<td width="33%" valign="top">

**People**
- User Accounts
- Support Queue
- Mail Center

</td>
<td width="33%" valign="top">

**Commerce**
- Products & Plans
- Orders & Billing
- Coupons

</td>
<td width="33%" valign="top">

**Platform**
- System Overview
- Announcements
- Discord Integration
- Fonts & Themes
- Audit Trail
- REST API Keys
- Legal & Policies
- Platform Settings
- Panel Integration

</td>
</tr>
</table>

**System Overview** shows total users, total revenue (with the last 30 days), orders with pending approvals, and support tickets awaiting a reply. **Quick Actions** jump straight to pending orders, open tickets and coupons, and **User Snapshot** splits accounts into total, active and suspended.

### 🔗 Panel Integration & Quick Links

**Admin → Panel Integration** lets you add, edit and remove **Quick Links** (label + URL, up to **12**), for example a Discord bot panel, a VPS panel or a status page.

- Links that have a URL appear in every customer's dashboard sidebar and open in a new tab
- Optional **auto-provisioning** (Pterodactyl / Pelican-compatible panel via API) is available under *Advanced* and is **off by default**

---

## ⚡ Quick start

> [!IMPORTANT]
> Requires **Node.js 18+** and **npm**.

<details open>
<summary><b>1 · Clone & install</b></summary>

```bash
git clone <your-panel-repo-url> monopanel-panel
cd monopanel-panel
npm install
```

</details>

<details open>
<summary><b>2 · Configure</b></summary>

```bash
cp .env.example .env
```

Create the PostgreSQL database (12+) and point the panel at it. MonoPanel has no embedded database, like Pterodactyl and Jexactyl:

```sql
CREATE USER monopanel WITH PASSWORD 'change-me';
CREATE DATABASE monopanel OWNER monopanel;
```

```env
DATABASE_URL="postgres://monopanel:change-me@127.0.0.1:5432/monopanel"
```

Set at least `JWT_SECRET` **before the first start**:

```env
JWT_SECRET="a-long-random-string"
```

Generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Default admin account** (created on first start only):

| | |
|---|---|
| Email | `admin@monopanel.com` |
| Password | `MonoPanelOPP` |

To use your own, set `MONOPANEL_ADMIN_EMAIL` and `MONOPANEL_ADMIN_PASSWORD` in `.env` before the first start.

> [!CAUTION]
> These defaults are public. **Change the password right after your first login**, or set your own values in `.env`. The server logs a warning while the default password is in use.

</details>

<details open>
<summary><b>3 · Run in development</b></summary>

```bash
npm run dev
```

Open **http://localhost:3000** and sign in with the admin account from your `.env`.

</details>

<details open>
<summary><b>4 · Build & run in production</b></summary>

```bash
npm run build
npm start
```

The server listens on port **3000**. Put it behind a reverse proxy for HTTPS and set `APP_URL` and `ALLOWED_ORIGINS` to your public domain.

</details>

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API and the Vite dev server together |
| `npm run build` | Builds the frontend and bundles the server into `dist/` |
| `npm start` | Runs the production build |
| `npm run lint` | Type-checks the whole project (`tsc --noEmit`) |
| `npm run clean` | Removes build output |

---

## ⚙ Configuration

| Variable | Required | Description |
|---|:-:|---|
| `JWT_SECRET` | ✅ | Secret used to sign login tokens. Use a long random value. |
| `MONOPANEL_ADMIN_EMAIL` | ➖ | Email of the first super admin. Default `admin@monopanel.com`. |
| `MONOPANEL_ADMIN_PASSWORD` | ➖ | Password of the first super admin. Default `MonoPanelOPP`, change it after first login. |
| `APP_URL` | ✅ prod | Public URL of your site, used for OAuth callbacks. |
| `ALLOWED_ORIGINS` | ✅ prod | Comma-separated list of allowed CORS origins. |
| `MONOPANEL_INSTALLATION_ID` / `MONOPANEL_INSTALLATION_SECRET` | ➖ | Identity keys for this installation. |
| `TRUST_PROXY` | ➖ | Set to `false` if you are **not** behind a reverse proxy. |
| `VPN_CHECK_API_KEY` | ➖ | Key for the VPN/proxy detection provider. |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` / `DISCORD_REDIRECT_URI` | ➖ | Enables Discord OAuth login. |
| `DISCORD_BOT_TOKEN` | ➖ | Enables the Discord bot integration. |
| `VITE_FIREBASE_*` | ➖ | Firebase web-app credentials for Google sign-in. |
| `PORT` | ➖ | HTTP port (default `3000`). |
| `DATABASE_URL` | ✅ | `postgres://user:pass@host:5432/db`. The panel will not start without it. |
| `DATABASE_SSL` / `DATABASE_SSL_CA` | ➖ | `disable`, `require`, `verify` or `no-verify`, and an optional CA file. |
| `DATABASE_POOL_MAX` / `DATABASE_TABLE_PREFIX` | ➖ | Pool size (default 5) and table prefix (default `mp_`). |
| `NODE_ENV` | ➖ | `development` or `production`. |

---

## 🚀 Production deployment

<details>
<summary><b>Nginx reverse proxy</b></summary>

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # ssl_certificate / ssl_certificate_key via certbot

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

</details>

<details>
<summary><b>Caddy (automatic HTTPS)</b></summary>

```caddy
your-domain.com {
    reverse_proxy 127.0.0.1:3000
}
```

</details>

<details>
<summary><b>Keep it running with systemd</b></summary>

```ini
# /etc/systemd/system/monopanel.service
[Unit]
Description=MonoPanel
After=network.target

[Service]
WorkingDirectory=/opt/monopanel-panel
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production
User=monopanel

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now monopanel
```

</details>

<details>
<summary><b>Keep it running with PM2</b></summary>

```bash
npm i -g pm2
npm run build
pm2 start npm --name monopanel -- start
pm2 save && pm2 startup
```

</details>

---

## 🛡 Security checklist

- [ ] Set a long random `JWT_SECRET`
- [ ] Change the default admin password (`MonoPanelOPP`) right after first login, or set your own `MONOPANEL_ADMIN_EMAIL` / `MONOPANEL_ADMIN_PASSWORD`
- [ ] Serve over **HTTPS** and set `APP_URL` + `ALLOWED_ORIGINS` to your real domain
- [ ] Set `TRUST_PROXY=false` if you are not behind a reverse proxy
- [ ] Make sure `.env` and `data/` are **git-ignored** and never committed
- [ ] Back up the database on a schedule (`pg_dump` / point-in-time recovery / your provider's snapshots)
- [ ] Verify every manual payment before approving credits

---

## 🗄 Database & backups

MonoPanel stores **everything** in PostgreSQL (12+). There is no embedded SQLite mode and no JSON database file.

**Setup:** create an empty database and user, set `DATABASE_URL` in `.env`, start the panel. Tables (`mp_docs`, `mp_maps`, `mp_kv`, `mp_meta`) are created automatically.

```sql
CREATE USER monopanel WITH PASSWORD 'change-me';
CREATE DATABASE monopanel OWNER monopanel;
```

| | |
|---|---|
| Backups | **Admin → Hosting → Database → Back up** runs `pg_dump` and saves a compressed `.sql.gz` in `data/backups/` (needs the `postgresql-client` package on the panel machine). For production also use WAL archiving / point-in-time recovery or your provider's snapshots. |
| Restore | `gunzip -c data/backups/<file>.sql.gz \| psql "$DATABASE_URL"` with the panel stopped |

**Rules:** only **one** panel process may use a database (it keeps its working set in memory), so a second instance is refused on purpose. With PgBouncer, connect the panel directly or use *session* pooling, because transaction pooling cannot hold that lock. Every save is a single transaction that writes only the changed rows; if the database is unreachable, writes retry every 5 seconds and nothing is lost while the panel stays up.

**Tools** (stop the panel first):

```bash
npm run db:info    # which database is in use and what is in it
```

> [!CAUTION]
> Never commit `.env` or any database dump.

---

## 🗂 Project structure

```text
MonoPanel/
├── server.ts                # Express entry point (API + Vite middleware)
├── server/
│   ├── db.ts                # PostgreSQL-backed working set, defaults and migrations
│   ├── auth.ts              # Auth middleware and role checks
│   ├── discordService.ts    # Discord bot
│   ├── webhookService.ts    # Outgoing webhooks
│   └── routes/              # admin, auth, billing, mail, support, status, public, ...
├── src/
│   ├── App.tsx              # Page routing and layout
│   ├── index.css            # Theme tokens: fonts and the black & white colour ramp
│   ├── types.ts             # Shared TypeScript types
│   ├── components/          # Navbar, Footer, Sidebar, logo, ...
│   ├── lib/                 # Theme, branding and auth contexts, API helper
│   └── pages/
│       ├── public/          # Home, Bot Hosting, VPS Hosting, Pricing, Status, Docs
│       ├── auth/            # Login, Register
│       ├── customer/        # Dashboard, Billing, Checkout, Mail, Tickets, Settings
│       └── admin/           # Every admin page
├── public/                  # Logos and favicon
└── data/                    # Runtime files (uploads, backups, generated key files), never committed. The database is PostgreSQL
```

### API surface

Everything lives under **`/api/v1/`**:

| Namespace | Purpose |
|---|---|
| `auth` | Sign-up, login, OAuth |
| `billing` | Orders, credits, coupons |
| `support` | Tickets |
| `mail` | Inbox and broadcasts |
| `admin` | Admin panel operations |
| `public` | Public site data (plans, branding) |
| `discord` | Discord linking and integration |
| `status` | Incidents and maintenance |
| `api-keys` | REST API keys |
| `ads` | Ad campaigns |

---

## ❓ FAQ

<details>
<summary><b>Do I need to install a database?</b></summary>
<br/>
Yes. MonoPanel needs a PostgreSQL 12+ database (like Pterodactyl and Jexactyl need theirs). Create an empty database and user, then set <code>DATABASE_URL</code> in <code>.env</code>. The tables are created automatically on first start.
</details>

<details>
<summary><b>Can customers pay by card?</b></summary>
<br/>
Not yet. The Stripe toggle is a placeholder and is blocked server-side. Payments are UPI, bank transfer, crypto or gift cards, verified by staff.
</details>

<details>
<summary><b>How do servers and VPSes get created?</b></summary>
<br/>
By the MonoPanel daemon on each node. Add the node under <i>Admin → Nodes</i> (servers) or <i>Admin → VPS Nodes</i> (VPSes), then run the command the panel shows on the node. If you register the same address in both places, the panel uses one shared secret. Optional panel auto-provisioning (Pterodactyl / Pelican-compatible) is off by default and lives under <i>Advanced</i> in Panel Integration.
</details>

<details>
<summary><b>How do I change the look?</b></summary>
<br/>
Use <b>Admin → Fonts & Themes</b> for themes and fonts, or edit the colour tokens in <code>src/index.css</code>.
</details>

---

## 🤝 Contributing

Contributions are very welcome. Read **[CONTRIBUTING.md](CONTRIBUTING.md)** for the fork-and-pull-request guide.

```bash
git checkout -b feature/my-change
npm run lint          # must pass
git commit -m "feat: describe your change"
git push origin feature/my-change
```

---

## 📜 License

Released under the **MonoWeb Attribution License**. See [LICENSE](LICENSE).

| | |
|---|---|
| ✅ **You can** | Use it, modify it, rebrand it, host it and sell services with it |
| ⚠️ **You must** | Credit **Srccodeusr** for the source code and the overall website code |
| ❌ **You can't** | Remove the credit, claim you wrote the original, or imply endorsement |

**Required credit** for any repo or website built on MonoWeb:

```text
Built on MonoWeb by Srccodeusr
https://github.com/Srccodeusr/MonoWeb
```

Running a site? Show **"Powered by MonoWeb by Srccodeusr"** (linked to the repo) in the footer or on a Credits page.

> [!NOTE]
> MonoWeb is built on the open-source **AetherPanel** project (MIT). The original MIT notice is preserved inside the license file and still applies to that code.

<div align="center">

<br/>

<sub>◼ &nbsp; MonoPanel &nbsp; ◼</sub>

</div>
