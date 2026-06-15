# Chrome emerald + topbar sombre + footer + retrait des sous-titres (2026-06-15)

Aligne FoxRunner_frontend sur le langage visuel du fleet Foxugly
(`foxugly-ops/OPERATIONS.md §3.15`, QuizOnline référence) : accent emerald, topbar
sombre, footer ; et retire le sous-titre `PageHeader`.

## Fichiers créés
- `src/app/core/layout/topmenu/` — `app-topmenu` (`TopmenuComponent`) : `.topbar` sombre
  (dégradé slate/navy + voile emerald), brand + nav (`routerLinkActive="active"`) + actions
  (thème/profil/logout) + drawer hamburger < 960px.
- `src/app/core/layout/footer/` — `app-footer` (`FooterComponent`) : brand · tagline ·
  Version {appVersion} · © {année} Foxugly.

## Fichiers modifiés
- `src/app/app.config.ts` — `definePreset(Aura, { semantic: { primary: {emerald.*} } })` → un
  seul emerald pour primary/success/Save.
- `src/styles.scss` — `--fox-primary: #10b981` ; override `.topbar .p-button…-text` (lisible sur
  fond sombre).
- `src/environments/environment.ts` + `.prod.ts` — `appVersion: '0.1.0'`.
- `src/app/app.html` / `app.ts` / `app.scss` — `<app-topmenu>` + `<app-footer>` remplacent le
  `<p-menubar>` ; `app.ts` allégé ; `.fox-menubar` retiré.
- `src/app/shared/components/page-header/page-header.component.ts` — `subtitle` retiré (le
  composant ne garde que `title` + `icon`).
- 19 composants de features — attribut `subtitle`/`[subtitle]` retiré du `<app-page-header>`.
  À noter : `dashboard.component.ts` perd aussi son champ injecté `auth` (n'était utilisé que
  par le sous-titre).

## Tokens emerald
Topbar fond `linear-gradient(135deg, rgba(8,47,73,.98), rgba(15,23,42,.98))` + voile
`linear-gradient(90deg, rgba(56,189,248,.12), rgba(16,185,129,.1))`, texte `#f8fafc`, lien actif
`#6ee7b7` sur `rgba(16,185,129,.16)`. Brand/icône emerald `#34d399` / `--fox-primary #10b981`.

## Hors périmètre (non traité ici)
- Composant de table triable/filtrable → spec séparé `2026-06-15-sortable-table-design.md`.
- Le reste de §3.15 (meta-grid forms, listes/cartes, empty-state tones, i18n, bells, language
  switcher). Observation : le lien « Mot de passe oublié ? » de la page login reste en bleu — à
  traiter dans une passe « liens emerald » distincte.

## Réplication sur FoxRunner_frontend_node20 (Angular 19) — APRÈS ACCORD EXPLICITE
1. Dans le fork : `git pull` (récupérer l'état à jour).
2. Rejouer les mêmes fichiers (créations + modifications ci-dessus) à l'identique.
3. Différences Angular 19 attendues : **aucune** — standalone components, `@if/@for`, signals et
   `@primeuix/themes` `definePreset` existent déjà en v19. Le seul écart de toolchain (vitest via
   AnalogJS) n'affecte pas ces fichiers ; lancer les tests avec `npm test` (pas `ng test`).
4. Valider : `npm test`, `npm run build`, `npm run lint` verts.
