# Coach HQ — Project Brief

_Status as of 2026-11-01 · Repo: github.com/MoeBejad-01/CoachAPP · Working branch: `dev` (from `main` @ `38eafb4`)_

## 1. What the product is

Coach HQ is a coaching platform for personal trainers / fitness coaches. It has two sides that share one workspace:

| Side | Who | Where | Purpose |
|---|---|---|---|
| **Coach dashboard** | The coach | Web, `/` | Manage trainees, build and assign programs, track progress, chat, billing |
| **Trainee app** | Each client | Mobile-style app, `/app/:traineeId` | See today's session, log workouts, submit check-ins, upload InBody scans, chat with coach |

Both languages are supported from day one: **English and Arabic (full right-to-left layout)**.

## 2. Current stage

**Working front-end prototype with demo data. No backend.**

- Everything is one web app (React + TypeScript + Vite) in `web/`.
- All data is stored in the browser (localStorage) and pre-filled with generated demo trainees, programs, logs, check-ins and messages dated relative to today.
- Changes persist in that browser only. There are **no user accounts, no login, no server, no real payments, no push notifications**.
- The trainee "mobile app" is a set of web routes shown inside a phone frame on desktop — it is **not** a native/installable app yet. Opening `/app` acts as a demo sign-in as the first active trainee.
- One commit exists (`Coach HQ: coach dashboard and trainee app`). No tests, no CI, no linter; the only quality check is `npm run typecheck`.

## 3. Features that exist today

### Coach dashboard
- **Overview** — configurable widgets: KPIs, "needs attention" list, upcoming sessions, unread messages, roster, adherence, recent PRs, upcoming renewals.
- **Trainees** — roster grouped by status (active / needs attention / onboarding / paused / inactive); automatic flags for missed check-ins, low adherence, reported pain, and inactivity.
- **New trainee** — onboarding form (contact, goals, injuries, training frequency, coaching mode online / in-person / hybrid, check-in day, optional program template + start date).
- **Trainee profile** — tabs: Overview, Program, Workouts, Progress, Notes, Check-ins. The coach can **fully customize this page**: show/hide/reorder badges, stats, tabs, cards and table columns, rename tabs, and **build their own chart cards** (from exercise lifts, workout data, check-ins, InBody fields, weekly targets, or a custom metric they enter manually).
- **Programs** — template library (built-in templates + create / edit / duplicate / delete). Assigning a template gives the trainee their own editable copy laid out **week by week**, each week with targets (body weight, sleep, calories, protein, steps, focus) and its own training days/exercises.
- **InBody** — coach can request a scan from a trainee, view scan history and trends.
- **Messages** — 1:1 threads with read status, plus broadcast to multiple trainees.
- **Calendar** — schedule sessions (in person / remote / video call).
- **Billing** — memberships, monthly recurring revenue, due-soon / overdue, "mark paid". **Payments are tracked manually**; no payment provider connected.
- **Settings** — coach profile, business name, currency, language, reset demo data.

### Trainee app
- **Today** — today's planned session and tasks.
- **Workout** — log sets (weight × reps), notes, flag pain, session RPE and duration.
- **Program** — view the assigned program by week.
- **Progress** — personal charts and history.
- **Check-in** — weekly form: weight, sleep, energy, stress, soreness, comment.
- **InBody** — upload a scan report and its numbers.
- **Coach** — chat with the coach.
- **Me** — profile.

Everything the trainee logs appears on the coach side immediately (same data).

## 4. How it's built (for planning estimates)

- **Stack:** React 19, TypeScript, Vite, React Router. No UI library, no state library — small custom store.
- **Data layer is cleanly separated:** pages read from one store (`web/src/data/store.ts`) and write only through one file of actions (`web/src/data/actions.ts`). Swapping localStorage for a real API is mostly a matter of re-implementing those two files — the pages shouldn't need rewriting.
- **Metrics are computed, never stored** (adherence, flags, PRs, week plans) in `web/src/data/selectors.ts`.
- **Translations:** every user-facing string lives in `web/src/i18n/strings.ts` in both English and Arabic. Any new feature must add both.
- **Data model:** trainees, program templates, assigned programs (weekly plan), workout logs, weigh-ins, check-ins, notes, messages, calendar sessions, InBody scans/requests, custom metric entries, coach profile, dashboard/page layout settings.

## 5. Gaps / what's needed to go to production

Roughly in dependency order:

1. **Backend + database** — persist data on a server instead of the browser; API to replace `store.ts` / `actions.ts`.
2. **Authentication & roles** — coach accounts and trainee accounts; trainees only see their own data; trainee invite/onboarding flow.
3. **Multi-coach / multi-tenant** — currently one coach per workspace.
4. **Real mobile app for trainees** — native (or PWA) app, push notifications for messages, reminders, check-in due.
5. **File storage** — InBody reports are currently embedded in browser storage (small files only).
6. **Payments** — connect a payment provider (subscriptions, invoices) to replace manual "mark paid".
7. **Real-time messaging** — chat currently only syncs across tabs in one browser.
8. **Engineering basics** — automated tests, linting, CI, deployment/hosting, error monitoring.
9. **Exercise library** — exercises are free-text per program; no shared exercise database or videos yet.

## 6. Running it locally

```bash
cd web
npm install
npm run dev        # http://localhost:5173  (coach)  and  /app  (trainee)
npm run typecheck
```

Settings → **Reset demo data** restores the original dataset.
