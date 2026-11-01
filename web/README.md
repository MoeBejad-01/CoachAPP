# Coach HQ — coach dashboard (web)

React + TypeScript + Vite. No backend yet: all data lives in the browser's
localStorage and is seeded with generated demo data relative to today's date.

## Run

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

Settings → **Reset demo data** restores the original dataset.

## Structure

```
src/
  data/
    types.ts       domain model (trainees, templates, logs, check-ins, messages…)
    templates.ts   built-in program templates
    seed.ts        demo data generator (deterministic)
    store.ts       persisted store + useAppState() hook
    actions.ts     every mutation the UI performs
    selectors.ts   derived metrics: adherence, flags, PRs, week plan, threads
  components/      layout, roster table, program editor, chart, UI primitives
  pages/           Overview, Trainees, Trainee profile (+ tabs), New trainee,
                   Programs, Messages, Calendar, Billing, Settings
```

## Moving to a real backend

The UI only talks to `store.ts` (reads) and `actions.ts` (writes). Replace
`load`/`persist` and the bodies in `actions.ts` with API calls, and the pages
keep working. The trainee mobile app would write `logs`, `weights`,
`checkins` and trainee `messages` to the same API.
