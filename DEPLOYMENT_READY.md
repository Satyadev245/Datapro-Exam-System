# DataPro Student Examination - Deployment Ready

## Production architecture
- Frontend: Netlify (React + Vite)
- Backend: Render (Express + Node.js 22)
- Persistent data: Render disk mounted at `/var/data`
- Database: PostgreSQL via DATABASE_URL
- Exam/attendance uploads: persistent Render disk
- Email integration: REMOVED
- WhatsApp integration: REMOVED

## Render
1. Push this repository to GitHub.
2. In Render, create a Web Service from the repository.
3. Use Node 22.
4. Build command: `npm install`
5. Start command: `npm start`
6. Health check: `/api/health`
7. Add a persistent disk mounted at `/var/data`.
8. Configure:
   - `NODE_ENV=production`
   - `DATA_DIR=/var/data`
   - `UPLOADS_DIR=/var/data/uploads/examinations`
   - `ATTENDANCE_UPLOADS_DIR=/var/data/uploads/attendance`
   - `APP_URL=https://datapro-examination-system.netlify.app`
   - `CORS_ORIGINS=https://datapro-examination-system.netlify.app`
   - `JWT_SECRET=<long-random-secret>`
   - `GEMINI_API_KEY=<only if PDF/AI generation is used>`

## Netlify
1. Import the same GitHub repository.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Node version: 22
5. Add `VITE_API_URL=https://datapro-examination-backend.onrender.com/api`
6. Deploy.


## CORS and live dashboard fixes included
- The backend always recognizes the production Netlify origin.
- `OPTIONS` preflight requests are answered before authentication/API routing.
- `Access-Control-Allow-Headers` includes Authorization and common browser headers.
- Dashboard data refreshes on window focus and every 30 seconds.
- Dashboard no longer displays examination-paper submission panels.
- Faculty dashboard no longer displays the recent-uploaded-papers panel.
- WhatsApp/email integrations are not required for deployment.

## Important
Do not commit `node_modules`, `.env`, database credentials, or local uploads.

## Verification
- Open `https://datapro-examination-backend.onrender.com/api/health` and confirm it responds successfully.
- Open the Netlify site and test login.
- Test Faculty exam creation and publishing.
- Test Student exam link and submission.
- Test attendance upload.
- Restart/redeploy Render and confirm persistent data remains available.
