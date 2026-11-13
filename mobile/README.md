# Coach HQ trainee app (Flutter)

The trainee side of Coach HQ, for iOS first and Android from the same code. It uses the
website's look (same blues, greys, radii, brand gradient, barbell plates and body map) and
talks to the same workspace as the coach dashboard, so whatever the trainee logs here
shows up for the coach.

## What's in it

| Tab | What the trainee does |
| --- | --- |
| **Today** | Greeting, the week as a strip (done / planned / missed / check-in day), today's session with a one-tap start, a barbell that loads a plate for every session this week, what the coach is waiting on (weekly check-in, InBody request, unread messages, next booked session), this week's focus and targets, goals |
| **Train** | The assigned program week by week, each day with a mini body map, the coach's cues and what was lifted last time |
| **Workout** (from Today or Train) | Sets pre-filled from last time, ± 2.5 kg steppers, tick to finish a set, automatic rest timer from the coach's rest time, live ★ when a set beats the best estimated 1RM, "felt pain" flag and notes for the coach. Survives closing the app. Finishing asks for duration and RPE, then shows a summary with new bests and the muscles worked |
| **Progress** | Muscles worked over 7 or 28 days on the website's body map (front/back), main lifts with e1RM trends, weekly volume, recent bests, session history; body weight chart with the target, InBody results and trend; check-in trends and history |
| **Coach** | Chat with the coach (same thread as the dashboard's Messages, with Sending / Delivered / Seen), quick replies, notes the coach pinned, next session |
| **Me** | Profile, goals, coaching mode, membership price shown for reference (payment is between trainee and coach), language (English / Arabic, right to left), appearance, sync status, server address, sign out |

Sheets: weekly check-in (weight, sleep, energy, stress, soreness, comment), quick weigh-in,
InBody scan (the printout's numbers plus a photo of the report; fat % and BMI are filled
in from the rest).

## Run it

1. Start the web app; its dev server hosts the sync API:
   ```bash
   cd web && npm run dev
   ```
2. Open the coach dashboard once at http://localhost:5173/coach so it publishes the workspace.
3. Run the app:
   ```bash
   cd mobile && flutter pub get && flutter run
   ```
4. Tap **Try the demo trainee** (Layla, `layla.mansour@example.com` / `demo1234`). Every
   trainee in the dashboard's demo data can sign in with their email and `demo1234`.

Server address: the iOS simulator uses `http://localhost:5173`, the Android emulator
`http://10.0.2.2:5173`. On a real phone, run `npm run dev -- --host` and set the server to
your computer's address in **Me → Server**.

### Xcode note

On macOS 26, Xcode 16.x's storyboard and asset-catalog tools crash, so iOS builds stop at
"Failed to launch AssetCatalogSimulatorAgent". Update Xcode (App Store) to fix it; nothing in
the project needs to change. Android builds don't use those tools.

## How data flows

- `lib/data/api.dart` calls the sync API in `web/server/syncApi.ts`: sign in, `GET /api/app/me`
  for the trainee's data, `POST /api/app/ops` for changes.
- `lib/data/store.dart` keeps the last snapshot and an **outbox** of changes on disk. Changes
  appear in the app immediately, are sent right away, and are retried until the server takes
  them, so the app works offline. It checks for coach updates every 5 seconds while open.
- Ops mirror the dashboard's trainee actions: `log` (workout), `weight`, `checkin`, `message`,
  `seen`, `touch` (last opened) and `inbody`. Each has its own id, so resending is safe.
- Records use the same field names as `web/src/data/types.ts`.

## Code map

```
lib/
  main.dart            app, theme, language, sign-in gate
  app/                 theme tokens, strings (EN + AR), formatting, settings
  data/                models, API client, store + outbox, schedule/strength maths, workout draft
  widgets/             cards and buttons, barbell, body map (+ generated shapes), charts
  screens/             sign in, tabs (today, train, progress, coach, me), workout, sheets
tool/
  export_anatomy.mjs   regenerates the body map from the website's shapes
  make_icons.sh        regenerates the app icons from the website's logo
```

- **Strings**: every string is in `lib/app/strings.dart` in English and Arabic, like the
  website's `strings.ts`. Plurals use `key.one` / `key.other` (and Arabic's zero/two/few/many).
- **Theme**: `lib/app/theme.dart` mirrors `web/src/site/theme.css`.
- **Plans and stats** (`lib/data/schedule.dart`) follow the dashboard's selectors: training days per
  weekly frequency, program weeks, adherence over 4 weeks, Epley e1RM and PRs, so both sides agree.

## Not done yet

- Real accounts (sign-in accepts any trainee email with the demo password).
- Push notifications (new message, check-in due).
- HealthKit / Google Fit for steps and sleep.
- Store builds: bundle id `com.coachhq.trainee`, signing team and Android release signing are not set.
