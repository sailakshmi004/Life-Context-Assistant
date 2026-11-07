# Awarely — Life Context Assistant

> A context-aware activity reminder web application that considers external conditions (such as weather) before reminding users to take action.

---

## 1. Product Vision

Unlike ordinary static reminder applications, **Awarely** bridges the gap between scheduled activities and the dynamic physical world. 

### Core Example:
* A user schedules a **"Drying Clothes"** activity for today at **2:00 PM (120 minutes)** in the backyard.
* Awarely's context engine continuously checks the localized weather forecast for that time slot.
* If a rain shower (e.g. 75% precipitation) is predicted between 2:30 PM and 5:00 PM, Awarely surfaces an **Attention Needed** alert warning the user to move laundry indoors or adjust their schedule.

---

## 2. Technology Stack

* **Frontend:** [Next.js](https://nextjs.org/) (App Router, React 18)
* **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend:** Next.js Route Handlers (`app/api/`)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Database & Auth:** Supabase PostgreSQL & Supabase Auth *(configured in Phase 2)*
* **Weather Service:** WeatherAPI *(configured in Phase 2)*
* **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`)
* **Deployment Target:** Vercel

---

## 3. Project Architecture

The repository follows Next.js App Router conventions with a modular layered architecture:

```
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow (lint, type-check, build)
├── app/
│   ├── api/
│   │   └── health/            # Route Handler: GET /api/health
│   ├── activities/            # Activities management page
│   ├── dashboard/             # Dashboard overview page
│   ├── notifications/         # Context alerts & notification feed
│   ├── settings/              # Settings & integration architecture
│   ├── weather/               # Weather context & forecast timeline
│   ├── globals.css            # Tailwind directives & theme setup
│   ├── layout.tsx             # Root layout with responsive AppShell
│   └── page.tsx               # Root route pointing to DashboardView
├── components/
│   ├── activities/
│   │   └── AddActivityModal.tsx # Interactive modal to schedule activities
│   ├── dashboard/
│   │   ├── AttentionNeededCard.tsx # Context conflict banner & alerts
│   │   ├── DashboardView.tsx       # Main dashboard layout controller
│   │   ├── TodaysActivities.tsx    # List of today's tracked tasks
│   │   ├── UpcomingReminders.tsx   # Chronological reminder timeline
│   │   └── WelcomeBanner.tsx       # Summary banner & quick metrics
│   ├── layout/
│   │   ├── AppShell.tsx       # Responsive layout controller (mobile + desktop)
│   │   ├── Header.tsx         # Top bar with title, live date & user profile
│   │   └── Sidebar.tsx        # Navigation sidebar with active route states
│   └── ui/
│       ├── Badge.tsx          # Reusable status & category badges
│       ├── Button.tsx         # Accessible polymorphic button component
│       ├── Card.tsx           # Standardized container card component
│       └── Modal.tsx          # Accessible modal dialog with backdrop
├── lib/
│   ├── mock-data.ts           # Realistic Phase 1 mock dataset
│   ├── utils.ts               # Class merging (cn) & date formatting helpers
│   ├── rules/
│   │   └── engine.ts          # Core context rule evaluator (weather vs schedule)
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client placeholder
│   │   └── server.ts          # Server Supabase client placeholder
│   └── weather/
│       └── client.ts          # WeatherAPI client placeholder with mock fallback
├── types/
│   └── index.ts               # TypeScript interfaces for activities, weather & rules
├── tests/
│   └── rules-engine.test.ts   # Unit test suite scaffold
├── .env.example               # Environment variables template
├── package.json               # Dependencies and build scripts
├── postcss.config.js          # PostCSS configuration
├── tailwind.config.ts         # Tailwind theme & color extensions
└── tsconfig.json              # TypeScript strict configuration
```

---

## 4. Getting Started Locally

### Prerequisites
* **Node.js**: v18.17+ or v20+ recommended
* **npm**: v9+ or v10+

### Step-by-Step Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/awarely.git
   cd awarely
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   *(In Phase 1, mock data is used by default even if `.env.local` is untouched).*

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Verify API Route:**
   Visit [http://localhost:3000/api/health](http://localhost:3000/api/health) to inspect the health check endpoint.

---

## 5. Quality & CI Verification

Before pushing to GitHub or opening a pull request, run the verification scripts:

```bash
# 1. Static code analysis (ESLint)
npm run lint

# 2. Strict TypeScript type check
npm run type-check

# 3. Production Next.js build
npm run build
```

---

## 6. GitHub Actions CI Workflow

The workflow at `.github/workflows/ci.yml` automatically triggers on:
* Any **pull request** targeting `main`
* Any direct **push** to `main`

It verifies:
1. Clean dependency installation via `npm ci`
2. Static analysis with `npm run lint`
3. Type checks with `npm run type-check` (`tsc --noEmit`)
4. Production bundle compilation with `npm run build`
