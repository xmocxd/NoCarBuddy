# User dashboard, recording, and viewing routes

This document describes the **user dashboard** (the main page after login), **recording a map route**, and **viewing a single route**.

---

## User dashboard page

### Overview

The dashboard is the first page shown after a user logs in. It lists the user’s recorded map routes in a table and provides actions to edit a route name, delete a route, open a route to view details, or start recording a new route.

### What the dashboard shows

- **Welcome message** – “Welcome, {firstName}!” (or email if no first name). The display name comes from `GET /api/users/me`.
- **Routes table** – Each row is one map route with:
  - **Route name** – Clickable link to the “view route” page (`/dashboard/route/:id`).
  - **Time/date recorded** – When the route was recorded (short date and time).
  - **Duration** – Recording length in `HH:MM:SS` (from `durationSeconds` in the DB).
  - **Edit** – Pencil button to inline-edit the route name (Save/Cancel).
  - **Delete** – Trash button; confirms then deletes the route.
- **Record New Route** – A large “+” button at the bottom that links to `/dashboard/record` to start a new recording.

### APIs used by the dashboard

| Action | API | Description |
|--------|-----|-------------|
| Load profile + routes | `GET /api/users/me`, then `GET /api/map-routes` | Both use the httpOnly JWT cookie (`withCredentials: true`). Profile is used for the welcome text; map-routes list fills the table. |
| Save edited name | `PUT /api/map-routes/:id` | Body: `{ name }`. Only the name is updated. |
| Delete route | `DELETE /api/map-routes/:id` | Removes the route. Returns 204. |

If `GET /api/users/me` returns 401 or 403, the user is redirected to `/login/`.

### Implementation

- **Frontend**: `src/components/DashboardPage.jsx`. On mount it calls `fetchData()` (me + map-routes). Edit state is local (`editingId`, `editingName`); saving and deleting call the API then `fetchData()` to refresh the table.
- **Backend**: User profile from `server/routes/users.js` (`GET /users/me`). Map routes from `server/routes/mapRoutes.js`: `GET /map-routes` (list), `PUT /map-routes/:id` (update name), `DELETE /map-routes/:id` (delete). All map-route endpoints require a valid **user** JWT (not admin) and scope by `req.user.userId`. See [database.md](database.md) for the `map_routes` table schema.

---

## Recording a route

### Overview

Recording is done on a dedicated page. When the user opens it, recording starts automatically: a live duration timer runs and the route is given an auto-generated name. The user can edit the name on the page, then either **Stop** (save and stay on the page) or **Exit** (save and return to the dashboard). No separate “name your route” dialog is shown; the name is taken from the displayed (possibly edited) value.

### Flow

| Step | What happens |
|------|----------------|
| 1. Open record page | User goes to **Record route** via the “+” button on the dashboard (`/dashboard/record`). The page checks auth with `GET /api/users/me`; if 401/403, redirect to login. |
| 2. Auto-start | Once allowed, recording starts automatically: an auto name is set (e.g. “Walk at 2026-3-14-12:30”), a 1-second interval updates the duration display, and the route name is shown in a prominent box with an **Edit** (pencil) button. |
| 3. Optional edit name | User can click Edit, change the name in the inline field, then Save or Cancel. The current name (or in-progress edit) is used when saving. |
| 4. Stop or Exit | **Stop recording** – Stops the timer, saves the route with the current name and duration via `POST /api/map-routes`, then stays on the page (timer and name reset). **Exit** – Same save, then navigates to `/dashboard/`. |

### Data saved when recording

The record page sends a single `POST /api/map-routes` with:

- `name` – The displayed route name (auto or user-edited).
- `recordedAt` – ISO timestamp (from when recording started).
- `points` – Empty array for now (future: GPS points).
- `durationSeconds` – Elapsed seconds when Stop or Exit was clicked.

The backend stores this in the `map_routes` table (see [database.md](database.md)).

### Implementation

- **Frontend**: `src/components/RecordRoutePage.jsx`. Auth check on mount; a ref (`hasAutoStartedRef`) ensures the timer starts only once. Route name state is `routeName`; optional inline edit uses `editingName` and `editingNameValue`. `saveRoute('stop')` or `saveRoute('exit')` posts to the API and then either resets local state or navigates.
- **Backend**: `server/routes/mapRoutes.js` – `POST /map-routes` accepts `name`, `recordedAt`, `points`, `durationSeconds` and inserts a row scoped to the current user.

---

## Viewing a route

### Overview

From the dashboard, the user can click a route’s **name** to open a “view route” page that shows that route’s details from the database. The page displays the stored fields and a **Back to Dashboard** button.

### Flow

| Step | What happens |
|------|----------------|
| 1. Open view page | User clicks a route name on the dashboard, which links to `/dashboard/route/:id`. The view page reads `id` from the URL. |
| 2. Load route | The page calls `GET /api/map-routes/:id` with credentials. The API returns the route only if it belongs to the current user; otherwise 404. |
| 3. Display or error | If the route is found, the page shows: name, recorded at (date/time), duration (HH:MM:SS), and number of points recorded. If the request fails (e.g. 404 or 401), an error message is shown and a “Back to Dashboard” link is still available. 401/403 trigger redirect to login. |

### APIs used

| Action | API | Description |
|--------|-----|-------------|
| Load single route | `GET /api/map-routes/:id` | Returns one route by id, scoped to the current user. 404 if not found or not owner. |

### Implementation

- **Frontend**: `src/components/ViewRoutePage.jsx`. Uses `useParams()` for `id`, fetches with `GET /api/map-routes/${id}`. Renders a definition list of route fields and a “Back to Dashboard” link to `/dashboard/`.
- **Backend**: `server/routes/mapRoutes.js` – `GET /map-routes/:id` selects the row where `id = :id` and `user_id = req.user.userId`, returns the same shape as list items (id, userId, name, recordedAt, points, durationSeconds, and metrics when present).

---

## Summary

| Piece | Location |
|-------|----------|
| Dashboard UI | `src/components/DashboardPage.jsx` |
| Record route UI | `src/components/RecordRoutePage.jsx` |
| View route UI | `src/components/ViewRoutePage.jsx` |
| Map routes API | `server/routes/mapRoutes.js` – GET /, GET /:id, POST /, PUT /:id, DELETE /:id |
| User profile (dashboard welcome) | `server/routes/users.js` – GET /users/me |

Routes are stored in the `map_routes` table; see [database.md](database.md) for the schema.
