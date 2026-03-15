# Deploy NoCarBuddy on Render (Free Tier)

This guide walks through hosting the full NoCarBuddy app (React frontend + Express API + PostgreSQL) on [Render](https://render.com) using the free tier.

## What you get on the free tier

- **Web Service**: 750 hours/month free. The service **spins down after 15 minutes of no traffic**; the first request after that may take 30–60 seconds to wake up.
- **PostgreSQL**: Free instance (90-day trial or 1 GB free tier depending on Render’s current offering). The database does not spin down.
- **Single app URL**: One URL serves both the frontend and the API (e.g. `https://nocarbuddy.onrender.com`).

## Prerequisites

- A [Render](https://render.com) account (GitHub login is easiest).
- This repo pushed to a **GitHub** (or GitLab) repository so Render can deploy from it.

---

## Step 1: Create a PostgreSQL database

1. In the [Render Dashboard](https://dashboard.render.com), click **New +** → **PostgreSQL**.
2. Choose a **Name** (e.g. `nocarbuddy-db`) and a **Region** close to you.
3. Under **Plan**, select **Free** (or the current free option).
4. Click **Create Database**.
5. When it’s ready, open the database and go to **Info** (or **Connections**). Copy the **Internal Database URL** (e.g. `postgresql://user:pass@host/dbname`). You will use this as `DATABASE_URL` for the web service.  
   - Prefer the **Internal** URL so traffic stays on Render’s network and doesn’t count against public egress.

---

## Step 2: Create a Web Service (backend + frontend)

1. In the Render Dashboard, click **New +** → **Web Service**.
2. Connect your **GitHub** (or GitLab) account if needed, then select the **NoCarBuddy** repository.
3. Configure the service:

   | Field | Value |
   |--------|--------|
   | **Name** | e.g. `nocarbuddy` (this becomes part of the URL) |
   | **Region** | Same as the database if possible |
   | **Branch** | `main` (or your default branch) |
   | **Runtime** | **Node** |
   | **Build Command** | `npm install && cd server && npm install && cd .. && npm run build` |
   | **Start Command** | `node server/server.js` |
   | **Instance Type** | **Free** |

4. Under **Environment**, add these variables (click **Add Environment Variable**):

   | Key | Value | Notes |
   |-----|--------|--------|
   | `NODE_ENV` | `production` | Required so the server serves the built frontend and uses production behavior. |
   | `DATABASE_URL` | *(paste Internal Database URL from Step 1)* | From your Render PostgreSQL instance. |
   | `JWT_SECRET` | *(long random string)* | Generate one (e.g. `openssl rand -hex 32`). Keep it secret. |
   | `ADMIN_USER` | *(your admin username)* | For the admin panel login. |
   | `ADMIN_PASSWORD` | *(strong password)* | For the admin panel. |

   Optional (for “set password” emails after signup):

   | Key | Value |
   |-----|--------|
   | `APP_BASE_URL` | `https://YOUR-SERVICE-NAME.onrender.com` | Replace with your actual Web Service URL. |
   | `SMTP_HOST` | Your SMTP server |
   | `SMTP_PORT` | e.g. `587` |
   | `SMTP_SECURE` | `false` (or `true` for 465) |
   | `SMTP_USER` | SMTP username |
   | `SMTP_PASS` | SMTP password |
   | `SMTP_FROM` | e.g. `noreply@yourdomain.com` |

   If you don’t set SMTP, the server will log the set-password link to the Render logs instead of sending email.

5. Click **Create Web Service**.

Render will run the build command (install root deps, install server deps, run `npm run build` to create the frontend in `dist/`), then start the app with `node server/server.js`. The server will:

- Use `DATABASE_URL` to connect to your PostgreSQL and create tables if needed.
- Serve the API under `/api` (e.g. `/api/users`, `/api/map-routes`, `/api/admin`).
- Serve the built React app and SPA fallback for all non-API routes.

---

## Step 3: Open the app

- Once the deploy finishes, open the URL Render shows (e.g. `https://nocarbuddy.onrender.com`).
- You should see the NoCarBuddy UI. Sign up, log in, and use the dashboard and admin panel as in local development.

---

## Build and start commands (reference)

- **Build**: `npm install && cd server && npm install && cd .. && npm run build`  
  - Installs root and server dependencies and builds the Vite frontend into `dist/`.
- **Start**: `node server/server.js`  
  - Must be run from the **repository root** so the server can find `dist/` and the root `.env` (if you add one; on Render you use the dashboard env vars).

---

## Environment variables summary

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes (for production) | Set to `production` on Render. |
| `DATABASE_URL` | Yes | PostgreSQL connection string from Render Postgres (Internal URL). |
| `JWT_SECRET` | Yes | Secret used to sign JWTs; use a long random string. |
| `ADMIN_USER` | Yes | Admin panel username. |
| `ADMIN_PASSWORD` | Yes | Admin panel password. |
| `APP_BASE_URL` | Optional | Public URL of the app (e.g. your Render Web Service URL) for set-password emails. |
| `SMTP_*` | Optional | Only needed if you want set-password emails sent via SMTP. |
| `CORS_ORIGIN` | Optional | Leave unset when frontend and API are on the same host (default behavior). |

See [config-env.md](config-env.md) for full configuration options.

---

## Free tier behavior and limits

- **Spin-down**: After ~15 minutes without requests, the Web Service goes to sleep. The next request will trigger a cold start (often 30–60 seconds). The database stays up.
- **Hours**: Free Web Services get 750 hours per month. One instance running 24/7 is about 720 hours, so you stay within the free tier with one app.
- **Database**: Free PostgreSQL may have a 90-day or size limit; check Render’s current docs. For longer-term free hosting, you may need to recreate the DB or switch plan later.

---

## Troubleshooting

- **Build fails**
  - Check the build log. Ensure **Build Command** is exactly as above and that both root and `server` dependencies install and `npm run build` runs from the repo root.
  - If you see “Cannot find module …”, ensure the dependency is in the right `package.json` (root vs. `server/`).

- **App shows “Cannot GET /” or blank page**
  - Confirm `NODE_ENV=production` is set so the server serves `dist/` and the SPA fallback.
  - Confirm **Start Command** is `node server/server.js` and that the build produced a `dist/` folder (check build logs).

- **Database connection errors**
  - Use the **Internal Database URL** from the Render PostgreSQL dashboard (not the external URL) so the Web Service and DB are on the same network.
  - Ensure `DATABASE_URL` is set in the Web Service environment and that there are no extra spaces or line breaks.

- **Admin or login not working**
  - Verify `JWT_SECRET`, `ADMIN_USER`, and `ADMIN_PASSWORD` are set. Cookies are set with `secure: true` in production; use HTTPS (Render provides it).

- **Cold starts**
  - Normal on the free tier. Consider pinging the service on a schedule (e.g. UptimeRobot) if you want it to stay warm, but that can use more of your 750 hours.

---

## Related docs

- [config-env.md](config-env.md) – Local setup and environment variables.
- [database.md](database.md) – Database schema and connection.
- [signup-and-admin.md](signup-and-admin.md) – Sign-up and admin panel behavior.
