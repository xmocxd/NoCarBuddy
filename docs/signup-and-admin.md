# User sign-up and admin panel

This document describes the **user sign-up process** (and related flows) and the **admin panel**: how they work and where they are implemented.

---

## User sign-up process

### Overview

1. User fills out the sign-up form (email, first name, last name, terms).
2. The server creates a user record and sends an email with a one-time “set your password” link (valid 30 minutes).
3. User clicks the link, sets a password, and can then log in with email + password and use the dashboard.

### Step-by-step flow

| Step | What happens |
|------|----------------|
| 1. Sign up | User visits **Sign Up** (`/signup/`), enters email, first name, last name, and agrees to terms. Frontend sends `POST /api/users` with `{ email, firstName, lastName, state: 'pending' }`. |
| 2. Create user + email | Server inserts a row in the `users` table, generates a secure random token and 30-minute expiry, stores them in the user’s `body` (JSONB), and sends an email with a link: `{APP_BASE_URL}/set-password/?token=...`. If SMTP is not configured, the link is logged to the server console. |
| 3. Set password | User opens the link and lands on **Set password** (`/set-password/?token=...`). The page calls `GET /api/set-password/validate/:token` to check the token; if valid, the user submits a new password via `POST /api/set-password` with `{ token, password }`. Server hashes the password, saves it in the user’s `body`, and removes the one-time token. |
| 4. Log in | User goes to **Log In** (`/login/`), enters email and the password they just set. `POST /api/users/login` verifies credentials, then sets an httpOnly JWT cookie. |
| 5. Dashboard | User is redirected to **Dashboard** (`/dashboard/`). The page calls `GET /api/users/me` (cookie sent automatically); the server returns the user’s profile and the UI shows a personalized welcome. |

### Implementation (backend)

- **User creation and set-password email**  
  `server/routes/users.js`: `POST /` creates the user, generates the token and expiry, updates the user’s `body`, and calls `server/email.js` to send the email. Token and expiry are stored as `passwordSetToken` and `passwordSetTokenExpiresAt` in the user’s JSONB `body`.

- **Set-password API**  
  `server/routes/setPassword.js`:
  - `GET /set-password/validate/:token` – checks that the token exists and has not expired; returns `{ valid: true, email }` or `{ valid: false }`.
  - `POST /set-password` – body `{ token, password }`; validates token, hashes password with bcrypt, updates the user’s `body` with `passwordHash` and removes the one-time token fields.

- **Email**  
  `server/email.js`: uses nodemailer and SMTP env vars (`SMTP_HOST`, `SMTP_PORT`, etc.). See [config-env.md](config-env.md) for optional email configuration. Without SMTP, the app still runs and logs the set-password link.

- **User login and profile**  
  `server/routes/users.js`: `POST /users/login` (email + password, bcrypt compare, JWT cookie), `GET /users/me` (auth middleware, returns safe profile), `POST /users/logout` (clears cookie).

### Implementation (frontend)

- **Sign up** – `src/components/SignUpPage.jsx`: form posts to `/api/users`, then redirects to confirmation with a “check your email” message.
- **Set password** – `src/components/SetPasswordPage.jsx`: reads `token` from the URL, validates with the API, shows password form, submits to `/api/set-password`, then redirects to confirmation.
- **Log in** – `src/components/LoginPage.jsx`: email + password to `/api/users/login` with `withCredentials: true`; on success, redirect to `/dashboard/`.
- **Dashboard** – `src/components/DashboardPage.jsx`: on load, `GET /api/users/me` with credentials; if 401/403, redirect to `/login/`; otherwise show “Welcome, {firstName}!” and Log out.

### Data stored for sign-up

- **Database**: One `users` table (see [database.md](database.md)). Each row has `id`, `state`, and `body` (JSONB). Sign-up stores in `body`: `email`, `firstName`, `lastName`; after the set-password email, also `passwordSetToken` and `passwordSetTokenExpiresAt`; after the user sets a password, those two are removed and `passwordHash` is added.

---

## Admin panel

### Overview

The admin panel lets an administrator log in with credentials defined in the environment, then view the list of registered users and perform actions (deactivate, delete). Access is protected by a JWT stored in an httpOnly cookie (same cookie name as user login; logging in as admin or user overwrites the other session).

### Admin login

- **UI**: **Administrator Login** is linked from the home page (`/admin/` → redirect to `/admin/login` if not authenticated). `src/components/AdminLoginPage.jsx` submits username and password to the API.
- **API**: `server/routes/admin.js` – `POST /admin/login` with body `{ userName, password }`. Credentials are compared to `ADMIN_USER` and `ADMIN_PASSWORD` (from env). Password is compared using bcrypt (hash cached at startup). On success, a JWT is signed with payload `{ userName }` (1-hour expiry) and set in an httpOnly cookie named `jwt`.
- **Config**: Set `ADMIN_USER` and `ADMIN_PASSWORD` in `.env`; see [config-env.md](config-env.md).

### Admin page (after login)

- **UI**: `src/components/AdminPage.jsx`. On load it calls `GET /api/admin/check` with credentials. If that returns 401, the user is redirected to `/admin/login`. Otherwise the page is shown.
- **API**:
  - `GET /admin/check` – protected by `auth` middleware; verifies the JWT cookie and returns `{ ok: true, user }`. Used to confirm the visitor is an admin.
  - `GET /api/users` – list all users (also protected by `auth`; in this app the same JWT is used for admin, and the list endpoint is intended for admin use).
  - `PUT /api/users/:id` – update a user (e.g. set `state` to `'deactivated'`).
  - `DELETE /api/users/:id` – delete a user.
- **Actions**:
  - **Deactivate**: sets the user’s `state` to `'deactivated'` via `PUT /api/users/:id`. Only shown when user is `active`.
  - **Delete**: removes the user via `DELETE /api/users/:id`. Shown when user is `pending` or `deactivated`.
  - **Logout**: `POST /api/admin/logout` clears the `jwt` cookie and redirects to home.

### Implementation summary

| Piece | Location |
|-------|----------|
| Admin login API | `server/routes/admin.js` – `POST /login`, bcrypt compare, JWT cookie |
| Admin check | `server/routes/admin.js` – `GET /check` (auth middleware) |
| Admin logout | `server/routes/admin.js` – `POST /logout` (clear cookie) |
| Auth middleware | `server/middleware/auth.js` – reads `jwt` cookie, verifies JWT, sets `req.user` |
| Admin UI | `src/components/AdminLoginPage.jsx`, `src/components/AdminPage.jsx` |
| User list/update/delete | `server/routes/users.js` – `GET /`, `PUT /:id`, `DELETE /:id` (all use same auth middleware) |

Admin credentials are not stored in the database; they come only from environment variables.
