# FoxRunner Frontend

Angular 21 + PrimeNG 21 client for the [FoxRunner backend](https://github.com/Foxugly/FoxRunner_server).

## Prerequisites

- Node.js 22+
- npm 10+
- A running FoxRunner backend on `http://127.0.0.1:8000`

## Setup

```bash
npm install
npm run gen:api       # requires backend to be up; writes src/app/core/api/schema.ts
npm start             # http://localhost:4200
```

## Scripts

- `npm start` — dev server on :4200.
- `npm run build` — production build to `dist/fox-runner`.
- `npm run lint` — Angular ESLint + Prettier compatibility.
- `npm run format` — Prettier write on `src/`.
- `npm run gen:api` — regenerate OpenAPI types from the live backend.
- `npm run gen:api:file` — regenerate from `./openapi.local.json` (offline fallback).
- `ng test --watch=false` — run unit tests (vitest + jsdom).

## Docs

- Architecture & conventions: [CLAUDE.md](./CLAUDE.md).
- Implementation plan: [docs/superpowers/plans/2026-04-22-foxrunner-frontend-phase-1-2.md](./docs/superpowers/plans/2026-04-22-foxrunner-frontend-phase-1-2.md).
- Backend API reference: see the `docs/` folder of the [FoxRunner_server](https://github.com/Foxugly/FoxRunner_server) repo (notably `API.md`, `FRONTEND.md`, `ADR_TIMEZONES.md`, `SECURITY.md`, `SCHEMA.md`).
