# Deployment Verification

## Netlify
- Build command: `npm run build`
- Publish directory: `dist`
- Node: 22
- Environment variable: `VITE_API_URL=https://datapro-examination-backend.onrender.com/api`
- SPA rewrite is configured in `netlify.toml`.

## Render
- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`
- Persistent disk: `/var/data`
- `DATA_DIR=/var/data`
- `UPLOADS_DIR=/var/data/uploads/examinations`
- `ATTENDANCE_UPLOADS_DIR=/var/data/uploads/attendance`

Required secrets/configuration:
- `JWT_SECRET`
- `CORS_ORIGINS`
- `APP_URL`
- `GEMINI_API_KEY` if AI functionality is enabled

## Important
The ZIP intentionally does not contain `node_modules`, `dist`, database data, uploads, or `.env` secrets. Netlify and Render install dependencies with `npm install`.


## Online Exam Delivery Fixes

- Each student keeps a unique `access_token` exam URL.
- The Student Portal refreshes on login/focus and periodically, so newly published assigned exams appear automatically.
- `APP_URL` must be the public **Netlify frontend URL**, not the Render API URL, because exam links open the React application.
- Attendance validates the selected Faculty batch, active students, date, attendance records, and submitted Excel file before saving/submitting.
