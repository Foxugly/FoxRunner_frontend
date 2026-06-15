# Magic-link frontend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the magic-link login UI to FoxRunner: a "magic link" mode on the login page (email → "send link") and an `/auth/magic/:token` landing page that exchanges the token for a JWT and signs the user in — then replicate to the Node 20 fork.

**Architecture:** A hand-written `AuthMagicService` (HttpClient, mirrors `AuthPasswordService`), a new `AuthService.loginWithToken` reusing the existing token signal + `refreshCurrentUser`, a `MagicLinkExchangeComponent` (route param bound via the app's `withComponentInputBinding()`), and a `magicMode` toggle on the login form. Same look & feel as quizonline (toggle + landing).

**Tech Stack:** Angular 21 (upstream) / 19 (fork), PrimeNG, standalone components, signals, ReactiveForms, vitest.

**Spec source:** `docs/superpowers/specs/2026-06-16-magic-link-frontend-design.md`
**Backend contract (live after FoxRunner_server PR #1 deploys):** `POST /auth/magic-link/request` `{email}`→202 ; `POST /auth/magic-link/exchange` `{token}`→200 `{access_token, token_type}`, 410 expired, 400 invalid.
**Branch:** `feat/magic-link` (already created from `main` for the spec).
**Tests:** `npx ng test --watch=false --include="**/<spec>.ts"`.

---

## File Structure (upstream)

- `src/app/core/api/auth-magic.service.ts` — **created**: `request` / `exchange`.
- `src/app/core/api/auth-magic.service.spec.ts` — **created**.
- `src/app/core/auth/auth.service.ts` — **modified**: `loginWithToken`.
- `src/app/core/auth/auth.service.token.spec.ts` — **created**: focused `loginWithToken` test.
- `src/app/features/auth/magic-link-exchange/magic-link-exchange.component.ts` — **created**.
- `src/app/features/auth/magic-link-exchange/magic-link-exchange.component.spec.ts` — **created**.
- `src/app/features/auth/login/login.component.ts` — **modified**: magic-mode toggle.
- `src/app/app.routes.ts` — **modified**: `auth/magic/:token` route.

Task 6 replicates all of the above to `FoxRunner_frontend_node20`.

---

## Task 1: AuthMagicService (TDD)

**Files:**
- Create: `src/app/core/api/auth-magic.service.ts`
- Test: `src/app/core/api/auth-magic.service.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/api/auth-magic.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthMagicService } from './auth-magic.service';
import { environment } from '../../../environments/environment';

describe('AuthMagicService', () => {
  let service: AuthMagicService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthMagicService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('request() POSTs the email to magic-link/request', async () => {
    const p = service.request('a@b.co');
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/magic-link/request`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.co' });
    req.flush({ status: 'queued' });
    await p;
  });

  it('exchange() POSTs the token and returns the access token', async () => {
    const p = service.exchange('tok-1');
    const req = http.expectOne(`${environment.apiBaseUrl}/auth/magic-link/exchange`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'tok-1' });
    req.flush({ access_token: 'jwt-123', token_type: 'bearer' });
    expect(await p).toEqual({ access_token: 'jwt-123', token_type: 'bearer' });
  });
});
```

- [ ] **Step 2: Run → FAIL**

Run: `npx ng test --watch=false --include="**/auth-magic.service.spec.ts"`
Expected: FAIL (`Cannot find module './auth-magic.service'`).

- [ ] **Step 3: Implement the service**

`src/app/core/api/auth-magic.service.ts`:
```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface MagicExchangeResponse {
  access_token: string;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthMagicService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  request(email: string): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/auth/magic-link/request`, { email }));
  }

  exchange(token: string): Promise<MagicExchangeResponse> {
    return firstValueFrom(
      this.http.post<MagicExchangeResponse>(`${this.base}/auth/magic-link/exchange`, { token }),
    );
  }
}
```

- [ ] **Step 4: Run → PASS (2 tests)**

Run: `npx ng test --watch=false --include="**/auth-magic.service.spec.ts"`

- [ ] **Step 5: Commit**

```bash
git add src/app/core/api/auth-magic.service.ts src/app/core/api/auth-magic.service.spec.ts
git commit -m "feat(auth): AuthMagicService (request + exchange)"
```

---

## Task 2: AuthService.loginWithToken (TDD)

**Files:**
- Modify: `src/app/core/auth/auth.service.ts`
- Test: `src/app/core/auth/auth.service.token.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/core/auth/auth.service.token.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService, CurrentUser } from './auth.service';
import { environment } from '../../../environments/environment';

const USER: CurrentUser = {
  id: 'u1',
  email: 'a@b.co',
  is_active: true,
  is_superuser: false,
  is_verified: true,
  timezone_name: 'Europe/Brussels',
};

describe('AuthService.loginWithToken', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stores the token and loads the current user', async () => {
    const p = service.loginWithToken('jwt-123');
    const req = http.expectOne(`${environment.apiBaseUrl}/users/me`);
    expect(req.request.method).toBe('GET');
    req.flush(USER);
    await p;
    expect(service.token()).toBe('jwt-123');
    expect(service.currentUser()).toEqual(USER);
    expect(service.isLoggedIn()).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL**

Run: `npx ng test --watch=false --include="**/auth.service.token.spec.ts"`
Expected: FAIL (`loginWithToken` is not a function).

- [ ] **Step 3: Implement**

In `src/app/core/auth/auth.service.ts`, add this method to the `AuthService` class (e.g. right after `login`):
```ts
  async loginWithToken(accessToken: string): Promise<void> {
    this._token.set(accessToken);
    await this.refreshCurrentUser();
  }
```

- [ ] **Step 4: Run → PASS**

Run: `npx ng test --watch=false --include="**/auth.service.token.spec.ts"`

- [ ] **Step 5: Commit**

```bash
git add src/app/core/auth/auth.service.ts src/app/core/auth/auth.service.token.spec.ts
git commit -m "feat(auth): AuthService.loginWithToken (magic-link exchange)"
```

---

## Task 3: MagicLinkExchangeComponent + route (TDD)

**Files:**
- Create: `src/app/features/auth/magic-link-exchange/magic-link-exchange.component.ts`
- Test: `src/app/features/auth/magic-link-exchange/magic-link-exchange.component.spec.ts`
- Modify: `src/app/app.routes.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/auth/magic-link-exchange/magic-link-exchange.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { MagicLinkExchangeComponent } from './magic-link-exchange.component';
import { AuthMagicService } from '../../../core/api/auth-magic.service';
import { AuthService } from '../../../core/auth/auth.service';

function setup(token: string | null, exchange: () => Promise<unknown>) {
  const loginWithToken = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [MagicLinkExchangeComponent],
    providers: [
      provideRouter([]),
      { provide: AuthMagicService, useValue: { exchange } },
      { provide: AuthService, useValue: { loginWithToken } },
    ],
  });
  const fixture = TestBed.createComponent(MagicLinkExchangeComponent);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  if (token !== null) fixture.componentRef.setInput('token', token);
  return { fixture, loginWithToken, navigate };
}

describe('MagicLinkExchangeComponent', () => {
  it('exchanges the token, signs in and navigates home on success', async () => {
    const { fixture, loginWithToken, navigate } = setup('tok', () =>
      Promise.resolve({ access_token: 'jwt-1', token_type: 'bearer' }),
    );
    await fixture.componentInstance.ngOnInit();
    expect(loginWithToken).toHaveBeenCalledWith('jwt-1');
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(fixture.componentInstance.state()).toBe('working');
  });

  it('shows the expired state on a 410', async () => {
    const { fixture } = setup('tok', () =>
      Promise.reject(new HttpErrorResponse({ status: 410 })),
    );
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.state()).toBe('expired');
  });

  it('shows the invalid state on a 400', async () => {
    const { fixture } = setup('tok', () =>
      Promise.reject(new HttpErrorResponse({ status: 400 })),
    );
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.state()).toBe('invalid');
  });

  it('shows the invalid state when no token is present', async () => {
    const { fixture } = setup(null, () => Promise.resolve({}));
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.state()).toBe('invalid');
  });
});
```

- [ ] **Step 2: Run → FAIL** (`Cannot find module './magic-link-exchange.component'`)

Run: `npx ng test --watch=false --include="**/magic-link-exchange.component.spec.ts"`

- [ ] **Step 3: Implement the component**

`src/app/features/auth/magic-link-exchange/magic-link-exchange.component.ts`:
```ts
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthMagicService } from '../../../core/api/auth-magic.service';

type ExchangeState = 'working' | 'expired' | 'invalid';

@Component({
  selector: 'app-magic-link-exchange',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule, ProgressSpinnerModule],
  template: `
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <div class="flex flex-column align-items-center gap-3 p-3 text-center">
            @switch (state()) {
              @case ('working') {
                <p-progressSpinner strokeWidth="4" styleClass="w-3rem h-3rem" />
                <p class="m-0">Connexion en cours…</p>
              }
              @case ('expired') {
                <i class="pi pi-clock" style="font-size: 2rem; color: var(--p-text-muted-color, #6b7280)"></i>
                <p class="m-0">Ce lien a expiré (valable 15 minutes). Demande-en un nouveau depuis la page de connexion.</p>
                <p-button label="Retour à la connexion" icon="pi pi-arrow-left" routerLink="/login" />
              }
              @case ('invalid') {
                <i class="pi pi-times-circle" style="font-size: 2rem; color: var(--p-text-muted-color, #6b7280)"></i>
                <p class="m-0">Lien invalide.</p>
                <p-button label="Retour à la connexion" icon="pi pi-arrow-left" routerLink="/login" />
              }
            }
          </div>
        </p-card>
      </div>
    </div>
  `,
})
export class MagicLinkExchangeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly authMagic = inject(AuthMagicService);

  /** Bound from the ``:token`` route param via withComponentInputBinding(). */
  @Input() token?: string;

  readonly state = signal<ExchangeState>('working');

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    try {
      const res = await this.authMagic.exchange(this.token);
      await this.auth.loginWithToken(res.access_token);
      await this.router.navigate(['/']);
    } catch (err) {
      this.state.set((err as HttpErrorResponse)?.status === 410 ? 'expired' : 'invalid');
    }
  }
}
```

- [ ] **Step 4: Add the route**

In `src/app/app.routes.ts`, add (after the `reset-password` route, before the `authGuard` `path: ''` block):
```ts
  {
    path: 'auth/magic/:token',
    loadComponent: () =>
      import('./features/auth/magic-link-exchange/magic-link-exchange.component').then(
        (m) => m.MagicLinkExchangeComponent,
      ),
  },
```

- [ ] **Step 5: Run → PASS (4 tests)**

Run: `npx ng test --watch=false --include="**/magic-link-exchange.component.spec.ts"`

- [ ] **Step 6: Commit**

```bash
git add src/app/features/auth/magic-link-exchange src/app/app.routes.ts
git commit -m "feat(auth): magic-link exchange landing page + route"
```

---

## Task 4: Login magic-mode toggle (TDD)

**Files:**
- Modify: `src/app/features/auth/login/login.component.ts`
- Test: `src/app/features/auth/login/login.component.spec.ts`

- [ ] **Step 1: Write the failing test**

`src/app/features/auth/login/login.component.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthMagicService } from '../../../core/api/auth-magic.service';
import { AuthService } from '../../../core/auth/auth.service';

function setup(request = vi.fn().mockResolvedValue(undefined)) {
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { login: vi.fn() } },
      { provide: AuthMagicService, useValue: { request } },
    ],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  return fixture;
}

describe('LoginComponent magic mode', () => {
  it('toggles into magic mode and back', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    expect(c.magicMode()).toBe(false);
    c.enterMagicMode();
    expect(c.magicMode()).toBe(true);
    c.exitMagicMode();
    expect(c.magicMode()).toBe(false);
  });

  it('sends a magic link and shows the sent confirmation', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const fixture = setup(request);
    const c = fixture.componentInstance;
    c.enterMagicMode();
    c.magicForm.setValue({ email: 'a@b.co' });
    await c.onSendMagic();
    expect(request).toHaveBeenCalledWith('a@b.co');
    expect(c.magicSent()).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL** (members don't exist)

Run: `npx ng test --watch=false --include="**/login.component.spec.ts"`

- [ ] **Step 3: Implement the toggle**

Replace the ENTIRE `src/app/features/auth/login/login.component.ts` with:
```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthMagicService } from '../../../core/api/auth-magic.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
  ],
  template: `
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center gap-2 p-4 pb-0">
              <i class="pi pi-bolt" style="font-size: 2rem; color: var(--fox-primary)"></i>
              <span class="text-2xl fox-brand">FoxRunner</span>
            </div>
          </ng-template>

          @if (!magicMode()) {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-column gap-3">
              <div class="flex flex-column gap-2">
                <label for="email">Email</label>
                <input
                  id="email"
                  pInputText
                  type="email"
                  formControlName="email"
                  autocomplete="username"
                  required
                />
              </div>
              <div class="flex flex-column gap-2">
                <label for="password">Mot de passe</label>
                <p-password
                  inputId="password"
                  formControlName="password"
                  [toggleMask]="true"
                  [feedback]="false"
                  autocomplete="current-password"
                  styleClass="w-full"
                  [inputStyle]="{ width: '100%' }"
                  required
                />
              </div>
              <p-button
                type="submit"
                label="Se connecter"
                icon="pi pi-sign-in"
                styleClass="w-full"
                [loading]="loading()"
                [disabled]="loading() || form.invalid"
              />
              <a routerLink="/forgot-password" class="text-sm text-center">
                Mot de passe oublié ?
              </a>
              <p-button
                label="Recevoir un lien magique"
                icon="pi pi-envelope"
                severity="secondary"
                [text]="true"
                styleClass="w-full"
                (onClick)="enterMagicMode()"
              />
            </form>
          } @else {
            <form [formGroup]="magicForm" (ngSubmit)="onSendMagic()" class="flex flex-column gap-3">
              <div class="flex flex-column gap-2">
                <label for="magicEmail">Email</label>
                <input
                  id="magicEmail"
                  pInputText
                  type="email"
                  formControlName="email"
                  autocomplete="username"
                  required
                />
              </div>
              @if (magicSent()) {
                <p class="text-sm text-center text-color-secondary m-0">
                  Si un compte existe, un lien de connexion vient d'être envoyé. Vérifie ta boîte mail.
                </p>
              }
              <p-button
                type="submit"
                label="Envoyer le lien"
                icon="pi pi-send"
                styleClass="w-full"
                [loading]="magicLoading()"
                [disabled]="magicLoading() || magicForm.invalid"
              />
              <p-button
                label="Retour au mot de passe"
                icon="pi pi-arrow-left"
                severity="secondary"
                [text]="true"
                styleClass="w-full"
                (onClick)="exitMagicMode()"
              />
            </form>
          }
        </p-card>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authMagic = inject(AuthMagicService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly magicMode = signal(false);
  readonly magicLoading = signal(false);
  readonly magicSent = signal(false);
  readonly magicForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit(): Promise<void> {
    if (this.loading() || this.form.invalid) return;
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigate(['/']);
    } catch {
      // Toast handled by error interceptor.
    } finally {
      this.loading.set(false);
    }
  }

  enterMagicMode(): void {
    this.magicForm.reset({ email: this.form.getRawValue().email });
    this.magicSent.set(false);
    this.magicMode.set(true);
  }

  exitMagicMode(): void {
    this.magicMode.set(false);
  }

  async onSendMagic(): Promise<void> {
    if (this.magicLoading() || this.magicForm.invalid) return;
    this.magicLoading.set(true);
    try {
      await this.authMagic.request(this.magicForm.getRawValue().email);
      this.magicSent.set(true);
    } catch {
      // Toast handled by error interceptor.
    } finally {
      this.magicLoading.set(false);
    }
  }
}
```

- [ ] **Step 4: Run → PASS (2 tests)**

Run: `npx ng test --watch=false --include="**/login.component.spec.ts"`

- [ ] **Step 5: Commit**

```bash
git add src/app/features/auth/login/login.component.ts src/app/features/auth/login/login.component.spec.ts
git commit -m "feat(auth): magic-link mode on the login page"
```

---

## Task 5: Validation (upstream)

**Files:** none

- [ ] **Step 1: Full chain**

Run: `npm run lint && npx ng test --watch=false && npm run build`
Expected: lint clean ; all tests pass (incl. the 4 new specs) ; build complete (bundle-budget warning tolerated).

- [ ] **Step 2: Git state**

Run: `git log --oneline main..HEAD && git status --short`
Expected: coherent history (service → loginWithToken → exchange page → login toggle), clean tree.

---

## Task 6: Replicate to the Node 20 fork

**Files (in `C:\Users\Renaud\WebstormProjects\FoxRunner_frontend_node20`):** same set as upstream.

- [ ] **Step 1: Update the fork main**

Run (PowerShell):
```powershell
cd C:\Users\Renaud\WebstormProjects\FoxRunner_frontend_node20
git checkout main
git pull --ff-only
git checkout -b feat/magic-link
```

- [ ] **Step 2: Copy the new/changed files from upstream**

The four new files are Angular-19-compatible verbatim (HttpClient, signals, `@Input` route binding, `@switch`, `p-progressspinner` all exist in v19). Copy them and the two modified files:
```bash
UP="C:/Users/Renaud/WebstormProjects/FoxRunner_frontend"; FK="C:/Users/Renaud/WebstormProjects/FoxRunner_frontend_node20"
cp "$UP/src/app/core/api/auth-magic.service.ts" "$FK/src/app/core/api/auth-magic.service.ts"
cp "$UP/src/app/core/api/auth-magic.service.spec.ts" "$FK/src/app/core/api/auth-magic.service.spec.ts"
cp "$UP/src/app/core/auth/auth.service.token.spec.ts" "$FK/src/app/core/auth/auth.service.token.spec.ts"
mkdir -p "$FK/src/app/features/auth/magic-link-exchange"
cp "$UP/src/app/features/auth/magic-link-exchange/magic-link-exchange.component.ts" "$FK/src/app/features/auth/magic-link-exchange/"
cp "$UP/src/app/features/auth/magic-link-exchange/magic-link-exchange.component.spec.ts" "$FK/src/app/features/auth/magic-link-exchange/"
cp "$UP/src/app/features/auth/login/login.component.ts" "$FK/src/app/features/auth/login/login.component.ts"
cp "$UP/src/app/features/auth/login/login.component.spec.ts" "$FK/src/app/features/auth/login/login.component.spec.ts"
```
Then apply the same two edits by hand in the fork (do NOT copy `auth.service.ts`/`app.routes.ts` wholesale — they may differ in the fork):
- `src/app/core/auth/auth.service.ts`: add the `loginWithToken` method (identical to Task 2 Step 3) after `login`.
- `src/app/app.routes.ts`: add the `auth/magic/:token` route (identical to Task 3 Step 4).

- [ ] **Step 3: Verify the fork**

Run: `npm test` (vitest/AnalogJS), then `npm run build`, then `npm run lint`.
Expected: all green (the new specs run under the fork's vitest; build clean; lint clean). Note: the fork uses `npm test`, NOT `ng test`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): magic-link login UI (replicated from upstream)"
```

---

## Self-Review (done at writing)

- **Spec coverage:** AuthMagicService request/exchange (T1) ; loginWithToken (T2) ; exchange landing + route + 410/400/no-token states (T3) ; login magicMode toggle + send + neutral confirmation (T4) ; validation (T5) ; both frontends — upstream (T1–T5) + fork (T6). ✓
- **Placeholders:** none — full TS/HTML/tests for every file; exact `ng test --include` / `npm test` commands. ✓
- **Type/name consistency:** `AuthMagicService.request/exchange`, `AuthService.loginWithToken`, `MagicLinkExchangeComponent.token`/`state`, `LoginComponent.magicMode/magicForm/magicSent/magicLoading/enterMagicMode/exitMagicMode/onSendMagic` used identically across tasks ; exchange response `{access_token, token_type}` matches the backend contract and `AuthService`'s `LoginResponse`. The `:token` route param binds to `@Input() token` via the app's existing `withComponentInputBinding()`. ✓
