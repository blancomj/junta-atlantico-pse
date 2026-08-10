# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Payment platform for **Junta Regional de Calificación de Invalidez del Atlántico** (`juntaatlantico.co`), a Colombian entity. It integrates **PSE Avanza** (Colombian bank-debit payment rail, operated by **ACH Colombia**) per the official *Instructivo de Integración de Empresas al Servicio PSE — Versión 21* (Oct 2025). Two payment paths share the same PSE checkout flow:

1. **Single/individual payment** — public checkout at `/checkout`, no login required (a citizen pays one PSE transaction directly).
2. **Batch payments** ("pagos por lotes") — authenticated entity users upload an Excel file of beneficiaries, the system aggregates the total, and the user pays the aggregate via PSE. This is the newer, actively-developed part of the app (auth, roles, admin, MySQL persistence all exist to support it).

The full historical spec/design doc (huge) is `PROMPT_v3.md` at repo root — it documents the ACH v21 instructive requirements, all security controls, and the Hostinger deployment architecture in detail. Treat it as the source of truth for *why* a security/validation rule exists when the reasoning isn't obvious from code. `docs/` has trimmed reference docs: `API_REFERENCE.md`, `CERTIFICACION.md` (ACH certification test plan/checklist), `INSTALACION.md` (deploy — note: describes an older single-domain Nginx reverse-proxy setup; the *current* deploy target is the two-subdomain split described below).

## Repo layout

- `backend/` — Express + TypeScript API.
- `frontend/` — Vue 3 + Vite SPA.
- `shared/types/` — TypeScript types shared by both (`bank`, `config`, `errors`, `payment`, `transaction`, `pse-api`). Backend includes this dir directly in its `tsconfig.json` (`../shared/**/*.ts`, path alias `@shared/*`); frontend imports it via relative paths (e.g. `../../../shared/types/errors`).
- `scripts/build-zips.mjs` — cross-platform (no external `zip` binary) production packager. Compiles backend TS + builds frontend Vite bundle, then writes `deploy/backend.zip` and `deploy/frontend.zip` for manual upload to Hostinger.
- `deploy/` — output of the script above (gitignored build artifacts, currently checked in as sample zips).

## Commands

Backend (`cd backend`):
```
npm run dev              # ts-node server.ts (hot-reload dev server)
npm run build            # (no-op here — build is done via scripts/build-zips.mjs, see below)
npm start                # node dist/backend/server.js (run compiled output)
npm test                 # jest --forceExit --detectOpenHandles (unit tests under tests/)
npm run test:integration # jest tests/integration only
npx jest tests/encryption.test.ts        # run a single test file
npx jest -t "some test name"             # run tests matching a name
npm run typecheck        # tsc --noEmit
npm run lint              # eslint .
npm run migrate          # apply DB migrations (src/database/apply-migrations.ts) — prod DB
npm run migrate:dev       # same, against NODE_ENV=development
npm run seed              # src/database/seed.ts — creates a test entity/user
npm run db:copy-to-dev    # copy prod data to dev DB (src/database/copy-to-dev.ts)
```

Frontend (`cd frontend`):
```
npm run dev        # vite dev server, default port 5173, proxies /api -> http://localhost:3000
npm run build       # vue-tsc --noEmit && vite build
npm run typecheck   # vue-tsc --noEmit
npm run lint        # eslint .
```

Full production package (from repo root, needs both `node_modules` installed first):
```
node scripts/build-zips.mjs
```
This compiles the backend with `tsconfig.build.json` (excludes `tests/`), builds the frontend with Vite, and zips each for upload to Hostinger.

There is no root-level `package.json` — always `cd backend` or `cd frontend` first (or use `npm --prefix`).

## Architecture

### Backend: two coexisting layers

The backend has an **older flat layer** (pre-auth PSE-only implementation) and a **newer modular layer** (`src/modules/`) added on top for auth/admin/batch-payments. Both are wired into the same `server.ts`:

- Flat layer (original, individual-payment PSE flow only): `routes/pse.routes.ts`, `controllers/pse.controller.ts`, `services/{pse,token,encryption,bankList,doublePayment,recaptcha}.service.ts`, `middleware/*`, `validation/*`, `config/pse.config.ts`, `models/transaction.model.ts`, `errors/`, `utils/`. Mounted at `/api/pse`. Stateless (no persistence) — an individual payment's traceability code lives only for the duration of the polling/return flow.
- Modular layer (`src/modules/`), each with its own `controllers/routes/services/types`:
  - `auth/` — JWT (access token 30 min + DB-backed refresh token 7 days) login for entity users, mounted at `/api/auth`.
  - `admin/` — user management (create/invite/edit/toggle-active) for `role=admin`, mounted at `/api/admin`. Route-level `requireRole('admin')` guard.
  - `batch-payments/` — Excel upload → cached parse → persisted batch → pay → PSE async callback, mounted at `/api/batch-payments`.
  - `email/` — nodemailer wrapper (Office 365 SMTP) used for invitation/reset emails.
- `src/database/` — raw `mysql2` connection pool (no ORM), a small hand-rolled migration runner (`migrator.ts` reads `migrations/*.sql` in order, tracked in a migrations table) that runs automatically on server startup (see `startServer()` in `server.ts`), plus `seed.ts` / `copy-to-dev.ts` utility scripts.

**Auth data model** (MySQL, see `src/database/migrations/`): `entities` (the paying organization) → `entity_users` (people who log in, `role` = `admin`|`user`, has lockout/invitation/must-change-password fields) → `refresh_tokens`, `password_reset_tokens`. `audit_log` is a generic append-only table (not yet wired into most write paths — check before assuming an action is audited).

**Batch payments data model**: `batch_payments` (`estado`: `por_pagar`|`pagado`|`anulado`, has a 48h `expires_at` after which a payment can no longer be paid and should be auto-annulled by `batchPaymentService.expirePayments()` — confirm whether anything schedules this cron-style call, it's not wired into `server.ts`'s startup) → `batch_payment_beneficiaries` (one row per person in the uploaded Excel) and `batch_payment_attempts` (audit trail of pay attempts/callbacks). Uploaded Excel files are parsed and held in an **in-memory cache** (`excel-parser.service.ts`, 30 min TTL, max 50 entries) keyed by `fileId` — `POST /upload` returns a preview + `fileId`, and `POST /` (create) consumes that cached `fileId` to actually persist the batch + beneficiaries transactionally. This means uploaded-but-not-created batches are lost on server restart, by design.

**Batch payment PSE integration is currently a stub**: `BatchPaymentController.pay()` (`src/modules/batch-payments/controllers/batch-payment.controller.ts`) has a `// TODO: Call PSE service to create transaction` and returns a mocked CUS/URL instead of calling the real `pse.service.ts`. The real completion path (`POST /api/batch-payments/pse-callback`, HMAC-SHA256-signed via `PSE_CALLBACK_SECRET`, verified in `pse-callback.middleware.ts` using `express.raw()` + `timingSafeEqual`) is implemented and functional — only the transaction-creation call is mocked. When wiring this up for real, reuse the existing single-payment `pse.service.ts`/`token.service.ts`/`encryption.service.ts` rather than duplicating PSE client logic.

### ACH/PSE security requirements (Sección 11 ACH v21) — apply to the individual-payment flow, and should extend to batch once wired

- `userType=person` ⇒ `identificationType` must NOT be `NIT`; `userType=company` ⇒ it MUST be `NIT` (cross-field validation in `validation/schemas.ts`, zod).
- `description`, `reference1/2/3` must reject `|` and `"` (conflicts with ACH's fraud engine) — enforced in `middleware/sanitize.middleware.ts` (`checkForbiddenChars`).
- Sensitive fields (`identificationNumber`, `cellphoneNumber`, `email`, `address`, `description`) are AES-256-GCM encrypted before being sent to PSE (`services/encryption.service.ts`), format `{ciphertext}.{authTag}`.
- reCAPTCHA v3 required on `POST /api/pse/transaction` (frontend generates via `useReCaptcha.ts`/`recaptcha.service.ts`, sent as `X-Recaptcha-Token`; backend verifies in `middleware/recaptcha.middleware.ts` against `RECAPTCHA_SCORE_MIN`).
- Rate limiting: `POST /transaction` and `GET /banks` limited to configured req/min (`RATE_LIMIT_MAX_REQ`/`RATE_LIMIT_WINDOW_MS`); separate limiters exist for login/forgot-password/auth actions (`middleware/rateLimit.middleware.ts`).
- Double-payment detection keyed on `ticketId` (`services/doublePayment.service.ts`) — must return the exact ACH-mandated literal error text, not a paraphrase.
- Error messages for PSE `FAIL_*` codes are **literal ACH-mandated strings** — do not reword them; see `docs/API_REFERENCE.md` for the canonical table and `docs/CERTIFICACION.md` for the certification test matrix ACH will run against these.
- `soliciteDate` must be ISO 8601 with Colombia's fixed `-05:00` offset, not the server's local timezone.
- `app.set('trust proxy', 1)` in `server.ts` is required for rate limiting to see real client IPs behind Hostinger's Nginx — do not remove it when running behind a different proxy depth.

### Frontend

- Vue 3 + `<script setup>` + Pinia stores (`stores/auth.store.ts`, `stores/batch-payment.store.ts`, `stores/payment.store.ts`) + Vue Router with route guards (`guards/auth.guard.ts`: `requireAuth`, `requireAdmin`, `requireGuest`) — see `router/index.ts` for the full route table (public checkout, auth pages, `/admin/*`, `/dashboard` + `/batch-payments/*`).
- Two independent Axios clients exist: `services/api.service.ts` is scoped to `VITE_API_URL` (defaults to `.../api/pse`) with reCAPTCHA-injecting interceptors for the individual-payment endpoints; `services/auth.service.ts` derives `API_ROOT` by stripping the trailing `/pse` off that same base URL and talks to `/auth/*` — when adding new authenticated endpoints, follow the `auth.service.ts` pattern (it also owns the access/refresh token refresh-queue logic), not `api.service.ts`.
- `Checkout.vue` is shared by both flows: `/checkout` (individual) and `/checkout/:batchPaymentId` (batch) — behavior branches on whether `batchPaymentId` route param is present (see `handleSuccess`/`handleCancel` in that file).
- `composables/usePolling.ts` implements the transaction-status polling used after redirect back from the bank (`PaymentReturn.vue`), interval/attempts configured via `VITE_POLLING_INTERVAL_MS`/`VITE_MAX_POLLING_ATTEMPTS`.

### Deployment target: two independent Hostinger subdomains ("Opción B")

Confirmed by both `PROMPT_v3.md` §16-17 and `scripts/build-zips.mjs`:
- `pse.juntaatlantico.co` — static frontend build (`frontend/dist`), deployed as a Hostinger static Web App.
- `api.juntaatlantico.co` — backend as a pure JSON API (no static file serving), Hostinger Node.js Web App, start command `node dist/backend/server.js`.

`docs/INSTALACION.md`'s single-domain Nginx-reverse-proxy instructions predate this split — prefer the subdomain approach and `scripts/build-zips.mjs` output when doing deploy work, and treat `INSTALACION.md` as superseded unless told otherwise.

`.env` (prod) / `.env.development` hold real third-party credentials (PSE/ACH OAuth, MySQL, JWT secret, SMTP, reCAPTCHA) — both are gitignored; never print their contents back or commit them.
