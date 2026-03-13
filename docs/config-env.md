# Setup / Configuration / Environment

The project uses `concurrently` to run the front end and back end server for development.

The express server is scoped within the server/ folder, and has its own `npm` package.  Both sets of dependencies have to be installed in before running the app.

## Database (PostgreSQL)

User data is stored in PostgreSQL. Set the connection in your environment (e.g. a `.env` file in the project root, which the server loads via `dotenv`).

- **Option 1 – single URL:**  
  `DATABASE_URL=postgresql://user:password@localhost:5432/nocarbuddy`

- **Option 2 – individual vars:**  
  `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (the server will build the connection string from these if `DATABASE_URL` is not set).

Create the database if needed (e.g. `createdb nocarbuddy`). The server creates the `users` table automatically on startup if it does not exist.

To install and start the project:

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

This sends any requests starting with `/api` to `http://localhost:3000` (the Express server), while allowing other requests to pass through to the react server.

A rewrite function is used to remove the `/api` prefix before forwarding the request to the Express server.

usePolling is enabled to support running under the server under WSL.


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
| `npm run build` | Production build (Vite) |
| `npm run preview` | Preview production build |



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
