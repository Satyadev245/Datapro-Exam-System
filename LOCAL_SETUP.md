# Local Setup - DataPro Online Examination

## Required
- Node.js 22.x (the project requires `>=22.0.0 <23`)
- npm 10.x or newer

## 1. Install

Open a terminal in the project folder:

```bash
npm install
```

Do not use Node 24 for this project.

## 2. Create `.env`

Copy `.env.example` to `.env`.

For local development use:

```env
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
DATA_DIR=./data
UPLOADS_DIR=./data/uploads/examinations
VITE_API_URL=
JWT_SECRET=change-this-local-secret


```

Never commit your real `.env` file or email App Password.

## 3. Start the complete application locally

```bash
npm run dev
```

Open:

`http://localhost:3000`

The Express backend and Vite frontend run together. PostgreSQL is required locally; set `DATABASE_URL` in `.env`.

## 4. Verify backend

Open:

`http://localhost:3000/api/health`

You should receive a JSON response with `status: "healthy"`.

## 5. email




## 7. Checks

```bash
npm run lint
npm run build
```

`npm run check` runs both.

## Default seeded accounts

The local database seeds the demo accounts from `server/db.ts`. Use those credentials only for local testing.
