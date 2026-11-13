# Coach HQ

Coaching platform: a web dashboard for coaches and a mobile app for trainees, sharing one workspace.

- `web/`: React + TypeScript + Vite app
  - Public website at `/` (homepage, `/login`, `/signup`) and coach pages at `/c/<handle>`
  - Coach dashboard at `/coach` (trainees, weekly programs, progress, InBody, chat, billing)
  - Web trainee app at `/app` (today's session, workout logging, check-ins, InBody upload, chat)
  - A local sync API at `/api` that the mobile app talks to
  - English and Arabic (RTL)
- `mobile/`: Flutter trainee app for iOS (Android-ready): today's session, live workout
  logging with rest timer and new bests, the program week by week, muscle map and progress
  charts, weekly check-ins, InBody scans, and chat with the coach. Everything the trainee
  logs shows up on the coach dashboard. See `mobile/README.md`.

```bash
cd web
npm install
npm run dev        # website, dashboard and the sync API on http://localhost:5173
```

```bash
cd mobile
flutter pub get
flutter run        # with the web dev server running
```

Data is demo data: the dashboard keeps it in the browser and shares it through the local
sync API (`web/.data/sync.json`) until a real backend is connected. See `web/README.md`.
