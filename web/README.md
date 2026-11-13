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

## AI file reading (training import)

"Import from file" sends the coach's training file (Excel, CSV, PDF or a photo) to Claude, which returns the
training days and exercises for the coach to check before importing. The call runs on the server
(`server/aiTraining.ts`, served by the Vite dev/preview server at `/api/ai/parse-training`), so the API key
never reaches the browser.

Setup (macOS, key kept in the Keychain): save it once with
`security add-generic-password -a "$USER" -s coachhq-anthropic -w`, then start the app with `npm run dev:secure`.

Or create `web/.env.local` containing

```
ANTHROPIC_API_KEY=your-key-here
```

and restart `npm run dev`. `.env.local` is git-ignored. Without a key the dialog says so and offers the
manual column/line mapping instead. For a production deployment, host `handleAiTraining` behind the same
route (e.g. as a serverless function) with the key set as a server environment variable.
