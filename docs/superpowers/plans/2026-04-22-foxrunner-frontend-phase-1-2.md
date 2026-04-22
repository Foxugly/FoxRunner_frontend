# FoxRunner Frontend — Phases 1+2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Angular 21 + PrimeNG frontend for FoxRunner, covering Phase 1 (MVP: auth, profile, scenarios list/detail, slots CRUD, jobs, history) and Phase 2 (scenario create/edit, step-collections, shares, plan view, scenario actions, idempotency).

**Architecture:** Standalone components + signals, no NgRx. Typed API client split in two layers: `openapi-typescript`-generated DTO types (read-only, regenerated from `openapi.json`) and hand-written Angular services wrapping `HttpClient`. Auth via in-memory JWT signal (no localStorage). HTTP interceptors for Authorization header, `X-Request-ID` propagation, and error-to-toast. All timestamps UTC, converted via `apiDate` pipe to `currentUser.timezone_name`.

**Tech Stack:** Angular 21.2 (node 22), PrimeNG (theme Aura), PrimeFlex, PrimeIcons, `@angular/localize` (fr-BE), `openapi-typescript`, `ngx-monaco-editor-v2`. Karma+Jasmine for tests. ESLint+Prettier.

**Base paths:**
- CWD: `C:\Users\Renaud\WebstormProjects\FoxRunner_frontend`
- Backend: `http://127.0.0.1:8000` (must be running)
- API base URL: `http://127.0.0.1:8000/api/v1`
- Dev port: `4200` (CORS whitelisted backend-side)

---

## Critical Rules (from brief)

- `/api/v1` exclusively. Never hit legacy routes.
- JWT stored in **memory** (signal) — no localStorage.
- Login uses **form data** (`application/x-www-form-urlencoded`), body `username=<email>&password=<pwd>`.
- All protected calls add `Authorization: Bearer <token>`.
- All timestamps are UTC ISO 8601; display via `apiDate` pipe in user's `timezone_name`.
- Slot `start`/`end` (`"08:00"`) are **local business times** — never convert to UTC client-side.
- Error JSON: `{ code, message, details }` — display `message` in toast, log `X-Request-ID`.
- Pagination envelope: `{ items, total, limit, offset }`. Map to PrimeNG table `value/totalRecords/rows/first`.
- Idempotency: UUIDv4 per user action on `POST /scenarios`, `POST /slots`, `POST .../jobs`. Regenerate only when the user re-clicks "Create".
- No fallback silently — every API failure surfaces a toast (with `X-Request-ID` copyable).
- Commits in conventional-commit English. No push without explicit user approval.

---

## File Structure

```
src/app/
  core/
    api/
      schema.ts                # generated from openapi.json (read-only)
      scenarios.service.ts
      slots.service.ts
      jobs.service.ts
      history.service.ts
      users.service.ts
      config.service.ts
      timezones.service.ts
      step-collections.service.ts
      shares.service.ts
      plan.service.ts
    auth/
      auth.service.ts          # signal<{token, user}>, login/logout
      auth.guard.ts
      superuser.guard.ts
    http/
      auth.interceptor.ts      # Authorization + X-Request-ID
      error.interceptor.ts     # toast + 401 redirect
    config/
      client-config.service.ts # GET /config/client at bootstrap (APP_INITIALIZER)
    utils/
      idempotency.ts           # uuid v4 helper
  shared/
    pipes/api-date.pipe.ts
    components/
      page-header/
      empty-state/
      json-editor/             # wraps ngx-monaco-editor-v2
      status-tag/              # p-tag colored by job/history status
  features/
    auth/login/
    profile/
    dashboard/
    scenarios/
      list/
      detail/
      edit/
      step-collections-editor/
      shares/
    slots/
      list/
      edit-dialog/
    jobs/
      list/
      detail/
    history/
    plan/
  app.routes.ts
  app.config.ts
  app.component.ts             # shell: Menubar + Sidebar + <router-outlet>
```

---

## Task 1: Scaffold Angular project

**Files:** all project root.

- [ ] **Step 1.1:** In `C:\Users\Renaud\WebstormProjects\FoxRunner_frontend`, note existing `LICENSE`, `README.md`, `.idea/`, `CLAUDE.md`, `docs/`. The scaffold must be generated in place (not in a subfolder).

Run:
```bash
cd /c/Users/Renaud/WebstormProjects/FoxRunner_frontend
npx --yes @angular/cli@latest new fox-runner --directory=. --standalone --style=scss --routing --strict --ssr=false --package-manager=npm --skip-git
```
Notes: `--skip-git` because the repo already has git. `--directory=.` puts files in current dir; it will refuse if files like `README.md` conflict. If it refuses, temporarily move `README.md` and `LICENSE` to `docs/`, scaffold, then restore. If prompted for "new Angular style guide" say `Yes`.

- [ ] **Step 1.2:** After scaffold, verify `ls` shows `package.json`, `angular.json`, `src/`, `tsconfig.json`.

- [ ] **Step 1.3:** Commit scaffold.
```bash
git add -A
git commit -m "chore: scaffold Angular 21 standalone app"
```

## Task 2: Install runtime dependencies

- [ ] **Step 2.1:** Install PrimeNG stack and utilities.
```bash
npm install primeng primeicons primeflex @angular/localize uuid
npm install -D openapi-typescript @types/node @types/uuid
```

- [ ] **Step 2.2:** Install Monaco editor wrapper for JSON editing (Phase 2).
```bash
npm install ngx-monaco-editor-v2 monaco-editor
```

- [ ] **Step 2.3:** Commit.
```bash
git add package.json package-lock.json
git commit -m "chore(deps): add primeng, monaco, openapi-typescript, uuid, @angular/localize"
```

## Task 3: Configure Angular global styles, animations, i18n

**Files:**
- Modify: `angular.json` (styles + assets + locales)
- Modify: `src/styles.scss`
- Modify: `package.json` (scripts + locale)

- [ ] **Step 3.1:** In `angular.json`, under `projects.fox-runner.architect.build.options`:
  - `styles`: add `"node_modules/primeicons/primeicons.css"`, `"node_modules/primeflex/primeflex.css"`, keep `"src/styles.scss"`.
  - `assets`: add Monaco workers assets glob: `{ "glob": "**/*", "input": "node_modules/monaco-editor/min/vs", "output": "/assets/monaco/vs" }`.
  - `allowedCommonJsDependencies`: add `["monaco-editor"]`.

- [ ] **Step 3.2:** In `src/styles.scss`:
```scss
@use 'primeng/resources/themes/aura-light-amber/theme.css';

:root {
  --fox-primary: #D97706;
}

html, body { height: 100%; margin: 0; font-family: system-ui, sans-serif; }
```
(Aura Amber matches the "fox" palette. If that preset isn't published, fall back to `aura-light-orange` and override `--p-primary-500: #D97706`.)

- [ ] **Step 3.3:** In `package.json`, add scripts:
```json
"gen:api": "openapi-typescript http://127.0.0.1:8000/openapi.json -o src/app/core/api/schema.ts",
"gen:api:file": "openapi-typescript ../../../../../D:/PycharmProjects/FoxRunner_server/openapi.json -o src/app/core/api/schema.ts",
"lint": "ng lint",
"lint:fix": "ng lint --fix"
```

- [ ] **Step 3.4:** Enable `@angular/localize` polyfill. In `angular.json` under `projects.fox-runner.architect.build.options.polyfills`, ensure `"@angular/localize/init"` is first. In `src/main.ts` keep the default bootstrap.

- [ ] **Step 3.5:** Commit.
```bash
git add angular.json package.json src/styles.scss
git commit -m "chore(ui): wire primeng aura theme, primeflex, primeicons, monaco assets"
```

## Task 4: Environment files

**Files:**
- Create: `src/environments/environment.ts`
- Create: `src/environments/environment.prod.ts`
- Modify: `angular.json` (fileReplacements for production)

- [ ] **Step 4.1:** Create `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
  defaultTimezone: 'Europe/Brussels',
  defaultLocale: 'fr-BE',
} as const;
```

- [ ] **Step 4.2:** Create `src/environments/environment.prod.ts` with same shape, `production: true`, `apiBaseUrl` pointing to `/api/v1` (relative — deployed behind same origin by default).

- [ ] **Step 4.3:** In `angular.json`, under `projects.fox-runner.architect.build.configurations.production`, add:
```json
"fileReplacements": [
  { "replace": "src/environments/environment.ts", "with": "src/environments/environment.prod.ts" }
]
```

- [ ] **Step 4.4:** Commit.
```bash
git add src/environments angular.json
git commit -m "chore: add environment files"
```

## Task 5: Generate OpenAPI types

**Files:** `src/app/core/api/schema.ts` (generated, do not edit by hand).

- [ ] **Step 5.1:** Ensure backend responds on `http://127.0.0.1:8000/openapi.json`. If not, use the local file at `D:\PycharmProjects\FoxRunner_server\openapi.json`.

- [ ] **Step 5.2:** Run:
```bash
mkdir -p src/app/core/api
npm run gen:api
```
If the URL fetch fails, copy the file directly:
```bash
cp /d/PycharmProjects/FoxRunner_server/openapi.json openapi.local.json
npx openapi-typescript ./openapi.local.json -o src/app/core/api/schema.ts
rm openapi.local.json
```

- [ ] **Step 5.3:** Verify `schema.ts` is >500 lines and exports `paths`, `components`, `operations`.

- [ ] **Step 5.4:** Commit.
```bash
git add src/app/core/api/schema.ts package.json
git commit -m "feat(api): generate typed schema from openapi.json"
```

## Task 6: ESLint + Prettier

- [ ] **Step 6.1:** Add Angular ESLint:
```bash
ng add @angular-eslint/schematics --skip-confirmation
```

- [ ] **Step 6.2:** Install Prettier:
```bash
npm install -D prettier eslint-config-prettier
```

- [ ] **Step 6.3:** Create `.prettierrc.json`:
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

- [ ] **Step 6.4:** Add `"prettier"` to `extends` in `eslint.config.js` (or `.eslintrc.json` depending on version). Add `"format": "prettier --write \"src/**/*.{ts,html,scss}\""` to npm scripts.

- [ ] **Step 6.5:** Run `npm run lint` — expect pass. If rules fail on generated `schema.ts`, add to `.eslintignore` / eslint `ignores`.

- [ ] **Step 6.6:** Commit.
```bash
git add -A
git commit -m "chore(lint): add eslint + prettier"
```

---

## Task 7: AuthService + interceptors + guards

**Files:**
- Create: `src/app/core/auth/auth.service.ts`
- Create: `src/app/core/auth/auth.guard.ts`
- Create: `src/app/core/auth/superuser.guard.ts`
- Create: `src/app/core/http/auth.interceptor.ts`
- Create: `src/app/core/http/error.interceptor.ts`
- Create: `src/app/core/utils/idempotency.ts`
- Modify: `src/app/app.config.ts`

- [ ] **Step 7.1:** Write `src/app/core/auth/auth.service.ts`:
```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CurrentUser {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
  timezone_name: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<CurrentUser | null>(null);

  readonly token = this._token.asReadonly();
  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._token() !== null && this._user() !== null);
  readonly isSuperuser = computed(() => this._user()?.is_superuser ?? false);

  async login(email: string, password: string): Promise<void> {
    const body = new HttpParams({ fromObject: { username: email, password } });
    const res = await firstValueFrom(
      this.http.post<{ access_token: string; token_type: string }>(
        `${environment.apiBaseUrl}/auth/jwt/login`,
        body.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      ),
    );
    this._token.set(res.access_token);
    await this.refreshCurrentUser();
  }

  async refreshCurrentUser(): Promise<void> {
    const user = await firstValueFrom(
      this.http.get<CurrentUser>(`${environment.apiBaseUrl}/users/me`),
    );
    this._user.set(user);
  }

  async updateTimezone(timezone_name: string): Promise<void> {
    const user = await firstValueFrom(
      this.http.patch<CurrentUser>(`${environment.apiBaseUrl}/users/me`, { timezone_name }),
    );
    this._user.set(user);
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/jwt/logout`, {}),
      );
    } finally {
      this.clear();
      this.router.navigate(['/login']);
    }
  }

  clear(): void {
    this._token.set(null);
    this._user.set(null);
  }
}
```

- [ ] **Step 7.2:** Write `src/app/core/utils/idempotency.ts`:
```ts
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 7.3:** Write `src/app/core/http/auth.interceptor.ts`:
```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!req.headers.has('X-Request-ID')) headers['X-Request-ID'] = crypto.randomUUID();
  return next(req.clone({ setHeaders: headers }));
};
```

- [ ] **Step 7.4:** Write `src/app/core/http/error.interceptor.ts`:
```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messages = inject(MessageService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const reqId = err.headers?.get('X-Request-ID') ?? req.headers.get('X-Request-ID');
      const apiMessage = (err.error && typeof err.error === 'object' && 'message' in err.error)
        ? (err.error as { message: string }).message
        : err.message;
      const apiCode = (err.error && typeof err.error === 'object' && 'code' in err.error)
        ? (err.error as { code: string }).code
        : `http_${err.status}`;

      if (err.status === 401) {
        auth.clear();
        router.navigate(['/login']);
      }

      const suffix = reqId ? `\nRequest-ID: ${reqId}` : '';
      messages.add({
        severity: err.status >= 500 ? 'error' : 'warn',
        summary: apiCode,
        detail: `${apiMessage}${suffix}`,
        life: 8000,
      });
      if (reqId) console.error('[API error]', apiCode, apiMessage, 'X-Request-ID:', reqId);

      return throwError(() => err);
    }),
  );
};
```

- [ ] **Step 7.5:** Write `src/app/core/auth/auth.guard.ts`:
```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};
```

- [ ] **Step 7.6:** Write `src/app/core/auth/superuser.guard.ts`:
```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const superuserGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSuperuser()) return true;
  router.navigate(['/']);
  return false;
};
```

- [ ] **Step 7.7:** Rewrite `src/app/app.config.ts`:
```ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService, ConfirmationService } from 'primeng/api';
import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimations(),
    MessageService,
    ConfirmationService,
  ],
};
```

- [ ] **Step 7.8:** Commit.
```bash
git add src/app/core src/app/app.config.ts
git commit -m "feat(auth): add AuthService, JWT + error interceptors, route guards"
```

## Task 8: apiDate pipe + shared components

**Files:**
- Create: `src/app/shared/pipes/api-date.pipe.ts`
- Create: `src/app/shared/components/page-header/page-header.component.ts`
- Create: `src/app/shared/components/empty-state/empty-state.component.ts`
- Create: `src/app/shared/components/status-tag/status-tag.component.ts`

- [ ] **Step 8.1:** Write `src/app/shared/pipes/api-date.pipe.ts`:
```ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Pipe({ name: 'apiDate', standalone: true, pure: false })
export class ApiDatePipe implements PipeTransform {
  private readonly auth = inject(AuthService);

  transform(value: string | null | undefined, format: 'short' | 'medium' = 'short'): string {
    if (!value) return '';
    const tz = this.auth.currentUser()?.timezone_name ?? environment.defaultTimezone;
    return new Intl.DateTimeFormat(environment.defaultLocale, {
      dateStyle: format === 'medium' ? 'medium' : 'short',
      timeStyle: 'short',
      timeZone: tz,
    }).format(new Date(value));
  }
}
```

- [ ] **Step 8.2:** Write `page-header.component.ts` — standalone, inputs `title`, `subtitle`, `icon?`, content-projection for right-side actions.
```ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="flex align-items-center justify-content-between mb-4 gap-3">
      <div class="flex align-items-center gap-3">
        @if (icon) { <i [class]="'pi ' + icon" style="font-size: 1.5rem"></i> }
        <div>
          <h1 class="m-0 text-2xl font-semibold">{{ title }}</h1>
          @if (subtitle) { <p class="m-0 text-color-secondary">{{ subtitle }}</p> }
        </div>
      </div>
      <div class="flex gap-2"><ng-content /></div>
    </div>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
}
```

- [ ] **Step 8.3:** Write `empty-state.component.ts`:
```ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-column align-items-center justify-content-center py-6 text-center">
      <i [class]="'pi ' + (icon ?? 'pi-inbox')" style="font-size: 3rem; color: var(--text-color-secondary)"></i>
      <h3 class="mt-3 mb-1">{{ title }}</h3>
      @if (message) { <p class="text-color-secondary mb-3">{{ message }}</p> }
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() message?: string;
  @Input() icon?: string;
}
```

- [ ] **Step 8.4:** Write `status-tag.component.ts` mapping job/history statuses to PrimeNG tag severities (`queued=info`, `running=warning`, `success=success`, `failed=danger`, `cancelled=secondary`). Uses `p-tag`.

- [ ] **Step 8.5:** Commit.
```bash
git add src/app/shared
git commit -m "feat(shared): add apiDate pipe, page-header, empty-state, status-tag"
```

## Task 9: App shell (layout + routes + toast/confirm hosts)

**Files:**
- Modify: `src/app/app.component.ts`
- Modify: `src/app/app.component.html`
- Modify: `src/app/app.component.scss`
- Create: `src/app/app.routes.ts` (overwrite default)

- [ ] **Step 9.1:** Overwrite `app.component.ts` to a standalone component importing PrimeNG `MenubarModule`, `SidebarModule`, `ToastModule`, `ConfirmDialogModule`, `ButtonModule`, plus `RouterOutlet`, `RouterLink`. Inject `AuthService`.

- [ ] **Step 9.2:** Template (`app.component.html`):
```html
<p-toast position="top-right" />
<p-confirmDialog />

@if (auth.isLoggedIn()) {
  <div class="flex flex-column h-screen">
    <p-menubar [model]="topMenu()" styleClass="border-noround">
      <ng-template pTemplate="start">
        <span class="font-bold text-xl mr-4" style="color: var(--fox-primary)">FoxRunner</span>
      </ng-template>
      <ng-template pTemplate="end">
        <span class="mr-3 text-color-secondary">{{ auth.currentUser()?.email }}</span>
        <p-button icon="pi pi-user" [rounded]="true" severity="secondary" [text]="true" routerLink="/profile" />
        <p-button icon="pi pi-sign-out" [rounded]="true" severity="secondary" [text]="true" (onClick)="auth.logout()" />
      </ng-template>
    </p-menubar>
    <main class="flex-1 p-4 overflow-auto">
      <router-outlet />
    </main>
  </div>
} @else {
  <router-outlet />
}
```

- [ ] **Step 9.3:** In `app.component.ts`, `topMenu` is a `computed` signal producing `MenuItem[]`:
```ts
topMenu = computed<MenuItem[]>(() => {
  const base: MenuItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-home', routerLink: '/' },
    { label: 'Scénarios', icon: 'pi pi-sitemap', routerLink: '/scenarios' },
    { label: 'Slots', icon: 'pi pi-calendar', routerLink: '/slots' },
    { label: 'Jobs', icon: 'pi pi-play', routerLink: '/jobs' },
    { label: 'Historique', icon: 'pi pi-history', routerLink: '/history' },
    { label: 'Plan', icon: 'pi pi-clock', routerLink: '/plan' },
  ];
  if (this.auth.isSuperuser()) {
    base.push({ label: 'Admin', icon: 'pi pi-cog', routerLink: '/admin' });
  }
  return base;
});
```

- [ ] **Step 9.4:** Write `src/app/app.routes.ts`:
```ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'scenarios', loadComponent: () => import('./features/scenarios/list/scenarios-list.component').then(m => m.ScenariosListComponent) },
      { path: 'scenarios/new', loadComponent: () => import('./features/scenarios/edit/scenario-edit.component').then(m => m.ScenarioEditComponent) },
      { path: 'scenarios/:id', loadComponent: () => import('./features/scenarios/detail/scenario-detail.component').then(m => m.ScenarioDetailComponent) },
      { path: 'scenarios/:id/edit', loadComponent: () => import('./features/scenarios/edit/scenario-edit.component').then(m => m.ScenarioEditComponent) },
      { path: 'slots', loadComponent: () => import('./features/slots/list/slots-list.component').then(m => m.SlotsListComponent) },
      { path: 'jobs', loadComponent: () => import('./features/jobs/list/jobs-list.component').then(m => m.JobsListComponent) },
      { path: 'jobs/:id', loadComponent: () => import('./features/jobs/detail/job-detail.component').then(m => m.JobDetailComponent) },
      { path: 'history', loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent) },
      { path: 'plan', loadComponent: () => import('./features/plan/plan.component').then(m => m.PlanComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 9.5:** Build (`ng build`) — expect failures (missing components). That's fine, will be fixed per feature.

- [ ] **Step 9.6:** Commit.
```bash
git add src/app/app.component.* src/app/app.routes.ts
git commit -m "feat(shell): app layout with menubar, toast, confirm-dialog and routes"
```

---

## Task 10: API service layer

**Files:** `src/app/core/api/*.service.ts` (8 files).

Pattern for each service — strongly typed via `schema.ts`. Example `users.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Paginated<T> { items: T[]; total: number; limit: number; offset: number; }

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getFeatures() {
    return firstValueFrom(this.http.get<{ features: Record<string, boolean> }>(`${this.base}/users/me/features`));
  }
}
```

- [ ] **Step 10.1:** Create `config.service.ts` — `getClientConfig()` → GET `/config/client`.

- [ ] **Step 10.2:** Create `timezones.service.ts` — `listCommon()` → GET `/timezones/common`.

- [ ] **Step 10.3:** Create `scenarios.service.ts` — `list(userId, limit, offset)`, `get(userId, scenarioId)`, `create(dto, idempotencyKey)`, `patch(id, dto)`, `duplicate(id, newId)`, `delete(id)`, `run(userId, id, dryRun)`, `getShares(id)`, `addShare(id, dto)`, `removeShare(id, shareUserId)`.

- [ ] **Step 10.4:** Create `slots.service.ts` — `list(params)`, `get(id)`, `create(dto, idempotencyKey)`, `patch(id, dto)`, `delete(id)`.

- [ ] **Step 10.5:** Create `jobs.service.ts` — `list(limit, offset)`, `get(jobId, userId)`, `events(jobId, userId)`, `cancel(jobId, userId)`, `retry(jobId, userId)`, `trigger(userId, scenarioId, dryRun, idempotencyKey)` (POST `/users/{user_id}/scenarios/{scenario_id}/jobs`).

- [ ] **Step 10.6:** Create `history.service.ts` — `list(userId, { status?, slot_id?, scenario_id?, execution_id?, from?, to?, limit, offset })`.

- [ ] **Step 10.7:** Create `plan.service.ts` — `getPlan(userId)`.

- [ ] **Step 10.8:** Create `step-collections.service.ts` — `getAll(userId, scenarioId)`, `getCollection(userId, scenarioId, collection)`, `getStep(...)`, `appendStep(...)`, `replaceStep(...)`, `deleteStep(...)`.

- [ ] **Step 10.9:** Idempotency-Key injection rule: services that create resources accept `idempotencyKey?: string` and set header `Idempotency-Key` via `{ headers: { 'Idempotency-Key': key } }` on the HTTP call.

- [ ] **Step 10.10:** Commit.
```bash
git add src/app/core/api
git commit -m "feat(api): typed service layer for users, scenarios, slots, jobs, history, plan, shares, steps"
```

## Task 11: ClientConfigService bootstrap

**Files:**
- Create: `src/app/core/config/client-config.service.ts`
- Modify: `src/app/app.config.ts`

- [ ] **Step 11.1:** `client-config.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ClientConfig {
  api_version: string;
  environment: string;
  default_timezone: string;
  features: Record<string, boolean>;
}

@Injectable({ providedIn: 'root' })
export class ClientConfigService {
  private readonly http = inject(HttpClient);
  private readonly _config = signal<ClientConfig | null>(null);
  readonly config = this._config.asReadonly();

  async load(): Promise<void> {
    try {
      const cfg = await firstValueFrom(
        this.http.get<ClientConfig>(`${environment.apiBaseUrl}/config/client`),
      );
      this._config.set(cfg);
    } catch {
      // non-blocking; defaults apply
    }
  }
}
```

- [ ] **Step 11.2:** In `app.config.ts`, add `provideAppInitializer(() => inject(ClientConfigService).load())`.

- [ ] **Step 11.3:** Commit.
```bash
git add src/app/core/config src/app/app.config.ts
git commit -m "feat(config): load /config/client at bootstrap"
```

---

## Task 12: Login page

**Files:** `src/app/features/auth/login/login.component.ts` + `.html` + `.scss`

- [ ] **Step 12.1:** Reactive form (`email`, `password`), PrimeNG `p-inputText`, `p-password` (toggleMask=true, feedback=false), `p-button` (loading signal). On submit: `auth.login(email, pwd)` then `router.navigate([navigateAfter || '/'])`. Catch error — already toast-handled by interceptor.

- [ ] **Step 12.2:** Route table already references this via `/login`.

- [ ] **Step 12.3:** Run `ng serve`, verify login against the real backend with `admin@local.test` / `adminadmin123456`.

- [ ] **Step 12.4:** Commit.
```bash
git add src/app/features/auth
git commit -m "feat(auth): login page with form data + redirect"
```

## Task 13: Dashboard (minimal) + Profile

**Files:**
- `src/app/features/dashboard/dashboard.component.ts` — welcome card with current user + quick links.
- `src/app/features/profile/profile.component.ts` — email (read-only), timezone select (p-dropdown filled from `TimezonesService.listCommon()` plus `p-autoComplete` for free IANA), Save button calls `auth.updateTimezone(tz)`.

- [ ] **Step 13.1:** Dashboard: card with greeting, next plan snippet (delegated to `/plan`), links to `/scenarios`, `/slots`, `/jobs`.

- [ ] **Step 13.2:** Profile: on load, pre-select current timezone. After save, toast success.

- [ ] **Step 13.3:** Commit.
```bash
git add src/app/features/dashboard src/app/features/profile
git commit -m "feat(profile): timezone selector wired to PATCH /users/me"
```

## Task 14: Scenarios list + detail

**Files:**
- `src/app/features/scenarios/list/scenarios-list.component.ts`
- `src/app/features/scenarios/detail/scenario-detail.component.ts`

- [ ] **Step 14.1:** List: `p-table` lazy, columns `scenario_id`, `description`, `role` (tag), `requires_enterprise_network` (icon), actions (Détail / Dupliquer / Supprimer if `writable`). On lazy load call `ScenariosService.list(me.id, limit, offset)`.

- [ ] **Step 14.2:** Detail: header with id/description; 5 `p-accordion` or `p-tabView` panels for the step-collections. Buttons: "Exécuter (dry-run)", "Exécuter (réel)" (confirm dialog), "Éditer" (writable only), "Partages".

- [ ] **Step 14.3:** Exécuter → `JobsService.trigger(me.id, id, dryRun)` then navigate to `/jobs/:newJobId` or show toast with job_id if trigger returns inline.

- [ ] **Step 14.4:** Commit.
```bash
git add src/app/features/scenarios
git commit -m "feat(scenarios): list + detail with dry-run and real run triggers"
```

## Task 15: Slots list + dialog

**Files:** `src/app/features/slots/list/slots-list.component.ts` + `edit-dialog/slot-edit-dialog.component.ts`

- [ ] **Step 15.1:** List: `p-table` lazy, columns `slot_id`, `scenario_id`, `days` (pretty-formatted as `Lu Ma Me Je Ve Sa Di` with active ones highlighted), `start`, `end`, `enabled` (p-inputSwitch toggling `SlotsService.patch`), actions (Éditer / Supprimer).

- [ ] **Step 15.2:** Dialog form: `slot_id` (text, disabled in edit mode), `scenario_id` (autocomplete via `ScenariosService.list`), `days` (p-multiSelect with 0..6 labels fr), `start`/`end` (`p-inputMask` with `99:99`), `enabled` (checkbox).

- [ ] **Step 15.3:** On Create → `SlotsService.create(dto, idempotencyKey)` where `idempotencyKey` is generated when dialog opens and persists until close+reopen.

- [ ] **Step 15.4:** Commit.
```bash
git add src/app/features/slots
git commit -m "feat(slots): list with inline enable toggle and create/edit dialog"
```

## Task 16: Jobs list + detail

**Files:** `src/app/features/jobs/list/jobs-list.component.ts` + `detail/job-detail.component.ts`

- [ ] **Step 16.1:** List: `p-table` lazy, columns `job_id`, `scenario_id`, `status` (StatusTag), `created_at` (apiDate), `finished_at` (apiDate), actions (Voir / Retry / Cancel).

- [ ] **Step 16.2:** Auto-refresh: in `ngOnInit` start a `setInterval(10_000)` that re-calls `list()` only if the current page has any status `queued` or `running`. Clear on destroy.

- [ ] **Step 16.3:** Detail: header with status, scenario link, durations; `p-timeline` for events from `JobsService.events(id, me.id)`. Buttons Retry / Cancel (only if status allows).

- [ ] **Step 16.4:** Commit.
```bash
git add src/app/features/jobs
git commit -m "feat(jobs): list with auto-refresh + detail timeline and actions"
```

## Task 17: History

**Files:** `src/app/features/history/history.component.ts`

- [ ] **Step 17.1:** Filters bar: status (p-dropdown), scenario_id (p-autoComplete), slot_id (autoComplete), date range (p-calendar range). Emits into signals; triggers list reload.

- [ ] **Step 17.2:** `p-table` lazy. Columns `scenario_id`, `slot_id`, `status` (StatusTag), `executed_at` (apiDate medium), `message` (truncated w/ tooltip).

- [ ] **Step 17.3:** Commit.
```bash
git add src/app/features/history
git commit -m "feat(history): filtered paginated history table"
```

## Task 18: Phase 1 verification checkpoint

- [ ] **Step 18.1:** `npm run lint` green.
- [ ] **Step 18.2:** `ng build` green.
- [ ] **Step 18.3:** Manual smoke: login → list scenarios → open detail → create slot → trigger dry-run → see job in list → job detail events → see history entry.
- [ ] **Step 18.4:** If any step fails, fix before moving to Phase 2.

---

## Task 19: JSON editor shared component

**Files:** `src/app/shared/components/json-editor/json-editor.component.ts`

- [ ] **Step 19.1:** Wrap `ngx-monaco-editor-v2` with `[(ngModel)]` on a stringified JSON. Options `{ theme: 'vs', language: 'json', minimap: { enabled: false }, automaticLayout: true }`. Emit `validChange` (boolean) based on `JSON.parse` attempts.

- [ ] **Step 19.2:** Fallback to `<textarea>` + manual `JSON.parse` validation if Monaco fails to load (inspect console, toast a "Éditeur JSON en mode dégradé" info).

- [ ] **Step 19.3:** Commit.
```bash
git add src/app/shared/components/json-editor
git commit -m "feat(shared): JSON editor wrapping monaco-editor with validation signal"
```

## Task 20: Scenario create/edit

**Files:** `src/app/features/scenarios/edit/scenario-edit.component.ts`

- [ ] **Step 20.1:** Reactive form: `scenario_id` (text, disabled in edit mode), `description` (textarea), `owner_user_id` (auto = me.email, editable only if superuser). For new scenarios, include a "Definition JSON" section using `JsonEditorComponent` pre-filled with `{ "before_steps": [], "steps": [], "on_success": [], "on_failure": [], "finally_steps": [] }`.

- [ ] **Step 20.2:** On create → `ScenariosService.create(dto, idempotencyKey)`; on edit → `patch(id, dto)`. Key lifecycle: regenerate when the form is reset after success.

- [ ] **Step 20.3:** Commit.
```bash
git add src/app/features/scenarios/edit
git commit -m "feat(scenarios): create/edit page with JSON definition editor"
```

## Task 21: Step collections editor

**Files:** `src/app/features/scenarios/step-collections-editor/step-collections-editor.component.ts`

- [ ] **Step 21.1:** 5 tabs (`before_steps`, `steps`, `on_success`, `on_failure`, `finally_steps`). Per tab: ordered list of steps rendered as `p-card` (one-line `type + key params` preview), with Edit / Up / Down / Delete buttons.

- [ ] **Step 21.2:** Edit step → dialog with `JsonEditorComponent` on the raw step JSON. Save → `StepCollectionsService.replaceStep(userId, scenarioId, collection, index, { step })`.

- [ ] **Step 21.3:** Append step → same dialog, empty JSON `{}`, save → `appendStep`.

- [ ] **Step 21.4:** Wire from `scenario-detail.component` as a sub-component or separate route (`/scenarios/:id/steps`).

- [ ] **Step 21.5:** Commit.
```bash
git add src/app/features/scenarios/step-collections-editor
git commit -m "feat(scenarios): step collections editor with JSON-per-step"
```

## Task 22: Scenario shares

**Files:** `src/app/features/scenarios/shares/shares-dialog.component.ts`

- [ ] **Step 22.1:** Dialog listing users who have access (`GET /scenarios/{id}/shares`). Show role, writable. Add user (email lookup) → `POST /scenarios/{id}/shares`. Remove → `DELETE /scenarios/{id}/shares/{user_id}`.

- [ ] **Step 22.2:** Invoke from scenario detail's "Partages" button (owner only).

- [ ] **Step 22.3:** Commit.
```bash
git add src/app/features/scenarios/shares
git commit -m "feat(scenarios): share management dialog"
```

## Task 23: Plan view

**Files:** `src/app/features/plan/plan.component.ts`

- [ ] **Step 23.1:** On init → `PlanService.getPlan(me.id)`. Render a card with: next slot id, scenario id, scheduled_for (apiDate medium), countdown (`setInterval(1_000)`).

- [ ] **Step 23.2:** If plan empty, render `<app-empty-state>` with a link to `/slots`.

- [ ] **Step 23.3:** Commit.
```bash
git add src/app/features/plan
git commit -m "feat(plan): next scheduled slot view with countdown"
```

## Task 24: Scenario actions (duplicate/delete)

**Files:** modify `src/app/features/scenarios/list/scenarios-list.component.ts` and `detail/scenario-detail.component.ts`.

- [ ] **Step 24.1:** Duplicate: prompt for `new_scenario_id` via `p-dialog` or inline inputText in confirmDialog → `ScenariosService.duplicate(id, newId)`.

- [ ] **Step 24.2:** Delete: `ConfirmationService.confirm({ ..., acceptButtonProps: { severity: 'danger' } })` → `ScenariosService.delete(id)` → refresh list / navigate away from detail.

- [ ] **Step 24.3:** Commit.
```bash
git add src/app/features/scenarios
git commit -m "feat(scenarios): duplicate and delete actions"
```

---

## Task 25: Unit tests

**Files:**
- `src/app/core/auth/auth.service.spec.ts`
- `src/app/core/http/auth.interceptor.spec.ts`
- `src/app/core/http/error.interceptor.spec.ts`
- `src/app/shared/pipes/api-date.pipe.spec.ts`
- `src/app/core/utils/idempotency.spec.ts`

- [ ] **Step 25.1:** AuthService test: using `HttpTestingController`, assert `login()` sends form-urlencoded body `username=x&password=y`, then a GET `/users/me` sets `currentUser`.

- [ ] **Step 25.2:** auth.interceptor test: configure TestBed with `provideHttpClient(withInterceptors([authInterceptor]))`, set token on AuthService, assert outgoing request has `Authorization: Bearer …` and a generated `X-Request-ID`.

- [ ] **Step 25.3:** error.interceptor test: stub `MessageService`, simulate 401 — assert `MessageService.add` called, router navigated to `/login`, AuthService cleared.

- [ ] **Step 25.4:** apiDate pipe test: given `2026-04-22T14:30:00Z` and user tz `Europe/Brussels`, expect output containing `16:30` (CEST in April). Also test empty value → `''`.

- [ ] **Step 25.5:** idempotency test: `newIdempotencyKey()` returns unique v4 strings across 100 calls.

- [ ] **Step 25.6:** Run `ng test --watch=false --browsers=ChromeHeadless`. Fix flaky ones.

- [ ] **Step 25.7:** Commit.
```bash
git add -A
git commit -m "test: unit tests for auth, interceptors, apiDate pipe, idempotency"
```

## Task 26: Final lint + build + smoke

- [ ] **Step 26.1:** `npm run lint` green.
- [ ] **Step 26.2:** `npm run format` to normalize.
- [ ] **Step 26.3:** `ng build --configuration production` green (no errors; warnings OK).
- [ ] **Step 26.4:** Manual smoke pass on dev server covering every Phase 1+2 feature with real backend data.
- [ ] **Step 26.5:** Final commit if anything was changed.
```bash
git add -A
git commit -m "chore: lint pass and production build verification"
```

## Task 27: README update

**Files:** modify `README.md`, modify `CLAUDE.md`.

- [ ] **Step 27.1:** `README.md`: minimal setup doc — prerequisites (Node 22+), `npm install`, `npm run gen:api` requires backend running, `npm start`, `npm run lint`, `npm test`, `npm run build`. Link to backend repo for API docs.

- [ ] **Step 27.2:** `CLAUDE.md`: replace placeholder with actual stack summary + commands + architectural conventions (interceptors, generated types, timezone rule).

- [ ] **Step 27.3:** Commit.
```bash
git add README.md CLAUDE.md
git commit -m "docs: setup README and CLAUDE.md with stack + conventions"
```

---

## Known gotchas

- **Monaco + Karma**: tests won't load Monaco. Mock the `JsonEditorComponent` in tests that pull it in.
- **Aura theme variant name**: PrimeNG theme import paths differ between v17 and v19+. If `aura-light-amber` is not found, list `node_modules/primeng/resources/themes` and pick the closest orange/amber preset, then override `--p-primary-*` in `styles.scss`.
- **`openapi-typescript` URL fetch on Windows**: if `npm run gen:api` fails due to TLS/IPv6 quirks, fall back to `gen:api:file` using the static file.
- **CORS**: backend whitelists `http://localhost:4200`. `ng serve` defaults there.
- **Legacy routes**: never call endpoints without the `/api/v1` prefix, even if `axios`-style debug suggests they exist.
- **`crypto.randomUUID`** requires HTTPS or localhost — dev on `localhost:4200` is fine.

## Deferred (out of scope for Phases 1+2)

- Admin pages (users, settings, audit, retention, monitoring, artifacts) — Phase 3.
- Password reset flow — Phase 4.
- Graph subscriptions — Phase 4.
- Dark mode, i18n fr/en — Phase 4.

Document any blocking backend issues in `FRONTEND_NOTES.md` at repo root.
