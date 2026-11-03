# Coach HQ — website, coach dashboard and trainee app (web)

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
  trainee/         the trainee mobile app
  site/            the public website (see below)
```

## Public website

### Routes

| Route | Page |
| --- | --- |
| `/` | Homepage: hero with muscle map, About, Services, Features, How It Works, For Coaches, For Trainees, Pricing, Contact |
| `/login` | Log in (with demo accounts while auth is mocked) |
| `/signup` | Sign up: choose Coach or Trainee, then account details. `?role=coach` or `?role=trainee` skips the choice |
| `/signup?coach=<coachId>` | A coach's registration link: preselects Trainee and shows "You're joining Coach …". Try `?coach=demo` |
| `/forgot-password` | Request a password reset link |
| `/coach/...` | Coach dashboard (moved from `/`) |
| `/app/...` | Trainee app (unchanged) |
| anything else | 404 page |

The dashboard and trainee app are loaded on demand (`src/coachPages.ts`,
`src/traineeScreens.ts`), and the 3D dumbbell loads only when it nears the
screen on a capable device, so the homepage stays light.

### Where to edit things

- **Colors, fonts, radii, motion**: CSS variables in `src/site/theme.css` (light values, then dark).
- **Text**: every string, English and Arabic, is in `src/i18n/strings.ts` under `site.*`.
- **Nav links, contact email, social links**: `src/site/config/site.ts` (the email and social URLs are placeholders).
- **Services, features (bento grid), How It Works steps, benefit lists**: `src/site/config/content.ts`.
- **Pricing**: `src/site/config/pricing.ts` holds the plans, their features and prices. While
  `PRICING_LIVE` is `false` the cards show "Coming soon" and a waitlist button that starts a message in
  the contact form. To launch, set it to `true` and give each plan a `price`. Plan names and feature
  wording are in `strings.ts` (`site.pricing.*`).
- **Muscle map shapes and example exercises**: `src/site/components/anatomy/shapes.ts` and `site.m.*` strings.

Theme follows the system setting until the visitor uses the toggle (saved as `coachhq:theme`).
Language is shared with the dashboard (`coachhq:lang`). All motion is skipped under
`prefers-reduced-motion`.

### What is mocked

- **Auth** (`src/site/services/auth.ts`): accounts and the session are stored in the browser
  (passwords hashed). Demo logins: `coach@coachhq.example` / `demo1234` and
  `trainee@coachhq.example` / `demo1234`. Coaches land on `/coach`, trainees on `/app`.
  Google and Apple buttons are placeholders. Replace the function bodies with API calls; the pages only
  use the exported functions.
- **Contact form** (`src/site/services/contact.ts`): messages are kept in the browser under
  `coachhq:contact`. Replace `sendContactMessage` with a mail or CRM endpoint.

## Moving to a real backend

The UI only talks to `store.ts` (reads) and `actions.ts` (writes). Replace
`load`/`persist` and the bodies in `actions.ts` with API calls, and the pages
keep working. The trainee mobile app would write `logs`, `weights`,
`checkins` and trainee `messages` to the same API.
