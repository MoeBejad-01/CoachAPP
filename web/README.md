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
| `/c/<handle>` | A coach's own page, the link they send to prospective trainees. Try `/c/omar` |
| `/join/<coach>?plan=<id>` | Join a coach: sign up or log in first if needed, then a 5-step intake form (body, training, health, plan) that sends a request to the coach |
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

### Coach pages (`/c/<handle>`)

Each coach has a public page built entirely from their profile
(`src/site/coach/types.ts`): photo, story, stats, their own competition lifts,
trainee results, method, programs, plans, inbox quotes, intro-call times and FAQ.
Coach-written text is stored per language (`{ en, ar }`, English as fallback);
the page's own labels are in `strings.ts` under `site.cp.*`. `sections` sets
which sections show and in what order, and any section without content is skipped.

- The example coach is `src/site/coach/demoCoach.ts` (`/c/omar`, account id `demo`).
- `src/site/services/coachProfiles.ts` finds a page by handle or account id. A coach
  who signs up gets a starter page at `/c/<accountId>` with just their name until
  they fill it in; `saveCoachProfile` is there for the page editor, which isn't built yet.
- Prices on coach pages are for reference only: trainees pay the coach directly and
  Coach HQ takes no payments. Plan and program buttons ("Request this plan", "Ask about
  this program") lead to `/join/<handle>?plan=<id>`.

### Joining a coach (`/join/<coach>`)

1. "Join" on a coach page opens `/join/<handle>?plan=<id>`. Visitors who aren't signed in
   are sent to `/signup?coach=…&plan=…&next=…` (or log in from there) and come straight back.
   Signup and login honour `next` for any same-site path.
2. The intake form (`src/site/pages/join/`) has five steps: about you, body (metric or
   imperial), training, health (pain areas marked on the muscle map) and plan + message.
   A barbell loads a plate per finished step, and a card beside the form shows what the
   coach will see. Answers are saved as a draft while typing.
3. "Send request" stores the request (`src/site/services/joinRequests.ts`, mocked in the
   browser under `coachhq:joinRequests`) with measurements converted to metric. Coming back
   shows the sent request with "Update my answers". What the coach does next isn't built yet.
- **Photo**: `photo` is the portrait's URL. A coach viewing their own page (log in as the
  demo coach and open `/c/omar`) gets "Change photo" and "Use the default picture" buttons
  under the portrait. Without a photo the page shows the default picture: an illustrated
  portrait drawn from the homepage's anatomy figure and the coach's initials. Uploads are
  mocked: the image is cropped to 4:5, scaled down and kept in the browser.
- The demo coach's photo, `public/coaches/omar.jpg`, is "Male fitness model" by Samuel
  Girven on Unsplash (unsplash.com/photos/Ppua0I4VjqE, Unsplash License). It shows a real
  person next to made-up credentials and reviews, so replace it before launch.

Theme follows the system setting until the visitor uses the toggle (saved as `coachhq:theme`).
Language is shared with the dashboard (`coachhq:lang`). All motion is skipped under
`prefers-reduced-motion`.

### What is mocked

- **Auth** (`src/site/services/auth.ts`): accounts and the session are stored in the browser
  (passwords hashed). Demo logins: `coach@coachhq.example` / `demo1234` and
  `trainee@coachhq.example` / `demo1234`. Coaches land on `/coach`, trainees on `/app`.
  Google and Apple buttons are placeholders. Replace the function bodies with API calls; the pages only
  use the exported functions.
- **Join requests** (`src/site/services/joinRequests.ts`): kept in the browser, with drafts under
  `coachhq:joinDraft:<coach>:<account>`.
- **Coach pages and intro calls** (`src/site/services/coachProfiles.ts`): profiles come from the demo
  data or a starter page, edits would be kept in the browser, and intro call requests are stored under
  `coachhq:introCalls`.
- **Contact form** (`src/site/services/contact.ts`): messages are kept in the browser under
  `coachhq:contact`. Replace `sendContactMessage` with a mail or CRM endpoint.

## Sync API (shared with the mobile app)

`npm run dev` (and `npm run preview`) also serve a small local API at `/api`
(`server/syncApi.ts`, mounted as a Vite plugin). It stands in for the real
backend so the Flutter trainee app in `../mobile` and this dashboard share one
workspace:

- The dashboard publishes its workspace on load, then sends **patches** of what
  changed (`src/data/patch.ts`, `src/data/sync.ts`) and listens for new
  revisions over server-sent events (`/api/events`). Edits from both sides
  merge record by record, so a set logged on the phone shows up on the coach
  side about a second later, and replies go back the other way.
- The app signs in with a trainee's email and the demo password `demo1234`
  (for example `layla.mansour@example.com`), reads `/api/app/me` and sends
  its changes to `/api/app/ops` (`server/appOps.ts`: workouts, weigh-ins,
  check-ins, messages, "seen", InBody scans).
- Data is kept in `web/.data/sync.json` (git-ignored). Delete it to start over.
  **Reset demo data** in Settings replaces the shared workspace too.
- Without the API (a static build) the dashboard keeps working from
  localStorage alone.

## Moving to a real backend

The UI only talks to `store.ts` (reads) and `actions.ts` (writes). Replace
`load`/`persist`, `sync.ts` and the bodies in `actions.ts` with API calls, and
the pages keep working. The mobile app only uses the endpoints listed above, so
a real backend can implement those (with real accounts) and the app needs no
changes beyond its server address.
