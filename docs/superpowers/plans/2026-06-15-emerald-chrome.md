# Chrome emerald + topbar sombre + footer + retrait sous-titres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aligner le chrome de FoxRunner_frontend sur le langage visuel du fleet Foxugly (OPERATIONS.md §3.15, QuizOnline référence) : accent emerald, topbar sombre via `app-topmenu`, footer via `app-footer`, et retrait du sous-titre `PageHeader`.

**Architecture:** Deux composants standalone neufs sous `src/app/core/layout/` (`topmenu`, `footer`) remplacent le `<p-menubar>` inline ; le preset Aura est enveloppé dans un `definePreset` emerald ; `--fox-primary` passe d'ambre à emerald ; le `subtitle` de `PageHeaderComponent` et ses 19 usages sont retirés.

**Tech Stack:** Angular 21, PrimeNG 21 (`@primeuix/themes` `definePreset`/`Aura`), standalone components, signals, vitest.

**Spec source:** `docs/superpowers/specs/2026-06-15-emerald-chrome-design.md`
**Branche:** `feat/emerald-chrome` (déjà créée depuis `main`).
**Hors périmètre:** composant de table triable/filtrable (spec séparé), reste de §3.15.

**Convention de nommage (IMPORTANT):** les composants partagés de FoxRunner portent le suffixe
`Component` (`PageHeaderComponent`, `EmptyStateComponent`). Les nouveaux composants sont donc
`TopmenuComponent` et `FooterComponent` (fichiers `*.component.ts`). Seule la classe racine `App`
n'a pas de suffixe (scaffold Angular 21). Ceci corrige le nommage informel du spec.

---

## File Structure

- `src/app/core/layout/footer/footer.component.ts` — **créé** : `app-footer`, une ligne (brand · tagline · version · © année Foxugly).
- `src/app/core/layout/footer/footer.component.scss` — **créé** : styles footer clair.
- `src/app/core/layout/footer/footer.component.spec.ts` — **créé** : monte + affiche version/année.
- `src/app/core/layout/topmenu/topmenu.component.ts` — **créé** : `app-topmenu`, modèle de nav + actions + drawer.
- `src/app/core/layout/topmenu/topmenu.component.html` — **créé** : `.topbar` (brand/nav/actions + drawer mobile).
- `src/app/core/layout/topmenu/topmenu.component.scss` — **créé** : topbar sombre emerald + responsive.
- `src/app/core/layout/topmenu/topmenu.component.spec.ts` — **créé** : monte + nav + Admin gated.
- `src/app/app.config.ts` — **modifié** : `definePreset(Aura, { primary: emerald })`.
- `src/styles.scss` — **modifié** : `--fox-primary` emerald + override boutons dans `.topbar`.
- `src/environments/environment.ts` / `environment.prod.ts` — **modifié** : `appVersion`.
- `src/app/app.html` — **modifié** : `<app-topmenu>` + `<app-footer>` remplacent le `<p-menubar>`.
- `src/app/app.ts` — **modifié** : imports allégés (retire `MenubarModule`/`ButtonModule`/nav/logout).
- `src/app/app.scss` — **modifié** : retire `.fox-menubar`.
- `src/app/shared/components/page-header/page-header.component.ts` — **modifié** : retire `subtitle`.
- 19 fichiers de features — **modifié** : retire l'attribut `subtitle`/`[subtitle]`.
- `docs/design/2026-06-15-emerald-chrome.md` — **créé** : doc + procédure de réplication fork.

---

## Task 1: Thème emerald + version footer

**Files:**
- Modify: `src/app/app.config.ts`
- Modify: `src/styles.scss`
- Modify: `src/environments/environment.ts`, `src/environments/environment.prod.ts`

- [ ] **Step 1: Envelopper Aura dans un preset emerald**

Dans `src/app/app.config.ts`, remplacer l'import du thème et le `preset: Aura` :
```ts
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const FoxAura = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{emerald.50}',
      100: '{emerald.100}',
      200: '{emerald.200}',
      300: '{emerald.300}',
      400: '{emerald.400}',
      500: '{emerald.500}',
      600: '{emerald.600}',
      700: '{emerald.700}',
      800: '{emerald.800}',
      900: '{emerald.900}',
      950: '{emerald.950}',
    },
  },
});
```
et changer `preset: Aura` → `preset: FoxAura` dans l'objet `providePrimeNG({ theme: { preset: … } })`. Garder `options: { prefix: 'p', darkModeSelector: '.fox-dark', cssLayer: false }` et `translation`.

- [ ] **Step 2: `--fox-primary` emerald + override boutons topbar**

Dans `src/styles.scss`, remplacer la valeur de `--fox-primary` :
```scss
:root {
  --fox-primary: #10b981;
}
```
et ajouter, à la fin du fichier, l'override global des boutons sur fond sombre (les éléments PrimeNG rendus échappent à l'encapsulation du composant) :
```scss
/* Topbar (dark): make PrimeNG secondary text-buttons legible on the dark bar. */
.topbar .p-button.p-button-secondary.p-button-text {
  color: #e2e8f0;
}
.topbar .p-button.p-button-secondary.p-button-text:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
```

- [ ] **Step 3: Ajouter `appVersion` aux deux environments**

`src/environments/environment.ts` :
```ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://127.0.0.1:8000/api/v1',
  defaultTimezone: 'Europe/Brussels',
  defaultLocale: 'fr-BE',
  appVersion: '0.1.0',
} as const;
```
`src/environments/environment.prod.ts` :
```ts
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  defaultTimezone: 'Europe/Brussels',
  defaultLocale: 'fr-BE',
  appVersion: '0.1.0',
} as const;
```

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: `Application bundle generation complete` (seul warning toléré : budget de bundle).

- [ ] **Step 5: Commit**

```bash
git add src/app/app.config.ts src/styles.scss src/environments/environment.ts src/environments/environment.prod.ts
git commit -m "feat(theme): emerald Aura preset + appVersion for footer"
```

---

## Task 2: Composant `app-footer`

**Files:**
- Create: `src/app/core/layout/footer/footer.component.ts`
- Create: `src/app/core/layout/footer/footer.component.scss`
- Test: `src/app/core/layout/footer/footer.component.spec.ts`

- [ ] **Step 1: Écrire le test (échoue d'abord)**

`src/app/core/layout/footer/footer.component.spec.ts` :
```ts
import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { environment } from '../../../../environments/environment';

describe('FooterComponent', () => {
  it('renders the brand, version and current year', () => {
    TestBed.configureTestingModule({ imports: [FooterComponent] });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('FoxRunner');
    expect(text).toContain(environment.appVersion);
    expect(text).toContain(String(new Date().getFullYear()));
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `npx vitest run src/app/core/layout/footer/footer.component.spec.ts`
Expected: FAIL (`Cannot find module './footer.component'`).

- [ ] **Step 3: Implémenter le composant**

`src/app/core/layout/footer/footer.component.ts` :
```ts
import { Component } from '@angular/core';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="footer__inner">
        <span class="footer__brand">FoxRunner</span>
        <span class="footer__tagline">Moteur d'automatisation</span>
        <span class="footer__spacer"></span>
        <span class="footer__meta">
          <span>Version {{ version }}</span>
          <span class="footer__sep" aria-hidden="true">·</span>
          <span>
            © {{ year }}
            <a
              href="https://www.foxugly.com"
              target="_blank"
              rel="noopener noreferrer"
              class="footer__link"
              >Foxugly</a
            >
          </span>
        </span>
      </div>
    </footer>
  `,
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly version = environment.appVersion;
  readonly year = new Date().getFullYear();
}
```

`src/app/core/layout/footer/footer.component.scss` :
```scss
.footer {
  border-top: 1px solid var(--p-content-border-color, #e5e7eb);
  background: var(--p-content-background, #ffffff);
}

.footer__inner {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0.85rem 1.5rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color, #6b7280);
}

.footer__brand {
  font-weight: 700;
  color: var(--fox-primary);
}

.footer__spacer {
  flex: 1;
}

.footer__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.footer__sep {
  opacity: 0.5;
}

.footer__link {
  color: var(--fox-primary);
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
}
```

- [ ] **Step 4: Lancer le test → succès**

Run: `npx vitest run src/app/core/layout/footer/footer.component.spec.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/app/core/layout/footer
git commit -m "feat(layout): add app-footer (brand, tagline, version, copyright)"
```

---

## Task 3: Composant `app-topmenu`

**Files:**
- Create: `src/app/core/layout/topmenu/topmenu.component.ts`
- Create: `src/app/core/layout/topmenu/topmenu.component.html`
- Create: `src/app/core/layout/topmenu/topmenu.component.scss`
- Test: `src/app/core/layout/topmenu/topmenu.component.spec.ts`

- [ ] **Step 1: Écrire le test (échoue d'abord)**

`src/app/core/layout/topmenu/topmenu.component.spec.ts` :
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { TopmenuComponent } from './topmenu.component';
import { AuthService } from '../../auth/auth.service';

function makeAuthStub(superuser: boolean) {
  return {
    currentUser: signal<{ email: string } | null>({ email: 'admin@local' }),
    isSuperuser: signal(superuser),
    logout: () => Promise.resolve(),
  };
}

describe('TopmenuComponent', () => {
  it('renders the base nav links without Admin for a normal user', () => {
    TestBed.configureTestingModule({
      imports: [TopmenuComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: makeAuthStub(false) }],
    });
    const fixture = TestBed.createComponent(TopmenuComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Tableau de bord');
    expect(text).toContain('Scénarios');
    expect(text).not.toContain('Admin');
  });

  it('shows the Admin link for a superuser', () => {
    TestBed.configureTestingModule({
      imports: [TopmenuComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: makeAuthStub(true) }],
    });
    const fixture = TestBed.createComponent(TopmenuComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent as string).toContain('Admin');
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `npx vitest run src/app/core/layout/topmenu/topmenu.component.spec.ts`
Expected: FAIL (`Cannot find module './topmenu.component'`).

- [ ] **Step 3: Implémenter le composant (TS)**

`src/app/core/layout/topmenu/topmenu.component.ts` :
```ts
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../theme/theme.service';

interface NavLink {
  label: string;
  icon: string;
  link: string;
  exact?: boolean;
}

@Component({
  selector: 'app-topmenu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ButtonModule, TooltipModule],
  templateUrl: './topmenu.component.html',
  styleUrl: './topmenu.component.scss',
})
export class TopmenuComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);

  readonly links = computed<NavLink[]>(() => {
    const base: NavLink[] = [
      { label: 'Tableau de bord', icon: 'pi pi-home', link: '/', exact: true },
      { label: 'Scénarios', icon: 'pi pi-sitemap', link: '/scenarios' },
      { label: 'Slots', icon: 'pi pi-calendar', link: '/slots' },
      { label: 'Jobs', icon: 'pi pi-play', link: '/jobs' },
      { label: 'Plan', icon: 'pi pi-clock', link: '/plan' },
      { label: 'Historique', icon: 'pi pi-history', link: '/history' },
    ];
    if (this.auth.isSuperuser()) {
      base.push({ label: 'Admin', icon: 'pi pi-cog', link: '/admin' });
    }
    return base;
  });

  toggleMenu(): void {
    this.menuOpen.update((v) => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  async logout(): Promise<void> {
    this.closeMenu();
    await this.auth.logout();
  }
}
```

- [ ] **Step 4: Implémenter le template (HTML)**

`src/app/core/layout/topmenu/topmenu.component.html` :
```html
<header class="topbar">
  <div class="topbar__inner">
    <a routerLink="/" class="topbar__brand" (click)="closeMenu()">
      <i class="pi pi-bolt topbar__brand-icon"></i>
      <span class="topbar__brand-name">FoxRunner</span>
    </a>

    <nav class="topbar__nav" aria-label="Navigation principale">
      @for (item of links(); track item.link) {
        <a
          [routerLink]="item.link"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          class="topbar__link"
        >
          <i [class]="item.icon"></i>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>

    <div class="topbar__actions">
      <span class="topbar__email">{{ auth.currentUser()?.email }}</span>
      <p-button
        [icon]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"
        [rounded]="true"
        severity="secondary"
        [text]="true"
        (onClick)="theme.toggle()"
        pTooltip="Basculer thème"
        ariaLabel="Basculer thème"
      />
      <p-button
        icon="pi pi-user"
        [rounded]="true"
        severity="secondary"
        [text]="true"
        routerLink="/profile"
        pTooltip="Profil"
        ariaLabel="Profil"
      />
      <p-button
        icon="pi pi-sign-out"
        [rounded]="true"
        severity="secondary"
        [text]="true"
        (onClick)="logout()"
        pTooltip="Déconnexion"
        ariaLabel="Déconnexion"
      />
      <button
        type="button"
        class="topbar__toggle"
        [attr.aria-expanded]="menuOpen()"
        [attr.aria-label]="menuOpen() ? 'Fermer le menu' : 'Ouvrir le menu'"
        (click)="toggleMenu()"
      >
        <i class="pi" [class.pi-bars]="!menuOpen()" [class.pi-times]="menuOpen()"></i>
      </button>
    </div>
  </div>

  @if (menuOpen()) {
    <nav class="topbar__drawer" aria-label="Navigation mobile">
      @for (item of links(); track item.link) {
        <a
          [routerLink]="item.link"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
          class="topbar__drawer-link"
          (click)="closeMenu()"
        >
          <i [class]="item.icon"></i>
          <span>{{ item.label }}</span>
        </a>
      }
    </nav>
  }
</header>
```

- [ ] **Step 5: Implémenter les styles (SCSS)**

`src/app/core/layout/topmenu/topmenu.component.scss` :
```scss
:host {
  display: block;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.topbar {
  background:
    linear-gradient(90deg, rgba(56, 189, 248, 0.12), rgba(16, 185, 129, 0.1)),
    linear-gradient(135deg, rgba(8, 47, 73, 0.98), rgba(15, 23, 42, 0.98));
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
  color: #f8fafc;
}

.topbar__inner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0 0.85rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 60px;
  padding: 0.4rem 1.1rem;
}

.topbar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: inherit;
}

.topbar__brand-icon {
  font-size: 1.4rem;
  color: #34d399;
}

.topbar__brand-name {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.topbar__nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.15rem;
}

.topbar__link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  color: rgba(248, 250, 252, 0.82);
  text-decoration: none;
  font-size: 0.92rem;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
  }

  &.active {
    background: rgba(16, 185, 129, 0.16);
    color: #6ee7b7;
  }

  i {
    font-size: 0.95rem;
  }
}

.topbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.topbar__email {
  color: rgba(226, 232, 240, 0.75);
  font-size: 0.85rem;
  margin-right: 0.35rem;
}

.topbar__toggle {
  display: none;
  background: transparent;
  border: 0;
  color: #f8fafc;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
}

.topbar__drawer {
  display: none;
  flex-direction: column;
  padding: 0.4rem 0.8rem 0.8rem;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.topbar__drawer-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 0.6rem;
  border-radius: 8px;
  color: rgba(248, 250, 252, 0.9);
  text-decoration: none;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &.active {
    background: rgba(16, 185, 129, 0.16);
    color: #6ee7b7;
  }
}

@media (max-width: 960px) {
  .topbar__nav {
    display: none;
  }
  .topbar__email {
    display: none;
  }
  .topbar__toggle {
    display: inline-flex;
  }
  .topbar__drawer {
    display: flex;
  }
}
```

- [ ] **Step 6: Lancer le test → succès**

Run: `npx vitest run src/app/core/layout/topmenu/topmenu.component.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/core/layout/topmenu
git commit -m "feat(layout): add dark emerald app-topmenu (brand, nav, actions, mobile drawer)"
```

---

## Task 4: Câbler la coquille (`app.html` / `app.ts` / `app.scss`)

**Files:**
- Modify: `src/app/app.html`
- Modify: `src/app/app.ts`
- Modify: `src/app/app.scss`
- Test: `src/app/app.spec.ts` (re-run, pas de changement attendu)

- [ ] **Step 1: Remplacer le bloc menu dans `app.html`**

Remplacer l'INTÉGRALITÉ de `src/app/app.html` par :
```html
<p-toast position="top-right" />
<p-confirmDialog />

@if (network.offline()) {
  <div
    class="fox-offline-banner"
    role="alert"
    aria-live="assertive"
  >
    <i class="pi pi-exclamation-triangle mr-2"></i>
    Le backend semble injoignable ({{ network.consecutiveErrors() }} erreurs consécutives).
    Vérifie que l'API tourne sur
    <code>http://127.0.0.1:8000</code>.
  </div>
}

@if (auth.isLoggedIn()) {
  <div class="fox-shell">
    <app-topmenu />
    <main class="fox-main">
      <router-outlet />
    </main>
    <app-footer />
  </div>
} @else {
  <router-outlet />
}
```

- [ ] **Step 2: Alléger `app.ts`**

Remplacer l'INTÉGRALITÉ de `src/app/app.ts` par :
```ts
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AuthService } from './core/auth/auth.service';
import { NetworkHealthService } from './core/http/network-health.service';
import { TopmenuComponent } from './core/layout/topmenu/topmenu.component';
import { FooterComponent } from './core/layout/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ToastModule,
    ConfirmDialogModule,
    TopmenuComponent,
    FooterComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly auth = inject(AuthService);
  readonly network = inject(NetworkHealthService);
}
```
(retire `RouterLink`, `MenubarModule`, `ButtonModule`, `MenuItem`, `ThemeService`, le computed `topMenu` et `logout` — tous déplacés dans `app-topmenu`.)

- [ ] **Step 3: Retirer `.fox-menubar` de `app.scss`**

Dans `src/app/app.scss`, supprimer le bloc devenu inutile :
```scss
.fox-menubar {
  border-radius: 0;
}
```
Garder `.fox-shell`, `.fox-main`, `.fox-offline-banner` inchangés (le `.fox-shell` flex-column + `.fox-main { flex: 1 }` collent le footer en bas).

- [ ] **Step 4: Build + tests + lint**

Run: `npm run build`
Expected: `Application bundle generation complete` (warning budget toléré).
Run: `npx vitest run src/app/app.spec.ts`
Expected: PASS (le smoke « should create the app » — non connecté, donc rend le `@else`).
Run: `npm run lint`
Expected: `All files pass linting.` (si `ButtonModule`/`MenuItem` restent importés par erreur, les retirer.)

- [ ] **Step 5: Commit**

```bash
git add src/app/app.html src/app/app.ts src/app/app.scss
git commit -m "feat(layout): wire app-topmenu + app-footer into the shell"
```

---

## Task 5: Retrait du sous-titre `PageHeader` (composant + 19 usages)

**Files:**
- Modify: `src/app/shared/components/page-header/page-header.component.ts`
- Modify: 19 fichiers de features (liste ci-dessous)

- [ ] **Step 1: Retirer l'Input et le rendu du sous-titre**

Remplacer l'INTÉGRALITÉ de `src/app/shared/components/page-header/page-header.component.ts` par :
```ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <header class="flex align-items-start justify-content-between mb-4 gap-3 flex-wrap">
      <div class="flex align-items-center gap-3">
        @if (icon) {
          <i [class]="'pi ' + icon" style="font-size: 1.75rem; color: var(--fox-primary)"></i>
        }
        <h1 class="m-0 text-2xl font-semibold">{{ title }}</h1>
      </div>
      <div class="flex gap-2 flex-wrap">
        <ng-content />
      </div>
    </header>
  `,
})
export class PageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() icon?: string;
}
```
(le `<div>` wrapper autour du `<h1>` est supprimé puisque le sous-titre disparaît.)

- [ ] **Step 2: Retirer l'attribut `subtitle` des 19 usages**

Dans chacun de ces fichiers, retirer l'attribut `subtitle="…"` ou `[subtitle]="…"` sur le
`<app-page-header>` (si l'attribut est seul sur sa ligne, supprimer la ligne ; s'il est inline,
retirer juste l'attribut) :

```
src/app/features/admin/artifacts/admin-artifacts.component.ts
src/app/features/admin/audit/admin-audit.component.ts
src/app/features/admin/catalog/admin-catalog.component.ts
src/app/features/admin/graph/admin-graph.component.ts
src/app/features/admin/health/admin-health.component.ts
src/app/features/admin/home/admin-home.component.ts
src/app/features/admin/retention/admin-retention.component.ts
src/app/features/admin/users/admin-users.component.ts
src/app/features/dashboard/dashboard.component.ts
src/app/features/history/history.component.ts
src/app/features/jobs/detail/job-detail.component.ts
src/app/features/jobs/list/jobs-list.component.ts
src/app/features/plan/plan.component.ts
src/app/features/profile/profile.component.ts
src/app/features/scenarios/detail/scenario-detail.component.ts
src/app/features/scenarios/edit/scenario-edit.component.ts
src/app/features/scenarios/list/scenarios-list.component.ts
src/app/features/scenarios/step-collections-editor/step-collections-editor.component.ts
src/app/features/slots/list/slots-list.component.ts
```

- [ ] **Step 3: Vérifier qu'il ne reste aucun usage**

Run: `grep -rn "\[subtitle\]\|subtitle=" src/app --include=*.html --include=*.ts`
Expected: aucune sortie (0 résultat).

- [ ] **Step 4: Build + lint + tests**

Run: `npm run build`
Expected: `Application bundle generation complete`. Si une erreur signale un binding `subtitle`
inconnu, c'est qu'un usage a été manqué → revenir au Step 2.
Run: `npm run lint`
Expected: `All files pass linting.` Si un composant a un service injecté devenu inutilisé après le
retrait (ex. `auth` dans `dashboard` s'il ne servait qu'au sous-titre), le retirer aussi.
Run: `ng test --watch=false`
Expected: tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/components/page-header/page-header.component.ts src/app/features
git commit -m "refactor(ui): remove PageHeader subtitle across all pages"
```

---

## Task 6: Documentation + procédure de réplication fork

**Files:**
- Create: `docs/design/2026-06-15-emerald-chrome.md`

- [ ] **Step 1: Écrire le doc**

`docs/design/2026-06-15-emerald-chrome.md` :
```markdown
# Chrome emerald + topbar sombre + footer + retrait des sous-titres (2026-06-15)

Aligne FoxRunner_frontend sur le langage visuel du fleet Foxugly
(`foxugly-ops/OPERATIONS.md §3.15`, QuizOnline référence) : accent emerald, topbar
sombre, footer ; et retire le sous-titre `PageHeader`.

## Fichiers créés
- `src/app/core/layout/topmenu/` — `app-topmenu` : `.topbar` sombre (dégradé slate/navy +
  voile emerald), brand + nav (`routerLinkActive="active"`) + actions (thème/profil/logout) +
  drawer hamburger < 960px.
- `src/app/core/layout/footer/` — `app-footer` : brand · tagline · Version {appVersion} ·
  © {année} Foxugly.

## Fichiers modifiés
- `src/app/app.config.ts` — `definePreset(Aura, { semantic: { primary: {emerald.*} } })` → un
  seul emerald pour primary/success/Save.
- `src/styles.scss` — `--fox-primary: #10b981` ; override `.topbar .p-button…-text` (lisible sur
  fond sombre).
- `src/environments/environment.ts` + `.prod.ts` — `appVersion: '0.1.0'`.
- `src/app/app.html` / `app.ts` / `app.scss` — `<app-topmenu>` + `<app-footer>` remplacent le
  `<p-menubar>` ; `app.ts` allégé ; `.fox-menubar` retiré.
- `src/app/shared/components/page-header/page-header.component.ts` — `subtitle` retiré.
- 19 composants de features — attribut `subtitle` retiré.

## Tokens emerald
Topbar fond `linear-gradient(135deg, rgba(8,47,73,.98), rgba(15,23,42,.98))` + voile
`linear-gradient(90deg, rgba(56,189,248,.12), rgba(16,185,129,.1))`, texte `#f8fafc`, lien actif
`#6ee7b7` sur `rgba(16,185,129,.16)`. Brand/icône emerald `#34d399` / `--fox-primary #10b981`.

## Réplication sur FoxRunner_frontend_node20 (Angular 19) — APRÈS ACCORD EXPLICITE
1. Dans le fork : `git pull` (récupérer l'état à jour).
2. Rejouer les mêmes fichiers (créations + modifications ci-dessus) à l'identique.
3. Différences Angular 19 attendues : **aucune** — standalone components, `@if/@for`, signals et
   `@primeuix/themes` `definePreset` existent déjà en v19. Le seul écart de toolchain (vitest via
   AnalogJS) n'affecte pas ces fichiers ; lancer les tests avec `npm test` (pas `ng test`).
4. Valider : `npm test`, `npm run build`, `npm run lint` verts.
```

- [ ] **Step 2: Commit**

```bash
git add docs/design/2026-06-15-emerald-chrome.md
git commit -m "docs(chrome): document emerald chrome changes + fork replication procedure"
```

---

## Task 7: Validation finale

**Files:** aucun

- [ ] **Step 1: Chaîne complète**

Run: `npm run lint && ng test --watch=false && npm run build`
Expected: lint vert ; tous les tests verts (dont les 2 nouveaux specs topmenu + 1 footer) ;
`Application bundle generation complete` (warning budget toléré).

- [ ] **Step 2: Vérifier l'état git**

Run: `git log --oneline && git status --short`
Expected: historique cohérent (thème → footer → topmenu → shell → sous-titres → doc), arbre propre.

---

## Self-Review (effectuée à l'écriture)

- **Couverture spec :** §1 architecture (T2,T3,T4) ; §2 thème emerald (T1) ; §3 styles topbar (T3) ;
  §4 responsive/a11y (T3 drawer + aria) ; §5 tests (T2,T3,T4) ; §6 retrait sous-titres (T5) ;
  §7 documentation (T6). Validation globale (T7). ✓
- **Placeholders :** aucun TODO/TBD ; tout le code (TS/HTML/SCSS/tests) est fourni intégral ; la
  liste des 19 fichiers est explicite. ✓
- **Cohérence des noms :** `TopmenuComponent`/`FooterComponent` (suffixe `Component`, comme
  `PageHeaderComponent`) utilisés identiquement dans les specs, `app.ts` (imports) et les fichiers
  de test ; `appVersion` défini en T1 et consommé en T2 ; sélecteur `.topbar` défini en T3 et ciblé
  par l'override de `styles.scss` en T1. ✓
