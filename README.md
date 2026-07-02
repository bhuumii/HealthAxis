# HealthAxis

Solo hackathon prototype for real-time PHC/CHC operations monitoring in a fictional Indian district.

## What It Does

- District dashboard for stock, bed occupancy, doctor attendance, diagnostic test readiness, and intervention risk.
- Centre drill-down pages with stock tables, Recharts trends, doctor attendance, and test availability.
- Explainable stock-out forecasting: current stock divided by seven-day moving-average daily consumption.
- Lightweight demand forecast using exponential smoothing.
- Rule-based stock redistribution recommendations between centres in the same district.
- Weighted underperformance scoring from stock risk, bed overcrowding, doctor absenteeism, and test unavailability.
- Multilingual UI in English, Hindi, Marathi, Tamil, and Telugu, with Gemini API routes for alert translation and natural-language questions.

## Google Cloud Technologies Used

- **Firebase Firestore**: the live real-time backend. The seed script writes the synthetic district into `centres`, `stock_items`, `beds`, `doctors`, `tests`, and `footfall_logs`; the Next.js client uses Firestore `onSnapshot` listeners so dashboard pages update from actual database writes.
- **Firebase Authentication**: protects the dashboard with Email/Password sign up/sign in/reset and Google Sign-In.
- **Gemini API**: powers multilingual translation and the natural-language district assistant. The server route defaults to Flash-Lite and blocks Pro model names so the demo stays aligned with the free-tier plan.

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run seed:firestore
npm run dev
```

Open the local Next.js URL shown by the dev server. `/` redirects to `/overview`.

## Firebase Setup

Create a Firebase project, enable Firestore, enable Firebase Authentication, and add the web app config to `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

For seeding and server-side Gemini context reads, add a service account JSON string:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"..."}
```

In Firebase Console > Authentication > Sign-in method, enable:

- Email/Password
- Google

Then run:

```bash
npm run seed:firestore
```

The generator still writes `data/district-data.json` as a local fallback, but Firestore is the live data source when the Firebase environment variables are configured.

## Gemini Setup

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash-lite
```

Without an API key, the assistant falls back to the existing local rule-based answer path for development.

## Routes

- `/overview`: district stats, centre cards, bed occupancy bar chart, and assistant panel.
- `/centres/[id]`: per-centre stock table, stock trend, doctors, and tests.
- `/alerts`: priority stock-out warning feed.
- `/redistribution`: rule-based transfer recommendations table.
- `/intervention`: flagged centres for district administrator follow-up.

## Architecture

- `lib/firestore-district.ts` holds browser `onSnapshot` listeners.
- `lib/firestore-server.ts` reads Firestore for server routes.
- `lib/firestore-compose.ts` reassembles Firestore collections into the unchanged `DistrictData` shape.
- `lib/analytics.ts` contains the unchanged forecasting, redistribution, and intervention scoring logic.
- `app/api/gemini/*` keeps Gemini calls server-side for Vercel deployment.
- `components/auth-provider.tsx` exposes Firebase Auth state and actions.
- `components/protected-route.tsx` redirects unauthenticated users to `/login`.

## Out Of Scope For This Pass

Mobile app packaging, real government data integrations, and non-demo production workflows are future work.
