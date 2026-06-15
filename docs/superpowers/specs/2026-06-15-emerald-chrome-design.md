# FoxRunner frontend — chrome emerald + topbar sombre + footer + retrait des sous-titres

**Date:** 2026-06-15
**Statut:** design approuvé, prêt pour le plan d'implémentation
**Scope:** FoxRunner_frontend uniquement (le fork `FoxRunner_frontend_node20` sera traité séparément, après accord + `git pull`)

**Décomposition (fleet visual coherence) :** ce spec couvre **(a)** le chrome emerald/sombre + footer
et **(b)** le retrait des sous-titres `PageHeader`. Un **composant de table triable/filtrable**
(recherche globale + colonnes triables, client-side, appliqué aux 10 tables) est un sous-système
distinct traité dans un **spec séparé** (`2026-06-15-sortable-table-design.md`, à venir).

## Problème

FoxRunner_frontend doit adopter le **langage visuel partagé du fleet Foxugly** (QuizOnline =
référence design, codifié dans `foxugly-ops/OPERATIONS.md §3.15`) : **accent emerald, topbar
sombre, footer**. État actuel : `p-menubar` clair, **pas de footer**, et `--fox-primary: #d97706`
(ambre) — incohérent avec l'Aura émeraude que les composants PrimeNG rendent déjà.

Périmètre : **le chrome uniquement** (topbar + footer + accent emerald). Explicitement **hors
périmètre** : le reste de §3.15 (meta-grid forms, patterns de listes, empty-state tones, i18n
5 langues, message/notification bells, language switcher).

## Référence faisant autorité — `OPERATIONS.md §3.15`

- **Shell** : `<app-topmenu>` + `<main>` (router-outlet) + `<app-footer>` + `<p-toast>`.
- **Topmenu** : `.topbar` **sombre**, brand (favicon/icône + titre) à gauche → `nav` central de
  liens (icône + label, `routerLinkActive="active"`) → actions à droite. Sous le breakpoint
  desktop → hamburger `.drawer` répétant liens + actions.
- **Footer** : une ligne `.footer` — brand · tagline · (fill) · « Version {x} » · © {année}
  Foxugly (logo + lien). Version/année = valeurs runtime.
- **Langage visuel** : accent **emerald** (`#10b981` / `#059669`), topbar sombre, **pas** d'accent
  bleu/mauve. Le preset PrimeNG mappe le primitive `green` sur Emerald → `primary`/`success`/Save
  rendent le **même** emerald.

QuizOnline `topmenu.scss` confirme le rendu : `.topbar` en dégradé slate/navy
(`rgba(15,23,42,0.98)`) avec un voile `linear-gradient(rgba(56,189,248,.18), rgba(16,185,129,.12))`,
sticky, `color: #f8fafc`, brand + `nav` + actions en grille `auto 1fr auto`.

## 1. Architecture — composants sous `src/app/core/layout/`

### `topmenu/` — `app-topmenu`
Composant standalone (`selector: app-topmenu`) remplaçant le `<p-menubar>`. Structure
`<header class="topbar">` → `.topbar__inner` en grille `auto 1fr auto` :
- **brand** (gauche) : `<a routerLink="/">` icône `pi pi-bolt` (couleur emerald) + « FoxRunner ».
- **nav** (centre) : les liens actuels, déplacés depuis `app.ts` :
  Tableau de bord (`/`, `pi-home`), Scénarios (`/scenarios`, `pi-sitemap`), Slots (`/slots`,
  `pi-calendar`), Jobs (`/jobs`, `pi-play`), Plan (`/plan`, `pi-clock`), Historique (`/history`,
  `pi-history`), et Admin (`/admin`, `pi-cog`) si `auth.isSuperuser()`. Chaque lien :
  `routerLinkActive="active"` (soulignement / fond emerald subtil pour l'actif). Le `/` utilise
  `[routerLinkActiveOptions]="{ exact: true }"`.
- **actions** (droite) : email (`auth.currentUser()?.email`, masqué < md), toggle thème
  (`pi-sun`/`pi-moon`), profil (`pi-user`, `routerLink="/profile"`), déconnexion (`pi-sign-out`,
  `logout()`). Boutons `p-button` `[text]` `[rounded]` `severity="secondary"`, restylés clairs sur
  fond sombre.
- **responsive** : sous ~960px, `nav` + email cachés ; un bouton hamburger
  (`pi-bars`/`pi-times`, `[attr.aria-expanded]`, `aria-label`) ouvre un `.drawer` (signal
  `menuOpen`) répétant liens + actions verticalement. Le drawer se ferme sur navigation.

Entrées : aucune (lit `AuthService`, `ThemeService` injectés). Sorties : aucune (gère `logout`
en interne). Dépendances : `RouterLink`, `RouterLinkActive`, `ButtonModule`, `TooltipModule`,
`AuthService`, `ThemeService`.

### `footer/` — `app-footer`
Composant standalone (`selector: app-footer`). `<footer class="footer">` → `.footer__inner`
(flex, `gap`, `align-items:center`) :
- `.footer__brand` « FoxRunner »
- `.footer__tagline` « Moteur d'automatisation »
- spacer (`flex:1`)
- `.footer__meta` : « Version {appVersion} » · © {year} Foxugly (lien
  `https://www.foxugly.com`, `target="_blank" rel="noopener noreferrer"`, + logo si dispo).

Valeurs runtime : `appVersion` lu depuis `environment.ts` ; `year = new Date().getFullYear()`.
Le footer est clair (surface), pas sombre — seule la topbar est sombre.

### Coquille — `app.html` / `app.ts`
`app.html` : conserver `<p-toast>`, `<p-confirmDialog>`, la bannière offline ; remplacer le bloc
`@if (auth.isLoggedIn())` pour qu'il rende
`<div class="fox-shell"><app-topmenu/> <main class="fox-main"><router-outlet/></main> <app-footer/></div>`.
`app.ts` : retirer `MenubarModule`, le `topMenu` computed, `logout` (déplacés dans `app-topmenu`) ;
importer `Topmenu` + `Footer`. `App` ne garde que ce qui sert la coquille (toast/offline/auth gate).

## 2. Thème emerald

### `app.config.ts`
Envelopper `Aura` dans un preset emerald :
```ts
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const FoxAura = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{emerald.50}', 100: '{emerald.100}', 200: '{emerald.200}',
      300: '{emerald.300}', 400: '{emerald.400}', 500: '{emerald.500}',
      600: '{emerald.600}', 700: '{emerald.700}', 800: '{emerald.800}',
      900: '{emerald.900}', 950: '{emerald.950}',
    },
  },
});
```
`providePrimeNG({ theme: { preset: FoxAura, options: { prefix: 'p', darkModeSelector: '.fox-dark',
cssLayer: false } }, translation: … })`. Garantit un seul emerald pour `primary`/`success`/Save.

### `styles.scss`
`--fox-primary` : `#d97706` → **`#10b981`** (emerald-500). `.fox-brand` continue d'utiliser
`var(--fox-primary)` → brand emerald, cohérent avec les composants.

### `environment.ts` / `environment.prod.ts`
Ajouter `appVersion: '0.1.0'` (constante de build, consommée par le footer). Valeur à ajuster
librement ; pas de dépendance backend.

## 3. Styles topbar (sombre, emerald) — `topmenu.scss`

- `.topbar` : `position: sticky; top: 0; z-index: 50;` fond
  `linear-gradient(135deg, rgba(8,47,73,.98), rgba(15,23,42,.98))` superposé d'un voile
  `linear-gradient(90deg, rgba(56,189,248,.16), rgba(16,185,129,.12))` ; `border-bottom: 1px solid
  rgba(148,163,184,.22)` ; `color: #f8fafc`.
- `.topbar__inner` : `max-width: 1400px; margin: 0 auto; min-height: 60px; display: grid;
  grid-template-columns: auto 1fr auto; gap: 0 .85rem; padding: .45rem 1.1rem;`
- `.nav` : flex centré, `gap: .25rem` ; `.nav__link` clair (`rgba(248,250,252,.82)`), `:hover`
  fond `rgba(255,255,255,.08)`, `.active` couleur emerald (`#34d399`) + soulignement / fond
  `rgba(16,185,129,.16)`.
- Actions : boutons `p-button text` restylés en clair sur fond sombre (override ciblé du
  `styleClass`, ex. `.topbar .p-button.p-button-text { color: #e2e8f0; }`).
- `.drawer` (mobile) : panneau plein largeur sous la topbar, même fond sombre, liens empilés.

## 4. Responsive & a11y

- Breakpoint ~960px : bascule nav inline ↔ drawer.
- `routerLinkActive="active"` pour l'état actif ; hamburger `[attr.aria-expanded]` + `aria-label`
  dynamique (« Ouvrir/Fermer le menu ») ; tous les liens/boutons focusables ; contraste clair sur
  fond sombre (parité QuizOnline privilégiée sur WCAG strict, cf. §3.15).

## 5. Tests (vitest)

- `topmenu.component.spec.ts` : le composant se monte (TestBed + `provideRouter([])`,
  `AuthService`/`ThemeService` réels ou stubés) ; nav rendue ; Admin présent ssi superuser.
- `footer.component.spec.ts` : se monte ; affiche `appVersion` et l'année courante.
- `app.spec.ts` : mis à jour — imports `Topmenu`/`Footer` au lieu de `MenubarModule` ; le smoke
  « should create the app » reste vert.
- `PageHeader` : après retrait du `subtitle`, vérifier qu'aucun spec ne référence l'Input ; le
  composant se monte toujours avec `title`/`icon`.
- `npm run build`, `ng lint`, `vitest run` doivent rester verts.

## 6. Retrait des sous-titres `PageHeader`

Périmètre confirmé : **uniquement** le `subtitle` du `PageHeaderComponent` (le `<p>` muted sous le
titre). Le `message` d'`EmptyState` et les autres textes secondaires **restent**.

- `src/app/shared/components/page-header/page-header.component.ts` : retirer l'`@Input() subtitle?`
  et le bloc `@if (subtitle) { <p …>{{ subtitle }}</p> }`. Le `<div>` wrapper du titre peut être
  simplifié (le `<h1>` devient l'unique enfant).
- Retirer les **19 usages** `[subtitle]="…"` / `subtitle="…"` dans les templates/composants de
  features (admin/**, scenarios, slots, jobs, history, plan, profile, dashboard…). Les localiser
  via `grep -rn "\[subtitle\]\|subtitle=" src/app`.
- Aucun autre comportement touché ; pur nettoyage visuel. Lint/build/tests doivent rester verts
  (un `@Input` retiré qui n'est plus lié ne casse rien ; vérifier qu'aucun test ne lit
  `subtitle`).

## 7. Documentation (livrable demandé)

`docs/design/2026-06-15-emerald-chrome.md` dans FoxRunner_frontend :
- liste exacte des fichiers créés/modifiés + tokens emerald + structure topbar/footer + retrait du
  `subtitle` `PageHeader` (et ses 19 usages) ;
- **procédure de réplication sur `FoxRunner_frontend_node20`** : `git pull` du fork, rejouer les
  mêmes fichiers (gabarits/SCSS/standalone components + `definePreset` + retrait des sous-titres),
  à n'exécuter qu'**après accord explicite** de l'utilisateur. Différences Angular 19 attendues :
  **aucune** (standalone components, `@if/@for`, signals, `@primeuix/themes definePreset` existent
  déjà en v19).

## Risques / points de vigilance

- **Override des `p-button` dans la topbar** : la couleur claire sur fond sombre passe par un
  sélecteur ciblé `.topbar …` ; vérifier qu'il ne fuit pas hors topbar (encapsulation SCSS du
  composant + préfixe `.topbar`).
- **Logo Foxugly du footer** : si `public/foxugly-logo.svg` est absent, se rabattre sur un lien
  texte « Foxugly » (pas de blocage). À vérifier à l'implémentation.
- **`appVersion`** : simple constante de build ; ne pas inventer d'endpoint backend.

## Hors périmètre

- **Composant de table triable/filtrable** : sous-système distinct, traité dans son **propre spec**
  (`2026-06-15-sortable-table-design.md`) — pas dans ce plan.
- meta-grid forms, patterns de listes/cartes, empty-state tones/`message`, i18n multi-langue,
  message/notification bells, language switcher, et toute modification fonctionnelle de l'app.
