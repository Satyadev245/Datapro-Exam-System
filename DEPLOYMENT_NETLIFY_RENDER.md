# Netlify + Render Deployment

This version uses React/Vite + Node/Express + PostgreSQL.

## Render API
- Build: `npm install`
- Start: `npm start`
- Health: `/api/health`
- Required: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `CORS_ORIGINS`
- Optional: `GEMINI_API_KEY`
- Persistent disk is recommended for examination and attendance uploads.

## Netlify frontend
- Build: `npm run build`
- Publish: `dist`
- Environment: `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`

## Important
`APP_URL` must be the public frontend URL because secure online-exam links are generated for students.
`CORS_ORIGINS` should contain the exact Netlify origin.
