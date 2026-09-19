# Rank S — Gym Management System (Nuxt 3 + MongoDB)

A full-stack rewrite of the Rank S gym management system using Nuxt 3 (Vue 3, Nitro server routes) and MongoDB (via Mongoose).

## Features

- **Accounts**: super admin, regular admin, and gym member, each with role-based pages and API access.
- **Super admin**: audit trail, login logs, create/modify/reset gym member accounts and credentials (QR code, barcode, PIN), rank threshold settings.
- **Regular admin**: create/modify/reset gym members, daily check-in monitoring, temporary receipts, QR/barcode/PIN issuing, POS.
- **Gym members**: PIN-based login, personal profile editing, points and rank progress.
- **Rank system**: F → E → D → C → B → A → S → SS → SSS, with editable point thresholds per rank, stored in MongoDB.
- **Check-in / login monitoring**: logs every member and walk-in entry, awards points, flags level-ups.
- **POS + inventory**: sells products, deducts stock live, restock controls.
- **Lobby monitor**: auto-refreshing second-screen page showing everyone checked in today with their rank.

## New: membership, fees, kiosk, and lobby display

- **Walk-in fee** and **points per check-in** are set on the Settings page (super admin).
- **Membership plans** page lets staff configure subscription price and per-visit fee for Student / Regular / Senior citizen members across Monthly / 6-month / Yearly / Lifetime durations — durations can be added, edited, or removed per category.
- On the **Gym members** page, use the "Membership" button on a member row to assign or renew their plan.
- Every check-in (staff-assisted or kiosk) automatically creates a `Receipt` for the visit fee, so it shows up in **Reports → Inventory sales** alongside POS product sales.
- If a member's membership has expired, they're still checked in and still earn points, but are billed at the walk-in rate instead — their profile is never deleted or blocked.
- **`/kiosk`** — a public, unauthenticated self-check-in screen (PIN entry for members, name entry for walk-ins). Open it on a tablet at the front door. It doesn't require a staff login.
- **`/lobby`** — a public, unauthenticated TV-display board that highlights the most recent arrival in large type, with a grid of recent check-ins below it. Auto-refreshes every 5 seconds.
- Staff get a dashboard notification banner for memberships that have expired or are expiring within 7 days.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment file and point it at your MongoDB instance:

   ```bash
   cp .env.example .env
   # edit .env: MONGODB_URI and JWT_SECRET
   ```

3. Seed the database with a super admin, a regular admin, and sample members/products:

   ```bash
   npm run seed
   ```

   This prints the seeded login credentials and sample member PINs to the console.

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`.

## Default accounts (after seeding)

- Super admin — `super` / `super123`
- Regular admin — `admin` / `admin123`
- Gym members — log in on the "Gym member" tab using the 4-digit PIN printed by the seed script.

## Project structure

```
server/
  api/                 Nitro API routes (auth, members, checkins, products, receipts, thresholds, audit, loginlogs)
  utils/
    db.ts              Mongoose connection (cached across hot reloads)
    auth.ts            JWT cookie session helpers, role guards
    helpers.ts         Audit logging, rank calculation, credential generation
    models/            Mongoose schemas: User, Member, Product, CheckIn, Receipt, AuditLog, LoginLog, Threshold
  seed.mjs             Seed script for demo data
pages/                 Nuxt pages (file-based routing)
components/            Sidebar, RankBadge
composables/useAuth.ts Session state, login/logout
middleware/auth.global.ts  Route guard + role-based redirects
layouts/default.vue    Sidebar layout shell
```

## Notes for production

- Replace the demo QR/barcode strings with a real scanning integration (e.g. a JS barcode/QR scanner library posting the scanned code to `/api/checkins`).
- Sessions use an httpOnly JWT cookie; rotate `JWT_SECRET` and use HTTPS in production.
- Add indexes as needed (unique indexes are already defined on `Member.qr`, `Member.barcode`, and `User.username`).
- Consider adding pagination to `/api/audit`, `/api/loginlogs`, and `/api/checkins` once data volume grows past the current 200–300 record limits.
