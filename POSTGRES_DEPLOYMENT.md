# DataPro Institute — PostgreSQL Deployment

## Architecture
- React + Vite frontend
- Node.js + Express REST API
- PostgreSQL database
- JWT authentication
- Multer file uploads
- Optional Gemini PDF question generation

## Local setup

1. Install Node.js 22.
2. Create a PostgreSQL database, for example `datapro`.
3. Copy `.env.example` to `.env`.
4. Set `DATABASE_URL`.
5. Set a strong `JWT_SECRET`.
6. Install:
   `npm install`
7. Start:
   `npm run dev`

The backend automatically creates all tables, indexes and seed roles/users/courses on first startup.

## Default seed accounts

- Center Manager: `varaprasad.manager` / `VaraPrasad@Mgr26`
- Admin: `vinith` / `Vinith@Adm26`
- Team Lead: `azmal` / `Azmal@Lead26`
- Counsellor: `manasa` / `Manasa@Couns26`
- Faculty: `srinivas` / `Srinivas@Trn26`

**Change these passwords immediately in production.**

## Render backend

Build:
`npm install`

Start:
`npm start`

Health:
`GET /api/health`

Environment:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `APP_URL`
- `CORS_ORIGINS`
- `UPLOADS_DIR` / `ATTENDANCE_UPLOADS_DIR` if using a persistent disk
- `GEMINI_API_KEY` if AI parsing is enabled

If using a Render persistent disk, mount it at `/var/data` and set:
- `DATA_DIR=/var/data`
- `UPLOADS_DIR=/var/data/uploads/examinations`
- `ATTENDANCE_UPLOADS_DIR=/var/data/uploads/attendance`

## Netlify frontend

Build:
`npm run build`

Publish:
`dist`

Environment:
`VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

The existing `netlify.toml` contains the SPA fallback.

## PostgreSQL notes
The application no longer creates or reads a SQLite database. PostgreSQL is the source of truth for users, courses, batches, students, examinations, online exams, attendance, notifications, logs and reports.

File uploads are stored on the configured filesystem. For cloud deployments, use persistent disk/object storage so uploaded examination and attendance files survive redeploys.

## Production checklist
- Set `DATABASE_URL`.
- Set a unique long `JWT_SECRET`.
- Set exact Netlify origin in `CORS_ORIGINS`.
- Set `APP_URL` to the public frontend URL; online exam links use this URL.
- Use HTTPS.
- Change all seeded passwords.
- Configure persistent file storage.
- Test `/api/health`.
- Test login, course/batch creation, student registration, exam upload, online exam publish, student exam link, attendance save/submit and management notifications.
