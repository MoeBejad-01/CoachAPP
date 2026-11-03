# Coach HQ

Coaching platform: a web dashboard for coaches and a mobile app for trainees, sharing one workspace.

- `web/` — React + TypeScript + Vite app
  - Public website at `/` (homepage, `/login`, `/signup`)
  - Coach dashboard at `/coach` (trainees, weekly programs, progress, InBody, chat, billing)
  - Trainee app at `/app` (today's session, workout logging, check-ins, InBody upload, chat)
  - English and Arabic (RTL)

```bash
cd web
npm install
npm run dev
```

Data is demo data stored in the browser (localStorage) until a backend is connected. See `web/README.md`.
