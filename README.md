<div align="center">

<img src="assets/banner.svg" alt="MonoPanel" width="100%" />

<br/>

# MonoPanel Panel

**The website, billing system, hosting control panel and Discord bot behind MonoPanel.**
<br/>
<sub>Sell Discord bot hosting and VPS hosting from one self-hosted platform. Black & white. Fast. Yours to edit.</sub>

<br/><br/>

[![License](https://img.shields.io/badge/license-MPOL--1.0-white?style=for-the-badge&labelColor=000000)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%E2%89%A522.13-white?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=000000)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12%2B-white?style=for-the-badge&logo=postgresql&logoColor=white&labelColor=000000)](https://www.postgresql.org)
[![React](https://img.shields.io/badge/React-19-white?style=for-the-badge&logo=react&logoColor=white&labelColor=000000)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-white?style=for-the-badge&logo=typescript&logoColor=white&labelColor=000000)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-white?style=for-the-badge&logo=vite&logoColor=white&labelColor=000000)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-white?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=000000)](https://tailwindcss.com)
[![PRs](https://img.shields.io/badge/PRs-welcome-white?style=for-the-badge&labelColor=000000)](CONTRIBUTING.md)

<br/>

[**Overview**](#-overview) ·
[**Preview**](#-preview) ·
[**Features**](#-features) ·
[**Architecture**](#-architecture) ·
[**Quick start**](#-quick-start) ·
[**Configuration**](#-configuration) ·
[**Deploy**](#-production-deployment) ·
[**Security**](#-security) ·
[**FAQ**](#-faq) ·
[**License**](#-license)

</div>

<br/>

---

## ◼ Overview

MonoPanel Panel is the full-stack web platform that runs a hosting business. One repository gives you:

- a public marketing site with live pricing, a status page, docs and legal pages
- customer accounts, credits, coupons, orders, support tickets and an in-dashboard inbox
- a **native hosting panel** (console, file manager, backups, databases, schedules, SFTP, team access) for Discord bots, apps and game servers
- a **native VPS panel** (deploy, power, SSH, web terminal, file manager, reinstall, renew)
- a **coin economy** where free users earn renewals by watching ads or visiting sponsor links
- a **Discord Manager Bot** that runs inside the same process and lets customers and staff manage services from Discord
- a full **admin console** with 40+ pages, audit logs and scoped REST API keys

Everything is stored in PostgreSQL. There is no external queue, cache or search service to set up.

<table>
<tr>
<td width="50%" align="center">

### 🤖 Discord Bot & App Hosting
Node.js, Python and other software images, Git deploys, always-on servers.

</td>
<td width="50%" align="center">

### 🖥️ VPS Hosting
Docker-backed VPSes with SSH, a browser terminal and your choice of OS image.

</td>
</tr>
</table>

> [!NOTE]
> This repository is the **panel** half of MonoPanel. Servers and VPSes actually run on the **MonoPanel daemon**, one agent per node. The panel never touches customer machines directly: it sends HMAC-signed requests to the daemon.

### The MonoPanel ecosystem

| Part | Repository | Job |
|---|---|---|
| **Panel** (this repo) | [`TeamMonoPanel/MonoPanel-Panel`](https://github.com/TeamMonoPanel/MonoPanel-Panel) | Website, accounts, billing, support, admin console, Discord bot |
| **Daemon** | [`TeamMonoPanel/MonoPanel-daemon`](https://github.com/TeamMonoPanel/MonoPanel-daemon) | One agent per node: runs customer servers and VPSes |
| **Installer** | [`TeamMonoPanel/MonoPanel-Installer`](https://github.com/TeamMonoPanel/MonoPanel-Installer) | Guided installer for the panel and daemon |

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
<br/><sub>Plans and prices pulled live from your catalogue</sub>

</td>
<td width="50%" align="center">

<img src="assets/preview-vps.png" alt="VPS Hosting page" width="100%" />

**VPS Hosting**
<br/><sub>Full root access, choose your OS image</sub>

</td>
</tr>
</table>

---

## ✦ Features

<details open>
<summary><b>🌐 Public website</b></summary>
<br/>

| | |
|---|---|
| **Home** | Black & white landing page with product cards, infrastructure section, stats and FAQ |
| **Live pricing** | Cards read prices and feature lists from your real plans, so the site never drifts from what you sell |
| **Product pages** | Dedicated **Bot Hosting**, **VPS Hosting** and **Pricing** pages |
| **Status page** | Incident tracking and scheduled maintenance |
| **Docs & legal** | Docs page plus editable legal pages (Terms, Privacy, ...) from **Admin → Legal Pages** |
| **Global search** | Command-palette style search across the site and dashboards |

</details>

<details open>
<summary><b>🧩 Native hosting panel (bots, apps, games)</b></summary>
<br/>

| Area | What customers get |
|---|---|
| **Create wizard** | Pick software, name, location and node; limits come from the plan |
| **Console** | Live console and command input, proxied by the panel so node addresses and secrets stay private |
| **Files** | Browse, edit, upload, download, bulk download, pull from a URL, recycle bin |
| **Backups** | Create, restore and delete backups (limit per plan) |
| **Databases** | One-click MySQL/MariaDB databases with password rotation (needs `DB_HOST_*`) |
| **Startup** | Per-image variables with validation rules (Git repo, branch, main file, extra packages, ...) |
| **Schedules** | Cron tasks (UTC) that send commands, change power state or take backups |
| **Team access** | Subusers with fine-grained permissions: `console.read`, `console.command`, `power`, `files.read`, `files.write`, `backups`, `schedules`, `addons`, `sftp`, `settings` |
| **SFTP** | Per-person credentials, optional read-only, only a scrypt hash is stored |
| **Addons** | Install plugins or starter templates from an addon store, refunded automatically if the node fails |
| **Switch node** | Move a server with all its files to another node: archive, checksum, signed stream, verify, switch, roll back on any failure |
| **Activity** | Per-server audit trail of every mutating action |

Seeded software images: **Node.js**, **Python**, **Static Website** and **Minecraft (Paper)**. Add your own under **Admin → Software Images**.

</details>

<details open>
<summary><b>🖥️ Native VPS panel</b></summary>
<br/>

- Plans with vCPU, RAM, disk and bandwidth, plus OS images (Ubuntu 20.04 / 22.04 / 24.04, Debian 11 / 12 out of the box, all editable)
- Deploy wizard with location, OS and name; instant deploy on payment or manual staff approval
- Power controls, live stats, SSH login details, root password reset, rename, **reinstall** and **renew**
- Browser **command runner**, **sshx** sessions and a **file manager**, each switchable from **Admin → VPS Settings**
- Node placement with RAM, disk and CPU ceilings, overallocation, per-node SSH port range and a drain switch
- Expiry reminders by mail, automatic stop on expiry, and deletion after a configurable grace period
- Every VPS order is linked to the normal billing order, so revenue lives in one place

</details>

<details open>
<summary><b>🔐 Accounts & authentication</b></summary>
<br/>

- Email and password sign-up and login
- **Google** sign-in (Firebase) and **Discord** OAuth, both optional
- Roles: `user` · `support` · `moderator` · `admin` · `super_admin`
- JWT sessions, bcrypt-hashed passwords, rate limiting, CORS allow-list and CSRF origin checks
- Optional **anti-abuse**: VPN / proxy / Tor / datacenter blocking through `proxycheck`, `ipqualityscore` or a custom provider, registration caps per IP and login lockouts

</details>

<details open>
<summary><b>💳 Billing & payments</b></summary>
<br/>

| Method | How it works |
|---|---|
| **Account credits** | Pay for plans, VPSes and upgrades from the customer's balance |
| **Stripe Checkout** | Plan purchases are confirmed by the **signed Stripe webhook**, never by the browser redirect |
| **UPI** | QR code or UPI ID, customer submits the transaction reference |
| **Bank transfer** | Customer submits the NEFT / IMPS / wire reference |
| **Crypto** | Wallet address and network of your choice, customer submits the TX hash |
| **Gift cards** | Amazon and Google Play codes, verified by staff |

Manual payments (UPI, bank, crypto, gift cards) are **verified by staff before credits are added**. Coupons support percent or fixed discounts and usage limits. Billing periods (monthly, 6 months, yearly, or your own) carry per-period discounts or hard price overrides.

> [!WARNING]
> Adding **credits by card** through the legacy top-up route is intentionally blocked server-side. Card payments go through Stripe Checkout on plan purchases only.

</details>

<details open>
<summary><b>🪙 Coin economy & renewals</b></summary>
<br/>

Free plans can stay free. Users earn a configurable coin currency (name it yourself) by watching ads, visiting sponsor links or claiming a daily bonus, then spend it in the **Store**:

| Store item | Effect |
|---|---|
| Spec upgrades | Temporary or permanent extra RAM, CPU or disk for one server |
| Renewals | Extend a server by N days |
| Temporary premium | Try a paid plan for a few days |
| Server packs | One extra server with its own specs |
| Server slots | Raise the account's server limit |

Renewal methods per plan: `ads`, `blog`, `coins`, `payment`. Servers stop when they expire and are **deleted 24 hours later** (a hard-coded constant, intentionally not configurable).

</details>

<details open>
<summary><b>🤖 Discord Manager Bot</b></summary>
<br/>

Enter the bot credentials in **Admin → Discord Bot**. The bot logs in inside the panel process, registers its slash commands and can auto-start with the panel.

| Category | Commands |
|---|---|
| **General** | `/help` `/ping` `/about` `/nodes` |
| **Account** | `/link` `/account` |
| **Hosting** | `/hosting plans` `software` `create` `list` `info` `power` `renew` `upgrade` `delete` |
| **VPS** | `/vps plans` `create` `list` `manage` `info` `power` `ssh` `resetpass` `rename` `renew` `reinstall` `exec` `logs` |
| **Staff** | `/admin lookup` `stats` `suspend` `unsuspend` `ban` `unban` `sync` |

Permission tiers are `customer`, `staff`, `admin` and `owner`, derived from the linked panel role, configured Discord role IDs and owner IDs. Secrets such as SSH logins are delivered by **direct message**. Replies use Discord's Components V2 layout. Prefix commands are available when the message-content intent is enabled.

</details>

<details open>
<summary><b>🛠️ Admin console</b></summary>
<br/>

<table>
<tr>
<td width="33%" valign="top">

**Hosting**
- Nodes
- Server Management
- Account Management
- Software Images
- Addon Store

**VPS Hosting**
- VPS Overview
- VPS Servers & Nodes
- VPS Plans & Orders
- OS Images
- VPS Settings & Activity

</td>
<td width="33%" valign="top">

**Plans & Revenue**
- Plans & Limits
- Expiry & Renewals
- Store & Economy
- Stripe Setup
- Orders & Payments
- Coupons

**Growth**
- Ad Center (12 placements)
- Announcements

</td>
<td width="33%" valign="top">

**Community**
- User Accounts
- Support Desk
- Mail (one user or broadcast, with read receipts)
- Discord Bot

**System**
- External Panel Link
- Appearance (themes & fonts)
- Legal Pages
- Audit Logs
- REST API Keys
- Platform Settings

</td>
</tr>
</table>

<div align="center">

<img src="assets/preview-admin-combined.png" alt="MonoPanel admin console: control plane menu and system overview" width="80%" />

</div>

<table>
<tr>
<td width="50%" align="center">

<img src="assets/preview-admin-menu.png" alt="Admin control plane menu" width="100%" />

**Control plane**
<br/><sub>Every admin tool in one sidebar</sub>

</td>
<td width="50%" align="center">

<img src="assets/preview-admin-overview.png" alt="System overview dashboard" width="100%" />

**System overview**
<br/><sub>Users, revenue, orders and tickets at a glance</sub>

</td>
</tr>
</table>

</details>

<details>
<summary><b>🔑 REST API keys</b></summary>
<br/>

Create keys under **Admin → API Keys** with a name, description, **scopes** (for example `users.read`, `users.manage`, `orders.read`, or `*`), an **IP allow-list** and an **expiry date**. Send them in the `X-API-Key` header.

</details>

### Role matrix

| Capability | `user` | `support` | `moderator` | `admin` | `super_admin` |
|---|:-:|:-:|:-:|:-:|:-:|
| Customer dashboard and panels | ✅ | ✅ | ✅ | ✅ | ✅ |
| Send mail (one / broadcast) | ➖ | ✅ | ✅ | ✅ | ✅ |
| Bot staff commands | ➖ | ✅ | ✅ | ✅ | ✅ |
| Admin console | ➖ | ⚙️ | ⚙️ | ✅ | ✅ |
| Bot admin commands, access during maintenance mode | ➖ | ➖ | ➖ | ✅ | ✅ |
| Bot owner tier | ➖ | ➖ | ➖ | ➖ | ✅ |

<sub>✅ full access · ⚙️ scoped by server-side role checks · ➖ none. Exact permissions are enforced in <code>server/auth.ts</code> and the route files.</sub>

---

## ✦ Architecture

```mermaid
flowchart LR
    subgraph Client["🖥️ Browser"]
        UI["React 19 + Tailwind 4<br/>Vite SPA"]
    end

    subgraph Panel["⚙️ MonoPanel Panel · Node.js 22 · Express 4 · TypeScript"]
        API["/api/v1/*"]
        SEC["JWT · roles · rate limits<br/>CORS · CSRF · API keys"]
        HOST["Hosting + VPS services<br/>schedulers · billing"]
        BOT["Discord Manager Bot"]
    end

    DB[("🗄️ PostgreSQL")]
    D1["🧱 MonoPanel daemon<br/>Node A"]
    D2["🧱 MonoPanel daemon<br/>Node B"]
    EXT["🔌 Stripe · Discord · Firebase<br/>IP-risk provider · MySQL host"]

    UI -->|HTTPS| API
    API --> SEC
    API --> HOST
    API --> DB
    HOST -->|"HMAC-signed HTTP"| D1
    HOST -->|"HMAC-signed HTTP"| D2
    HOST --> EXT
    BOT --> HOST
    BOT --> EXT
```

### How the panel talks to a daemon

Every request carries `X-Mono-Ts`, `X-Mono-Nonce` and `X-Mono-Sig`. The signature is an HMAC-SHA256 over the timestamp, a random nonce, the HTTP method, the path with query and the SHA-256 of the body, using a per-node secret that is stored **AES-GCM encrypted** in the database and never sent to the browser. Node-to-node transfers use a streaming variant where the payload checksum travels inside the signed URL.

One daemon can serve both server nodes (**Admin → Nodes**) and VPS nodes (**Admin → VPS Nodes**). If you register the same host and port in both places, the panel uses one shared secret.

### Order and payment lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant C as Customer
    participant P as MonoPanel
    participant S as Stripe
    participant A as Staff
    participant D as Daemon

    alt Stripe Checkout
        C->>P: Buy plan
        P->>S: Create Checkout session
        S-->>P: Signed webhook: paid
    else UPI / bank / crypto / gift card
        C->>P: Submit order and payment reference
        P-->>C: Order recorded as pending
        A->>P: Verify payment
    end
    P-->>C: Credits or plan applied, notification sent
    C->>P: Deploy server or VPS
    P->>D: Signed create request
    D-->>P: Installing, then running
```

### Server lifecycle

```mermaid
stateDiagram-v2
    [*] --> installing
    installing --> running
    installing --> install_failed
    running --> offline
    offline --> running
    running --> transferring: switch node
    transferring --> running
    running --> suspended: staff action
    suspended --> running: unsuspend
    running --> expired: expiry reached
    expired --> running: renewed
    expired --> [*]: deleted after 24 hours
```

### Tech stack

| Layer | Tools |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion, Lucide icons |
| **Backend** | Node.js ≥ 22.13, Express 4, TypeScript (run with `tsx`, bundled with `esbuild`) |
| **Storage** | PostgreSQL 12+ through a document store (`mp_docs`, `mp_maps`, `mp_kv`, `mp_meta`) |
| **Auth** | JSON Web Tokens, bcryptjs, Firebase (Google sign-in), Discord OAuth2 |
| **Integrations** | discord.js 14, Stripe (REST, no SDK), MySQL/MariaDB (`mysql2`), pg |

---

## ⚡ Quick start

> [!IMPORTANT]
> You need **Node.js 22.13 or newer**, **npm**, and a **PostgreSQL 12+** database. Install `postgresql-client` on the panel machine if you want the in-panel database backups (`pg_dump`).

<details open>
<summary><b>1 · Clone & install</b></summary>

```bash
git clone https://github.com/TeamMonoPanel/MonoPanel-Panel.git
cd MonoPanel-Panel
npm install
```

</details>

<details open>
<summary><b>2 · Create the database</b></summary>

```sql
CREATE USER monopanel WITH PASSWORD 'change-me';
CREATE DATABASE monopanel OWNER monopanel;
```

Tables are created automatically on first start.

</details>

<details open>
<summary><b>3 · Configure</b></summary>

```bash
cp .env.example .env
```

Set at least the database URL and your public URL:

```env
DATABASE_URL="postgres://monopanel:change-me@127.0.0.1:5432/monopanel"
APP_URL="http://localhost:3000"
```

`JWT_SECRET` and `APP_SECRET` can stay empty: strong values are generated into `data/.jwt_secret` and `data/.app_secret` (mode `600`). To set your own:

```bash
openssl rand -base64 48
```

> [!WARNING]
> **Back up `APP_SECRET` (or `data/.app_secret`).** It encrypts node secrets and Stripe keys in the database. Lose it and you must re-enter them.

**Default super admin** (created on first start only):

| | |
|---|---|
| Email | `admin@monopanel.com` |
| Password | `MonoPanelOPP` |

Set `MONOPANEL_ADMIN_EMAIL` and `MONOPANEL_ADMIN_PASSWORD` in `.env` **before the first start** to use your own.

> [!CAUTION]
> These defaults are public. Change the password right after your first login. The server logs a warning while the default is in use.

</details>

<details open>
<summary><b>4 · Run in development</b></summary>

```bash
npm run dev
```

Open **http://localhost:3000** and sign in. The API and the Vite dev server run in one process.

</details>

<details open>
<summary><b>5 · Build & run in production</b></summary>

```bash
npm run build
npm start
```

`npm run build` compiles the frontend with Vite and bundles the server to `dist/server.cjs`. Any `VITE_*` variable (Firebase) is read **at build time**, so set it before building. Put the app behind a reverse proxy for HTTPS (see [Production deployment](#-production-deployment)).

</details>

<details open>
<summary><b>6 · Add your first node</b></summary>

1. Install the **MonoPanel daemon** on a machine (see the daemon repository).
2. In **Admin → Nodes** (servers) or **Admin → VPS Nodes** (VPSes) add the node: public address, daemon host, daemon port (default `3002`), scheme and port range.
3. Run the command the panel shows on the node. It contains the node's secret.
4. Create plans, software images and OS images, then try a deploy as a normal user.

</details>

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the API and the Vite middleware with `tsx` |
| `npm run build` | Builds the frontend and bundles the server into `dist/` |
| `npm start` | Runs the production bundle |
| `npm run lint` | Type-checks the whole project (`tsc --noEmit`) |
| `npm run db:info` | Shows which database is in use and what is in it (stop the panel first) |
| `npm run clean` | Removes build output |

---

## ⚙ Configuration

All settings live in `.env` (see [`.env.example`](.env.example)). Most business settings (payments, plans, economy, branding) are changed from the admin console and stored in the database.

<details open>
<summary><b>Core</b></summary>

| Variable | Required | Description |
|---|:-:|---|
| `DATABASE_URL` | ✅ | `postgres://user:pass@host:5432/db`. The panel refuses to start without it. |
| `APP_URL` | ✅ prod | Public site URL. Used f
