# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Angular 21 + PrimeNG 21 frontend for the FoxRunner automation engine. The backend (Django + Django Ninja, previously FastAPI) lives in a separate repo: https://github.com/Foxugly/FoxRunner_server. The wire contract was intentionally preserved when the backend migrated from FastAPI to Django — see the **Backend migration notes** section below for the practical consequences.

- API base URL (dev): `http://127.0.0.1:8000/api/v1` — **always** use the `/api/v1` prefix, never legacy routes.
- Dev server: `http://localhost:4200` (backend CORS whitelists this origin).
- UI language: French (`fr-BE`). Doc language: English.

## Core commands

```bash
npm install              # install dependencies
npm start                # ng serve on :4200
npm run build            # production build
npm run lint             # Angular ESLint (strict config, must pass)
npm run format           # Prettier write (src only)
npm run gen:api          # regenerate src/app/core/api/schema.ts from the live backend
npm run gen:api:file     # regenerate from ./openapi.local.json if backend is down
ng test --watch=false    # run all vitest tests once (headless jsdom)
npm run e2e              # run Playwright smoke (backend + dev server must be reachable)
npm run e2e:install      # one-off: install Chromium for Playwright
```

The backend must be running on port 8000 for `npm run gen:api`, for the app to be functional, and for `npm run e2e`.

## Architecture

### Layering
- `src/app/core/api/` — **generated** OpenAPI types (`schema.ts`, regenerated, never edited by hand) + hand-written Angular `*Service` classes wrapping `HttpClient`. One service per resource area (`scenarios`, `slots`, `jobs`, `history`, `plan`, `step-collections`, `timezones` [static list, no HTTP], `admin`, `artifacts`, `graph`, `auth-password`). Shared helpers in `api-base.ts`, domain aliases in `types.ts` — the aliases insulate the rest of the codebase from the `FooPayload` → `FooIn`/`FooOut`/`FooPage` rename that came with the Django migration.
- `src/app/core/auth/` — `AuthService` (memory-only JWT signal, **no localStorage**), `authGuard`, `superuserGuard`.
- `src/app/core/http/` — interceptors: `authInterceptor` (adds `Authorization: Bearer …` + `X-Request-ID` UUID), `errorInterceptor` (toast + 401 redirect + `X-Request-ID` logging, reports success/failure to `NetworkHealthService`, falls back to `{detail}` shape if the Ninja default handler is ever hit). `NetworkHealthService` tracks consecutive non-auth failures and exposes an `offline` signal used by the red banner in the shell.
- `src/app/core/i18n/` — `primeNgFrenchTranslation` dictionary passed to `providePrimeNG({ translation: … })` (calendar, table, aria labels). `common-timezones.ts` is a curated IANA list (with `Intl.supportedValuesOf('timeZone')` when available) that replaces the removed `/timezones/common` endpoint.
- `src/app/core/theme/` — `ThemeService` signal, persists light/dark in `localStorage`, toggles `.fox-dark` on `<html>`.
- `src/app/core/utils/` — `newIdempotencyKey()` (UUIDv4 for `POST /scenarios`, `POST /slots`, `POST …/jobs`).
- `src/app/shared/` — `ApiDatePipe` (UTC → `currentUser.timezone_name`), standalone components `PageHeader`, `EmptyState`, `StatusTag`, `JsonEditor`.
- `src/app/features/` — one folder per feature area (auth, dashboard, profile, scenarios, slots, jobs, history, plan, admin/**). All components are standalone. Lazy loading wired in `app.routes.ts`.

### Non-negotiable contract with the backend
- **Login** uses `application/x-www-form-urlencoded` with body `username=<email>&password=<pwd>`. Not JSON. The Django backend mirrors the old FastAPI OAuth2PasswordBearer flow verbatim.
- **JWT in memory** only (`signal<string | null>` in `AuthService`). Expires on page reload by design — the backend does not expose refresh tokens.
- **All timestamps are UTC ISO 8601.** Display via `| apiDate` in the user's `timezone_name` (IANA). The pipe falls back to `environment.defaultTimezone` when no user is loaded.
- **Slot `start`/`end` values (`"08:00"`)** are **local business times**. Never convert them to UTC in the UI. The backend's planner resolves them.
- **Error shape:** `{ code, message, details }` at runtime. Codes: `bad_request` (400), `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `payload_too_large` (413), `validation_error` (422), `rate_limited` (429), `internal_error` (5xx). The Django OpenAPI does **not** document these as schemas because Ninja's `exception_handler` decorators don't surface in the spec — the interceptor therefore reads the body defensively and also understands Ninja's default `{detail: "..."}` as a fallback.
- **Pagination envelope:** `{ items, total, limit, offset }` maps to PrimeNG table `value` / `totalRecords` / `rows` / `first`.
- **Idempotency-Key** header is set on `POST /scenarios`, `POST /slots`, `POST /users/{id}/scenarios/{id}/jobs` via `newIdempotencyKey()` generated per user action (not per retry).

### Angular 21 conventions in use
- Class is `App` (not `AppComponent`) in `app.ts` (scaffold default for Angular 20+).
- `@if` / `@for` control flow — no `*ngIf` / `*ngFor`.
- Signals for local component state; `computed()` for derivations; `RxJS` reserved for HTTP streams and long-lived subscriptions.
- `provideHttpClient(withInterceptors([...]))` for the interceptor chain.
- PrimeNG theme via `providePrimeNG({ theme: { preset: Aura } })` (from `@primeuix/themes`). `@primeng/themes` is deprecated and must not be reintroduced.
- PrimeNG Tabs API: `<p-tabs><p-tablist><p-tab>…</p-tab></p-tablist><p-tabpanels><p-tabpanel>…</p-tabpanel></p-tabpanels></p-tabs>`. The old `<p-tabView>` / `TabViewModule` does not exist in PrimeNG 21.
- Forms: Reactive Forms (`FormBuilder.nonNullable.group(...)`) for anything with validation. `ngModel` for simple one-off inputs where reactive forms are overkill. Avoid mixing `[(ngModel)]="signal"` — signals don't work as two-way bindings directly.

### Known quirks
- Prod build warns on initial bundle size (~1.1 MB). The error threshold in `angular.json` is 2 MB; the warning is expected given PrimeNG + icons. Don't lower without checking the budget works.
- Monaco and its `dompurify` dep emit moderate `npm audit` warnings — they are client-side UI only; don't run `npm audit fix --force` (breaks Monaco).
- `openapi-typescript` may fail on IPv6-only localhost; use `npm run gen:api:file` with a local copy of `openapi.json` as fallback.

## Testing

- **Unit**: vitest (not Karma/Jasmine). Configured via `@angular/build:unit-test`. Globals (`describe`, `it`, `expect`) available from `vitest/globals`. Run with `ng test --watch=false`. Do not pass `--browsers=…` — no browser adapter package is installed; jsdom is used.
- **Unit coverage** (26 tests): `AuthService`, `authInterceptor`, `ApiDatePipe`, `newIdempotencyKey`, `ScenariosService`, `SlotsService`, `JobsService`, `NetworkHealthService`, `App` smoke.
- **E2E**: Playwright in `e2e/`. `playwright.config.ts` auto-starts `ng serve` on 4200 unless `E2E_SKIP_WEBSERVER=1`. Tests require the backend to be reachable and the admin account to exist. Credentials default to `admin@local` / `admin1234` (Django bootstrap default); override with `E2E_EMAIL` and `E2E_PASSWORD` env vars. Run `npm run e2e:install` once to download Chromium.

## Feature coverage

- **Phase 1 (MVP)**: login (with forgot-password link), dashboard, profile (timezone), scenarios list+detail, slots CRUD, jobs list+detail with auto-refresh, history with filters, plan with countdown.
- **Phase 2**: scenario create/edit with JSON editor, step-collections CRUD (5 collections), scenario shares, duplicate/delete, idempotency keys.
- **Phase 3 (admin, gated by `superuserGuard`)**: `/admin` landing, users (toggle is_active/is_superuser/is_verified), settings (JSON-valued key/value store), audit log, health (config checks + DB stats + monitoring summary), retention purge, catalog export/import, artifacts browser + prune, Microsoft Graph subscriptions + notifications.
- **Phase 4 (polish)**: forgot/reset password flow, dark-mode toggle persisted in `localStorage`, PrimeNG `fr-BE` translations, offline banner (red strip when 3+ consecutive non-auth errors).

**Still deferred**: i18n fr/en switcher for app UI strings (PrimeNG internals are translated; the FoxRunner UI itself is French-only), Monaco-backed JSON editor (the textarea + validation + format button editor covers current needs).

## Backend migration notes (FastAPI → Django Ninja)

The Django backend preserves the wire contract byte-for-byte at runtime, but the OpenAPI schema exposed to `openapi-typescript` now uses Django Ninja's `In` / `Out` / `Page` naming convention instead of the old `*Payload`. The `src/app/core/api/types.ts` file aliases the old domain names (`ScenarioSummary`, `JobEvent`, etc.) onto the new generated types so feature code never sees the Ninja naming leak through.

Endpoints that used to exist and are gone (no replacement planned short-term):

| Removed endpoint | Frontend impact | Mitigation |
|---|---|---|
| `POST /auth/register` | Account creation flow | `/register` route, component, and login-page link removed. To re-enable, restore from git history (`feat(round3)` commit) once the endpoint lands again. |
| `GET /users/me/features` | "Feature flags" card on profile | Card removed. `UsersService` emptied to a stub so we can add new account endpoints there later. |
| `GET /timezones/common` | Timezone autocomplete on profile | `TimezonesService` now returns `Intl.supportedValuesOf('timeZone')` (fallback to a curated static list). Works offline. |
| `GET /config/client` | `ClientConfigService` bootstrap | `ClientConfigService` deleted. Defaults in `environment.ts` suffice; no runtime state was consumed elsewhere. |

When the Django team adds `default_response=ErrorResponse` at the `NinjaAPI` level, a plain `npm run gen:api` will expose a named `ErrorResponse` schema — at that point the `ApiErrorBody` shape in `errorInterceptor` can be swapped for the generated type without logic changes.

## Deployment

- `Dockerfile` is a multi-stage build: `node:22-alpine` for `npm ci` + `ng build --configuration production`, then `nginx:1.27-alpine` serving `dist/fox-runner/browser` on port 80 with `nginx.conf` (SPA fallback, long cache on hashed assets, security headers mirroring the backend's).
- `.github/workflows/ci.yml` runs lint + vitest + prod build on every PR/push to `main`. On push to `main`, a second job builds the Docker image (no push) to validate the `Dockerfile` stays healthy.

## Plans

Implementation plans live in `docs/superpowers/plans/`. The baseline plan is `2026-04-22-foxrunner-frontend-phase-1-2.md`; Phases 3+4+round 3 landed directly in follow-up commits without a written plan on disk.
