# HealthAxis

HealthAxis is a hackathon prototype for monitoring Primary Health Centre (PHC) and Community Health Centre (CHC) readiness across fictional Indian districts. It gives district health administrators a single operational dashboard for stock risk, bed pressure, doctor attendance, diagnostic test availability, patient footfall, and recommended follow-up actions.

The app is built with Next.js, Firebase, and Gemini. It uses synthetic district data so the product workflow can be demonstrated without exposing real health records.

## Why It Exists

District administrators often need to know which centres need support before a shortage becomes a crisis. HealthAxis turns centre-level operational signals into practical answers:

- Which centres are likely to run out of essential medicines soon?
- Which facilities are overcrowded or short on attending doctors?
- Which diagnostic services are unavailable?
- Where should stock be redistributed first?
- Which centres should be flagged for intervention?
- What does the district data say when asked in plain language?

## Core Features

- **District overview**: live KPIs for total centres, stock warnings, flagged centres, average bed usage, and centre readiness.
- **Centre drill-downs**: PHC/CHC pages with medicine stock, bed occupancy, doctors, attendance, tests, patient footfall, and trends.
- **Stock-out forecasting**: calculates current stock cover using recent consumption and smoothing-based demand estimates.
- **Alerts feed**: prioritizes medicines and centres at risk of stock-out.
- **Redistribution planning**: recommends stock transfers from centres with surplus cover to centres with urgent shortages.
- **Intervention scoring**: ranks centres using a weighted score based on stock risk, bed occupancy, doctor absenteeism, and diagnostic downtime.
- **Anomaly signals**: highlights unusual centre-level patterns in stock, beds, doctors, and footfall.
- **Scenario simulator**: allows district users to explore operational changes before acting.
- **Multilingual interface**: supports English and multiple Indian languages through the in-app language selector.
- **AI assistant**: answers district operations questions with Gemini when configured, and falls back to local rule-based answers during development.
- **Authentication**: protects dashboard routes with Firebase Authentication.

## Demo Data

The repository ships with synthetic data for three fictional Uttar Pradesh districts:

- Suryanagar
- Shivpur Kalan
- Mahadevganj

The data generator writes JSON fallback files under `data/` and can also seed Firestore collections for live dashboard updates.

## Technology Stack

- **Framework**: Next.js 15 with React 19 and TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Motion**: Framer Motion
- **Icons**: Lucide React
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **AI**: Gemini API

## Google Cloud / Firebase Usage

- **Firestore** stores the operational dataset in collections such as centres, stock items, beds, doctors, tests, and footfall logs. The client subscribes with real-time listeners, so dashboard pages update when Firestore data changes.
- **Firebase Authentication** provides Email/Password and Google sign-in for protected dashboard routes.
- **Gemini API** powers the natural-language district assistant and translation routes. The app defaults to a Flash-Lite model and avoids Pro model names so the demo stays aligned with free-tier usage.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

```bash
cp .env.example .env.local
```

Fill in Firebase client configuration:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

For Firestore seeding and server-side reads, add a Firebase service account:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

For Gemini-powered answers:

```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash-lite
```

The app can still run without Gemini. In that case, assistant responses fall back to local rule-based answers.

### 3. Configure Firebase

In Firebase Console:

1. Create or select a Firebase project.
2. Enable Firestore.
3. Enable Firebase Authentication.
4. Turn on Email/Password sign-in.
5. Turn on Google sign-in if you want Google authentication.

### 4. Seed demo data

```bash
npm run seed:firestore
```

This command generates synthetic district data and writes it to Firestore when the service account is configured. It also maintains local JSON data for fallback development.

### 5. Run the app

```bash
npm run dev
```

Open the local URL printed by Next.js. The root route redirects to `/overview`.

## Available Scripts

```bash
npm run dev             # Start the Next.js development server
npm run build           # Create a production build
npm run start           # Start the production server
npm run lint            # Run ESLint
npm run generate:data   # Generate synthetic district data
npm run seed:firestore  # Generate data and seed Firestore
```

## Main Routes

- `/overview`: district KPIs, centre readiness, charts, filters, district selection, live-data status, and assistant panel.
- `/centres/[id]`: detailed PHC/CHC view for stock, trends, doctors, attendance, tests, and patient footfall.
- `/alerts`: prioritized stock-out warning feed.
- `/redistribution`: recommended stock transfers between centres.
- `/intervention`: centres that need district administrator follow-up.
- `/simulator`: scenario simulation workflow.
- `/login` and `/signup`: Firebase Authentication screens.

## Project Structure

```text
app/                         Next.js App Router pages and API routes
app/api/gemini/              Server-side Gemini query and translation routes
components/                  Dashboard UI, auth, providers, charts, and workflow views
data/                        Synthetic district JSON fallback data
lib/analytics.ts             KPIs, intervention scoring, warnings, and recommendations
lib/forecasting.ts           Medicine and patient demand forecasting helpers
lib/redistribution.ts        Stock transfer recommendation logic
lib/anomalyDetection.ts      Centre-level anomaly detection
lib/firestore-*.ts           Firestore client, server, and data composition helpers
lib/types.ts                 Shared TypeScript domain types
scripts/generate-synthetic-data.mjs
                             Synthetic data generator and Firestore seed script
```

## Data Flow

1. `scripts/generate-synthetic-data.mjs` creates synthetic district operations data.
2. Local JSON files in `data/` provide a fallback dataset.
3. When Firebase environment variables are present, the seed script writes the same data into Firestore.
4. Client pages use `useDistrictData()` to load fallback data first, then subscribe to Firestore through `onSnapshot`.
5. Analytics helpers compute forecasts, warning severity, intervention scores, anomaly signals, and redistribution plans from the shared `DistrictData` shape.
6. Gemini API routes read district context server-side and answer assistant questions without exposing the API key to the browser.

## How Scoring Works

The intervention score is a weighted operational risk score:

- Stock risk: 35%
- Bed pressure: 25%
- Doctor absenteeism: 25%
- Diagnostic test unavailability: 15%

Centres at or above the configured intervention threshold are flagged for administrator review.

## Development Notes

- Firestore is the live data source when Firebase is configured.
- Local JSON data keeps the UI usable if Firestore is unavailable or still being set up.
- Gemini is optional for local development.
- API keys and service account values belong in `.env.local`; do not commit real secrets.
- The project uses synthetic demonstration data, not official government data.

## Current Scope

HealthAxis is a prototype, not a production clinical or government system. It does not include real health facility integrations, mobile packaging, audit workflows, role-based administrative permissions, or production data governance.
