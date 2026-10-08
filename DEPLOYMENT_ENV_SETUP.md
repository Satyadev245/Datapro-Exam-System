# Deployment Environment Setup

## Netlify (Frontend)
Set the public Render backend URL in Netlify environment variables:

```env
VITE_API_URL=https://datapro-examination-backend.onrender.com/api
```


## Render (Backend)
Set these on Render:

```env
NODE_ENV=production
PORT=10000
APP_URL=https://datapro-examination-system.netlify.app
CORS_ORIGINS=https://datapro-examination-system.netlify.app
JWT_SECRET=<long-random-secret>
GEMINI_API_KEY=<your-gemini-key-if-used>
DATA_DIR=/var/data
UPLOADS_DIR=/var/data/uploads/examinations
ATTENDANCE_UPLOADS_DIR=/var/data/uploads/attendance
DATABASE_URL=<Render PostgreSQL connection string>
```

## Important security action
If a real Gemini API key or email App Password has been shared in chat, screenshots, Git, or a public repository, revoke/rotate it and create a new credential before production use.

## Student delivery screen
