# NoCarBuddy

React + Express full-stack app with a PostgreSQL backend. The UI is built with Vite and Tailwind CSS; the API runs in the `server/` folder.


## Limitations

**--NOTE--**

As a proof-of-concept testing/dev app, there are limitations to the GPS background fetch capabilities without using react-native.

- You **must have the app fully open** in order for GPS to refresh
- A no sleep function will keep device awake as long as the page is open

At a later point, if this is ported to react-native, the implementation will be redone to allow for GPS tracking to pull data and record while phone is locked.


## Quick start

Install dependencies (root and server), then start the app:

```bash
npm i
cd server && npm i && cd ..
npm start
```

This runs the React dev server and the Express API together via `concurrently`.

## Documentation

Project docs live in **docs/**:

- [docs/](docs/) – index of all docs
- [User sign-up and admin panel](docs/signup-and-admin.md) – sign-up flow, set-password email, and admin panel  

