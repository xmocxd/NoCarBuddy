# NoCarBuddy

React + Express full-stack app with a PostgreSQL backend. The UI is built with Vite and Tailwind CSS; the API runs in the `server/` folder.

## Quick start

Install dependencies (root and server), then start the app:

```bash
npm i
cd server && npm i && cd ..
npm start
```

This runs the React dev server and the Express API together via `concurrently`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run frontend and backend together |
| `npm run dev` | Run Vite dev server only |
| `npm run server` | Run Express server only |
| `npm run build` | Production build (Vite) |
| `npm run preview` | Preview production build |

## Requirements

- **Node.js** (current LTS or newer)
- **PostgreSQL** – user data is stored in a database. Create a DB (e.g. `createdb nocarbuddy`) and set `DATABASE_URL` in a `.env` file at the project root. See [docs/config-env.md](docs/config-env.md).

## Documentation

Project docs live in **docs/**:

- [docs/readme.md](docs/readme.md) – index of all docs  
- [config-env.md](docs/config-env.md) – setup, environment, and database connection  
- [database.md](docs/database.md) – database implementation and schema  
