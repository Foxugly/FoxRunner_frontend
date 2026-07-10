# Backlog — harmonisation layout · FoxRunner_frontend (A21)

> **Cible :** `STANDARD-frontend-layout.md` (repo `foxugly-ops`).
> **Miroir :** appliquer à l'identique dans `FoxRunner_frontend_node20`.
> **Statut :** à faire (audit 2026-07-10). Idéalement 1 PR par bloc.

## ✅ Déjà conforme
- `app-topmenu` · `core/layout/topmenu/` · BEM `topbar__*` · fichiers séparés.
- Toggle thème + `ThemeService` (signal, fallback système).
- `app-page-header` 3 zones ; `detail-header` déjà supprimé.
- `app-empty-state` + skeletons présents.

## Phase 1 — structurel (bas risque)
- [ ] **Thème** : clé `fox-theme` → `theme` ; sélecteur `.fox-dark` → `.dark-mode`.
- [ ] **Thème** : script **anti-FOUC** inline dans `index.html` (avant bootstrap).
- [ ] **Topmenu** : drawer 960 → **1024** (`--bp-lg`).
- [ ] **Topmenu** : ajouter `[mode]` public/authenticated + afficher le topmenu hors-auth avec bouton **« Se connecter »** (aujourd'hui masqué hors-auth).
- [ ] **Page-header** : migrer l'API `[backLink]` → **slot** `[slot=left]` (retirer les inputs `backLink`/`backQueryParams`).
- [ ] **Shell** : créer `main-layout` / `public-layout` (`core/layout/`) — `app-shell` flex-col, **skip-link**, `<main class="main-container">`, `<p-toast>` unique (aujourd'hui assemblé dans `app.html`).
- [ ] **Grille** : largeur unique `--content-max: 80rem` / `--content-pad: 1.5rem`, fonds pleine largeur, topbar/page/footer alignés.
- [ ] **Footer** : vérifier version runtime + dark `:host-context(.dark-mode)`.
- [ ] **Breakpoints** : normaliser sur `sm 640 / md 768 / lg 1024 / xl 1280`.
- [ ] **CSS** : retirer **PrimeFlex** (~422 usages) au fil des réécritures ; désinstaller la dép quand vide.

## Phase 2 — i18n (lourd)
- [ ] Ajouter **Transloco** + `app-language-switcher` (réf TrainingManager) + 5 langues fr/nl/en/it/es.
- [ ] Traduire l'UI (aujourd'hui FR-only, zéro i18n).
- [ ] Ordre des actions : thème → **langue** → user.

## Hors périmètre
- Pages **Features / About** : N/A (outil interne, pas de pages marketing publiques).
- **Cloches** : N/A (pas de messagerie / notifications).
