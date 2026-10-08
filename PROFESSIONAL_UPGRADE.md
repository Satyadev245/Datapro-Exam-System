# DataPro Student Online Examination Portal - Professional Upgrade

## Included
- PostgreSQL attendance schema initialization for fresh deployments.
- Reusable frontend validation helpers for student registration and account forms.
- Field-level validation feedback for student registration and portal login.
- Responsive professional UI styling, focus states, hover states, accessible error states and mobile-friendly tables.

## Run locally
```bash
npm install
npm run dev
```

The application starts through `server.ts`. Do not commit `.env` or the `data/` directory to source control.

## If using an old database
Back up the PostgreSQL database before production schema changes. The server creates missing application tables automatically at startup.
