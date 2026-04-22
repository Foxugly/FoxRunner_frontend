# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Angular 21 + PrimeNG 21 frontend for the FoxRunner automation engine. The backend (FastAPI) lives in a separate repo: https://github.com/Foxugly/FoxRunner_server (local clone expected at `D:\PycharmProjects\FoxRunner_server` for live development).

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
```

The backend must be running on port 8000 for `npm run gen:api` and for the app to be functional.

## Architecture

### Layering
- `src/app/core/api/` — **generated** OpenAPI types (`schema.ts`, regenerated, never edited by hand) + hand-written Angular `*Service` classes wrapping `HttpClient`. Each service consumes one resource area (`scenarios`, `slots`, `jobs`, `history`, `plan`, `step-collections`, `users`, `timezones`). Shared helpers in `api-base.ts`, common domain aliases in `types.ts`.
- `src/app/core/auth/` — `AuthService` (memory-only JWT signal, **no localStorage**), `authGuard`, `superuserGuard`.
- `src/app/core/http/` — HTTP interceptors: `authInterceptor` (adds `Authorization: Bearer …` and `X-Request-ID` UUID), `errorInterceptor` (routes errors to PrimeNG toasts, logs `X-Request-ID`, handles 401 → redirect to `/login`).
- `src/app/core/config/` — `ClientConfigService` bootstrapped via `provideAppInitializer` (fetches `/config/client`).
- `src/app/core/utils/` — `newIdempotencyKey()` (UUIDv4 for `POST /scenarios`, `POST /slots`, `POST …/jobs`).
- `src/app/shared/` — `ApiDatePipe` (UTC → `currentUser.timezone_name`), standalone components `PageHeader`, `EmptyState`, `StatusTag`, `JsonEditor`.
- `src/app/features/` — one folder per feature area (auth, dashboard, profile, scenarios, slots, jobs, history, plan). All components are standalone. Lazy loading wired in `app.routes.ts`.

### Non-negotiable contract with the backend
- **Login** uses `application/x-www-form-urlencoded` with body `username=<email>&password=<pwd>`. Not JSON.
- **JWT in memory** only (`signal<string | null>` in `AuthService`). Expires on page reload by design — the backend doesn't expose refresh tokens.
- **All timestamps are UTC ISO 8601.** Display via `| apiDate` in the user's `timezone_name` (IANA). The pipe falls back to `environment.defaultTimezone` when no user is loaded.
- **Slot `start`/`end` values (`"08:00"`)** are **local business times**. Never convert them to UTC in the UI. The backend's planner resolves them.
- **Error shape:** `{ code, message, details }`. The `errorInterceptor` shows `message` in a toast and appends `Request-ID: …` for support.
- **Pagination envelope:** `{ items, total, limit, offset }` maps to PrimeNG table `value` / `totalRecords` / `rows` / `first`.
- **Idempotency-Key** header is set on `POST /scenarios`, `POST /slots`, `POST /users/{id}/scenarios/{id}/jobs` via `newIdempotencyKey()` generated per user action (not per retry).

### Angular 21 conventions in use
- Class is `App` (not `AppComponent`) in `app.ts` (scaffold default for Angular 20+).
- `@if` / `@for` control flow — no `*ngIf` / `*ngFor`.
- Signals for local component state; `computed()` for derivations; `RxJS` reserved for HTTP streams and long-lived subscriptions.
- `provideHttpClient(withInterceptors([...]))` for the interceptor chain.
- `provideAppInitializer(() => inject(ClientConfigService).load())` to bootstrap `/config/client`.
- PrimeNG theme via `providePrimeNG({ theme: { preset: Aura } })` (from `@primeuix/themes`). `@primeng/themes` is deprecated and must not be reintroduced.
- PrimeNG Tabs API: `<p-tabs><p-tablist><p-tab>…</p-tab></p-tablist><p-tabpanels><p-tabpanel>…</p-tabpanel></p-tabpanels></p-tabs>`. The old `<p-tabView>` / `TabViewModule` does not exist in PrimeNG 21.
- Forms: Reactive Forms (`FormBuilder.nonNullable.group(...)`) for anything with validation. `ngModel` for simple one-off inputs where reactive forms are overkill. Avoid mixing `[(ngModel)]="signal"` — signals don't work as two-way bindings directly.

### Known quirks
- Prod build warns on initial bundle size (~1.1 MB). The error threshold in `angular.json` is 2 MB; the warning is expected given PrimeNG + icons. Don't lower without checking the budget works.
- Monaco and its `dompurify` dep emit moderate `npm audit` warnings — they are client-side UI only; don't run `npm audit fix --force` (breaks Monaco).
- `openapi-typescript` may fail on IPv6-only localhost; use `npm run gen:api:file` with a local copy of `openapi.json` as fallback.

## Testing

- Test runner: **vitest** (not Karma/Jasmine). Configured via `@angular/build:unit-test`. Globals (`describe`, `it`, `expect`) are available from `vitest/globals`.
- Unit test targets that must keep passing: `AuthService`, `authInterceptor`, `ApiDatePipe`, `newIdempotencyKey`, `App` smoke.
- Run with `ng test --watch=false`. Do not pass `--browsers=…` (vitest runs in jsdom; browser adapter packages are not installed).

## Plans

Implementation plans live in `docs/superpowers/plans/`. The current baseline plan is `2026-04-22-foxrunner-frontend-phase-1-2.md` covering Phases 1 and 2 (MVP + scenario CRUD + step-collections + shares). Phases 3 (admin) and 4 (password reset, dark mode, i18n fr/en) are deferred.
