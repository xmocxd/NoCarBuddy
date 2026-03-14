# Setup / Configuration / Environment

The project uses `concurrently` to run the front end and back end server for development.

The express server is scoped within the server/ folder, and has its own `npm` package.  Both sets of dependencies have to be installed in before running the app.

## First Time Setup

1. Set up the database - install postgres if needed, then create the db

```
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo service postgresql start
sudo -u postgres psql
```

Inside psql, create a user and the db:

```
CREATE ROLE your_username WITH LOGIN SUPERUSER PASSWORD 'your_password';
CREATE DATABASE nocarbuddy;
\q
```

*NOTE: if you use a numeric password such as 1234, the server may crash on startup with 'client password must be a string' -- make sure to use an alphanumeric password*


2. Add the database connection info to `.env` file in the project root.   *NOTE: SASL SCRAM may prevent server startup if a single line connection string is used -- do not use.*
Also add a JWT_SECRET for development purposes.
Also add admin user name and password for user management.

```
PGUSER="test"
PGPASSWORD="test"
PGHOST="localhost"
PGPORT=5432
PGDATABASE="nocarbuddy"

JWT_SECRET="test-secret"

ADMIN_USER="admin"
ADMIN_PASSWORD="admin"
```

**Optional – Set-password email (after sign up):**  
If you want the app to send a “set your password” email when users sign up, set SMTP and base URL:

```
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-smtp-user"
SMTP_PASS="your-smtp-password"
SMTP_FROM="noreply@yourdomain.com"
APP_BASE_URL="http://localhost:5173"
```

- `APP_BASE_URL` is the public URL of the frontend (used for the link in the email). Defaults to `http://localhost:5173` if not set.
- If `SMTP_HOST` and `SMTP_PORT` are not set, the server still runs; it will log the set-password link to the console instead of sending email (handy for local testing).

The server creates the `users` table automatically on startup if it does not exist.

**To install and start the project:**

Make sure `nodemon` is installed:

```
npm install -g nodemon
```

Start server:
```
npm i
cd server
npm i
cd ..
npm start
```

`npm start` will run both the react and express server using `concurrently`.


## Vite Config

Vite config uses a proxy to forward API requests to the Express server during development.

- This sends any requests starting with `/api` to `http://localhost:3000` (the Express server), while allowing other requests to pass through to the react server.
- A rewrite function is used to remove the `/api` prefix before forwarding the request to the Express server.
- usePolling is enabled to support running under the server under WSL.


from `vite.config.js`:

```
server: {
    proxy: {
        '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
        }
    },
    watch: {
        usePolling: true
    },
},
```



## `npm` Commands


## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run frontend and backend together |
| `npm run dev` | Run Vite dev server only |
| `npm run server` | Run Express server only |
| `npm run server-dev` | Run Express server with `nodemon -L` (required under WSL for file watching) |
| `npm run build` | Production build (Vite) |
| `npm run preview` | Preview production build |

*Note: When running under WSL, `nodemon` must be started with the `-L` flag (legacy watch mode) for file watching to work correctly. The `server-dev` script is already configured with `nodemon -L`.*

**npm start runs dev and server-dev scripts at once**



To run the React and Express server separately:

React Server:
```
npm run dev
```

Express Server:
```
npm run server
```


To run the tests:

```
npm test
```



