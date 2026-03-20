# MediFlow

**Clinical decision support for Postpartum Hemorrhage risk prediction.**

`Go 1.24` · `React 19` · `TypeScript` · `PostgreSQL` · `Clerk` · `Docker`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Prerequisites](#3-prerequisites)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [Make Commands](#6-make-commands)
7. [Admin Setup](#7-admin-setup)
8. [Project Structure](#8-project-structure)
9. [Database Schema](#9-database-schema)
10. [Adding New Features](#10-adding-new-features)
11. [The ML Model Service](#11-the-ml-model-service)
12. [Clerk Configuration](#12-clerk-configuration)
13. [Resend Configuration](#13-resend-configuration)
14. [Deployment](#14-deployment)
15. [Security Notes](#15-security-notes)

---

## 1. Project Overview

MediFlow is a web application for healthcare facilities that enables clinicians to assess the risk of **Severe Postpartum Hemorrhage (PPH)** in real time. Clinicians enter five clinical inputs at the point of care and receive an immediate **HIGH** or **LOW** risk prediction, empowering faster, evidence-based responses.

### Who uses MediFlow

| Role | Capabilities |
|------|-------------|
| **Admin** | Register clinicians, manage user accounts, view system-wide statistics |
| **Doctor** | Add patients, run PPH risk assessments, view full assessment history |
| **Midwife** | Add patients, run PPH risk assessments, view full assessment history |
| **Nurse** | Add patients, run PPH risk assessments, view full assessment history |

### PPH Prediction Model

The model is a scikit-learn logistic regression classifier trained on clinical delivery data. It takes **5 inputs**:

| Input | Type | Description |
|-------|------|-------------|
| `duration_labour_min` | float | Total duration of labour in minutes |
| `hiv_status_num` | 0 or 1 | Patient HIV status (0 = Negative, 1 = Positive) |
| `parity_num` | int | Number of previous live births |
| `booked_unbooked` | 0 or 1 | Whether the patient was booked for antenatal care (0 = Booked, 1 = Unbooked) |
| `delivery_method_clean_LSCS` | 0 or 1 | Delivery method (0 = Vaginal, 1 = LSCS/Caesarean) |

It returns a **binary prediction** (`0` = No Severe PPH, `1` = Severe PPH), the probability of each outcome, and a `risk_level` string (`"LOW"` or `"HIGH"`).

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Docker Network                          │
│                                                              │
│  ┌─────────────────┐    ┌──────────────────┐                 │
│  │  React Frontend │    │   Go + Gin API   │    ┌──────────┐ │
│  │  Vite + TS      │───▶│   (Port 8081)    │───▶│  Python  │ │
│  │  (Port 5173)    │    │   REST JSON API  │    │  FastAPI │ │
│  │  Clerk + Redux  │    │   Bearer JWT     │    │  :8000   │ │
│  └─────────────────┘    └────────┬─────────┘    └──────────┘ │
│                                  │                            │
└──────────────────────────────────┼────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
    ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐
    │  Neon PostgreSQL │  │  Clerk Auth  │  │  Resend (Email)  │
    │  (External)      │  │  (External)  │  │  (External)      │
    └──────────────────┘  └──────────────┘  └──────────────────┘
```

| Service | Technology | Role |
|---------|-----------|------|
| `frontend` | React 19, TypeScript, Vite, Clerk React SDK, TanStack Query, Redux Toolkit, Tailwind CSS v3, DaisyUI v4 | Single-page application — UI, routing, role-based access, auth token injection |
| `app` | Go 1.24, Gin | JSON REST API — business logic, JWT verification, database access, Clerk admin ops, Resend email |
| `model_service` | Python 3.11, FastAPI, scikit-learn | ML inference sidecar — loads the logistic regression model and exposes `/predict` |

### API Flow

1. User logs in via Clerk on the React frontend
2. Frontend attaches a Clerk JWT as `Authorization: Bearer <token>` on every API call
3. Go API verifies the JWT using Clerk's JWKS, looks up the user in the DB, checks `is_active`
4. Go API proxies assessment requests to the Python model service at `http://model_service:8000/predict`
5. Results are stored in PostgreSQL and returned to the frontend

---

## 3. Prerequisites

- [Go 1.24+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/) and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)
- [Make](https://www.gnu.org/software/make/)
- A [Neon](https://neon.tech) PostgreSQL database (free tier sufficient)
- A [Clerk](https://clerk.com) account with an application configured
- A [Resend](https://resend.com) account with a verified sender domain
- The trained model file `final_lr_model.joblib` (see [§11](#11-the-ml-model-service))

---

## 4. Getting Started

### Step 1 — Clone the repository

```bash
git clone <repository-url>
cd mediflow
```

### Step 2 — Configure backend environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in all values. See [§5 Environment Variables](#5-environment-variables) for details.

### Step 3 — Configure frontend environment variables

```bash
cp frontend/.env.example frontend/.env
```

Open `frontend/.env` and set your Clerk publishable key:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Step 4 — Place the ML model file

The model file is **not committed** to the repository. Place it at:

```
model_service/model/final_lr_model.joblib
```

Contact the project maintainer or ML engineer to obtain this file.

### Step 5 — Start all services

```bash
make dev
```

This builds and starts three containers: `frontend` (Vite dev server on port 5173), `app` (Go API with Air hot-reload on port 8081), and `model_service` (Python FastAPI on port 8000).

### Step 6 — Run database migrations

```bash
make migrate-up
```

This applies all pending Goose SQL migrations to your Neon PostgreSQL database.

### Step 7 — Create the first Admin user

See [§7 Admin Setup](#7-admin-setup).

### Step 8 — Open the application

Navigate to **http://localhost:5173** and log in with the admin credentials.

---

## 5. Environment Variables

### Backend — `.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ENV` | Application environment. Set to `production` in prod. | `development` |
| `APP_PORT` | Port the Go server listens on inside Docker. | `8081` |
| `DATABASE_URL` | Neon PostgreSQL connection string with SSL. | `postgresql://user:pass@host/db?sslmode=require` |
| `CLERK_PUBLISHABLE_KEY` | Clerk frontend publishable key. | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk backend secret key for JWT verification and admin API. | `sk_test_...` |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret. | `whsec_...` |
| `RESEND_API_KEY` | Resend API key for transactional email. | `re_...` |
| `RESEND_FROM_EMAIL` | Sender address (must use verified Resend domain). | `noreply@yourhospital.org` |
| `MODEL_SERVICE_URL` | Internal Docker URL of the Python model sidecar. | `http://model_service:8000` |
| `FRONTEND_URL` | Frontend origin for CORS allow-list. | `http://localhost:5173` |

### Frontend — `frontend/.env`

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key for the React SDK. | `pk_test_...` |

---

## 6. Make Commands

| Command | Description |
|---------|-------------|
| `make dev` | Build and start all three containers (frontend, app, model_service) |
| `make down` | Stop and remove all containers |
| `make migrate-up` | Apply all pending database migrations |
| `make migrate-down` | Roll back the last migration |
| `make migrate-status` | Show current migration status |
| `make logs` | Tail logs from all running containers |
| `make ps` | Show container status |
| `make frontend-install` | Install frontend npm dependencies |
| `make frontend-dev` | Run Vite dev server locally (outside Docker) |
| `make frontend-build` | Build frontend for production |

---

## 7. Admin Setup

The first admin account must be created manually — self-registration is disabled.

**Step 1 — Create the user in Clerk**

Go to [Clerk dashboard](https://dashboard.clerk.com) → Users → Create user. Set an email address and a temporary password. Copy the user's **Clerk User ID** (format: `user_XXXXXXXXXXXXXXXXXXXXXXXX`).

**Step 2 — Insert the user into your database**

Connect to your Neon PostgreSQL database and run:

```sql
INSERT INTO users (clerk_user_id, full_name, email, phone_number, role, password_reset_required)
VALUES (
  'user_YOUR_CLERK_ID_HERE',
  'Admin Name',
  'admin@yourhospital.org',
  '+256700000000',
  'admin',
  false
);
```

**Step 3 — Log in**

Navigate to **http://localhost:5173** and sign in. You will be redirected to the Admin Dashboard at `/admin/dashboard`.

---

## 8. Project Structure

```
mediflow/
│
├── frontend/                        # React 19 + TypeScript SPA
│   ├── public/
│   │   └── favicon.svg              # MediFlow medical cross favicon
│   ├── src/
│   │   ├── api/                     # Axios API clients per domain
│   │   │   ├── axios.ts             # Configured client with Clerk Bearer token interceptor
│   │   │   ├── auth.ts              # /auth/me, /auth/complete-password-reset
│   │   │   ├── admin.ts             # /admin/dashboard, /admin/users
│   │   │   ├── patients.ts          # /patients CRUD
│   │   │   └── assessments.ts       # /patients/:id/assessments, /dashboard
│   │   ├── components/
│   │   │   ├── common/              # Layout, Sidebar, Navbar, ErrorBoundary, skeletons, badges
│   │   │   └── forms/               # PatientForm, AssessmentForm (reusable)
│   │   ├── hooks/
│   │   │   ├── useAuth.ts           # Combines Clerk + DB user into single auth state
│   │   │   └── useNotification.ts   # Dispatches timed toast notifications
│   │   ├── pages/
│   │   │   ├── admin/               # AdminDashboardPage, UsersPage, RegisterUserPage
│   │   │   ├── assessments/         # NewAssessmentPage, AssessmentResultPage
│   │   │   ├── auth/                # LoginPage, PasswordResetPage
│   │   │   ├── clinician/           # ClinicianDashboardPage
│   │   │   ├── errors/              # NotFoundPage, ForbiddenPage
│   │   │   └── patients/            # PatientsListPage, PatientDetailPage, AddPatientPage, EditPatientPage
│   │   ├── store/                   # Redux Toolkit store
│   │   │   └── slices/
│   │   │       ├── uiSlice.ts       # Sidebar state, page title (sets document.title)
│   │   │       └── notificationSlice.ts  # Toast notification queue
│   │   ├── types/
│   │   │   └── index.ts             # Shared TypeScript interfaces (User, Patient, Assessment…)
│   │   ├── utils/
│   │   │   └── formatters.ts        # formatDate, formatMinutesToHours, formatHIVStatus, etc.
│   │   └── App.tsx                  # Route tree with RoleBasedRedirect and ProtectedRoute guards
│   ├── tailwind.config.js           # Custom mediflow DaisyUI theme + Andika font
│   ├── vite.config.ts               # Vite config with /api proxy to http://app:8081
│   └── .env.example                 # Frontend environment variable template
│
├── cmd/
│   └── server/
│       └── main.go                  # Application entry point — routes under /api/v1
│
├── internal/
│   ├── config/
│   │   └── config.go                # Reads environment variables into Config struct
│   ├── database/
│   │   └── database.go              # pgxpool connection setup
│   ├── handlers/                    # Gin JSON handlers
│   │   ├── helpers.go               # StandardError, ValidationError, GetInitials
│   │   ├── auth_handler.go          # GET /auth/me, POST /auth/complete-password-reset
│   │   ├── admin_handler.go         # Admin dashboard stats, user list, register, deactivate
│   │   ├── dashboard_handler.go     # Clinician stats (my patients, assessments, risk counts)
│   │   ├── patient_handler.go       # Patient CRUD
│   │   └── assessment_handler.go    # Assessment creation (calls model) + retrieval
│   ├── middleware/
│   │   ├── auth.go                  # RequireAuth (Bearer JWT), RequireRole
│   │   └── cors.go                  # CORS middleware reading FRONTEND_URL from config
│   ├── models/                      # Database structs and input/output types
│   │   ├── user.go
│   │   ├── patient.go
│   │   ├── assessment.go
│   │   └── dashboard.go
│   └── services/                    # Business logic and external integrations
│       ├── clerk_service.go         # JWT verification, Clerk user fetch
│       ├── clerk_admin_service.go   # Clerk user creation (admin ops)
│       ├── user_service.go          # DB CRUD for users + stats
│       ├── patient_service.go       # DB CRUD for patients + risk merge
│       ├── assessment_service.go    # Assessment creation (model call + DB) + clinician stats
│       ├── model_service.go         # HTTP client for Python prediction sidecar
│       └── resend_service.go        # Welcome email sending
│
├── migrations/                      # Goose SQL migrations (YYYYMMDDHHMMSS_name.sql)
│
├── model_service/
│   ├── main.py                      # FastAPI app — /health and /predict endpoints
│   ├── requirements.txt
│   ├── Dockerfile
│   └── model/                       # Place final_lr_model.joblib here (gitignored)
│
├── .air.toml                        # Air hot-reload config for Go development
├── .env.example                     # Backend environment variable template
├── .gitignore
├── CLERK_SETUP.md                   # Step-by-step Clerk dashboard configuration guide
├── docker-compose.yml               # Orchestrates frontend + app + model_service + migrate
├── Dockerfile                       # Multi-stage Go container (dev / migrate / builder / production)
├── go.mod
├── Makefile
└── README.md
```

---

## 9. Database Schema

MediFlow uses three tables managed by Goose migrations in `migrations/`.

### `users`

Stores all system accounts. Linked to Clerk via `clerk_user_id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key, `gen_random_uuid()` |
| `clerk_user_id` | TEXT | Clerk user ID (`user_...`), unique |
| `full_name` | TEXT | |
| `email` | TEXT | Unique |
| `phone_number` | TEXT | Nullable |
| `role` | TEXT | CHECK IN (`admin`, `doctor`, `midwife`, `nurse`) |
| `is_active` | BOOLEAN | Default true; deactivated users are rejected at login |
| `password_reset_required` | BOOLEAN | New clinicians must reset on first login |
| `created_at` / `updated_at` | TIMESTAMPTZ | `updated_at` maintained by trigger |

### `patients`

Patient records added by any authenticated user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `patient_id_number` | TEXT | Hospital-assigned ID, unique |
| `full_name` | TEXT | |
| `age` | INTEGER | |
| `date_of_admission` | DATE | |
| `added_by_user_id` | UUID | FK → `users.id` |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

### `assessments`

PPH risk predictions. Stores 5 model inputs and 4 model outputs per assessment.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `patient_id` | UUID | FK → `patients.id` |
| `assessed_by_user_id` | UUID | FK → `users.id` |
| `duration_labour_min` | NUMERIC | Model input |
| `hiv_status_num` | NUMERIC | Model input (0 or 1) |
| `parity_num` | INTEGER | Model input |
| `booked_unbooked` | INTEGER | Model input (0 or 1) |
| `delivery_method_clean_lscs` | INTEGER | Model input (0 or 1) |
| `prediction` | INTEGER | Model output (0 or 1) |
| `probability_no_pph` | NUMERIC | Model output (0.0–1.0) |
| `probability_severe_pph` | NUMERIC | Model output (0.0–1.0) |
| `risk_level` | TEXT | `'LOW'` or `'HIGH'` |
| `created_at` | TIMESTAMPTZ | |

---

## 10. Adding New Features

### Backend: add a new API endpoint

1. Add a method to the relevant service file in `internal/services/`
2. Add a handler function in `internal/handlers/`
3. Register the route in `cmd/server/main.go` — use `api.Use(middleware.RequireAuth(...))` for protected routes
4. Follow the `StandardError` / `ValidationError` pattern for consistent JSON error responses

### Frontend: add a new page

1. Add API functions to the relevant file in `frontend/src/api/`
2. Create the page component in `frontend/src/pages/<module>/`
3. Add the route in `frontend/src/App.tsx`
4. Call `dispatch(setPageTitle('...'))` in a `useEffect` at the top of the page component
5. Use `useQuery` for data fetching and show skeleton components while loading
6. Use `useNotification` for success/error toasts

### Add a new role

1. Write a migration adding the new role to the CHECK constraint on `users.role`
2. Add the constant to `models.Role` in `internal/models/user.go`
3. Add the role to the `RequireRole` call sites as needed
4. Update `frontend/src/types/index.ts` to add the role to the `Role` union type
5. Update `RoleBadge.tsx` to add the new role's badge style

---

## 11. The ML Model Service

The Python `model_service` runs a FastAPI server that loads the logistic regression model at startup and exposes two endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Returns `{"status": "ok"}` |
| `/predict` | POST | Returns a PPH risk prediction |

### Predict endpoint contract

**Request body:**
```json
{
  "duration_labour_min": 180.0,
  "hiv_status_num": 0.0,
  "parity_num": 1,
  "booked_unbooked": 0,
  "delivery_method_clean_LSCS": 0
}
```

**Response:**
```json
{
  "prediction": 0,
  "probability_no_pph": 0.87,
  "probability_severe_pph": 0.13,
  "risk_level": "LOW"
}
```

`risk_level` is `"HIGH"` when `prediction == 1`, `"LOW"` when `prediction == 0`.

### Test the model service directly

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"duration_labour_min": 180, "hiv_status_num": 0, "parity_num": 1, "booked_unbooked": 0, "delivery_method_clean_LSCS": 0}'
```

### Update the model

Replace `model_service/model/final_lr_model.joblib` with the new file (same 5-feature schema) and restart:

```bash
docker-compose restart model_service
```

---

## 12. Clerk Configuration

See [CLERK_SETUP.md](./CLERK_SETUP.md) for the full dashboard configuration guide. Key steps:

1. Create a new application at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy **Publishable Key** → `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env`
3. Copy **Publishable Key** → `CLERK_PUBLISHABLE_KEY` in `.env` (used by Go for JWKS endpoint)
4. Copy **Secret Key** → `CLERK_SECRET_KEY` in `.env`
5. In **Configure → Paths**: set Sign-in URL to `/login`, After sign-in URL to `/`
6. In **Configure → Restrictions**: enable **Allowlist** mode to disable self-registration
7. In **Configure → User & authentication**: enable Email + Password, disable Email verification for dev

### Webhook setup (optional — for future user-lifecycle events)

1. Clerk dashboard → Webhooks → Add endpoint
2. Point to `https://yourdomain.com/webhooks/clerk`
3. Copy **Signing Secret** → `CLERK_WEBHOOK_SECRET` in `.env`

For local development, expose your server with [ngrok](https://ngrok.com):
```bash
ngrok http 8081
```

---

## 13. Resend Configuration

1. Create an account at [resend.com](https://resend.com) → obtain API key → `RESEND_API_KEY`
2. Add and verify your sending domain
3. Set `RESEND_FROM_EMAIL` to an address on your verified domain

Welcome emails are sent automatically when the admin registers a new clinician. Email failures are **non-fatal** — the registration succeeds and the failure is logged.

---

## 14. Deployment

### Build production images

```bash
# Go API
docker build --target production -t mediflow-api:latest .

# React frontend
cd frontend && npm run build
# Serve the dist/ folder with nginx or your CDN
```

### Environment variable changes for production

- Set `APP_ENV=production` in the Go API — enables Gin release mode
- Set `FRONTEND_URL` to your production frontend origin for CORS
- Change `VITE_CLERK_PUBLISHABLE_KEY` to your production Clerk key (starts with `pk_live_`)
- Use your production Clerk secret key in `CLERK_SECRET_KEY`

### Deployment checklist

1. Run `make migrate-up` against the production database **before** deploying
2. Never commit `.env` files — use your hosting platform's secrets manager
3. Use a reverse proxy (nginx, Caddy) for TLS termination
4. Ensure the `model_service` is running and reachable at `MODEL_SERVICE_URL`
5. Seed the first admin user in the production database (see [§7](#7-admin-setup))

---

## 15. Security Notes

- **Never commit `.env`** files. Rotate any credentials accidentally exposed.
- **Model files are gitignored** — `model_service/model/` is excluded. Never commit `.joblib` files.
- **All SQL uses parameterised queries** — `$1`, `$2` via pgx. No user input is interpolated into SQL.
- **Role-based access control** — `RequireRole` middleware protects admin routes server-side. The frontend also guards routes with `ProtectedRoute`, but backend enforcement is the source of truth.
- **Clerk handles authentication** — passwords are never stored in MediFlow's database. The Clerk JWT is verified on every API request using Clerk's JWKS public key endpoint.
- **Bearer token model** — the frontend attaches `Authorization: Bearer <token>` on every API call. There are no cookies or sessions in the Go API.
- **New clinicians must reset their password** on first login — the `password_reset_required` flag is set by default and enforced by the frontend route guard and backend middleware.
- **Inactive users are rejected** — `is_active = false` users are denied at the `RequireAuth` middleware step, regardless of valid JWT.
