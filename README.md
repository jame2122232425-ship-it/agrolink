# AgroLink

AgroLink is a farmer-facing React application backed by a shared Django and PostgreSQL platform. The frontend is in [`frontend/`](./frontend/); the backend foundation, setup instructions, API contract, models, and tests are in [`backend/README.md`](./backend/README.md).

The backend is the source of truth for farmer accounts, profiles, farms, and plots. The current frontend data service is still a local mock and is not yet connected to the API.

See [`deploy_guide.md`](./deploy_guide.md) for deployment instructions for Render, Vercel, and Supabase, including the required environment variables and current production readiness notes.
