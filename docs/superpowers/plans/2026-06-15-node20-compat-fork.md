# Fork compatible Node 20.14.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire un fork séparé `FoxRunner_frontend_node20` rétrogradé en Angular 19 + PrimeNG 19, iso-fonctionnel à la v21, qui s'installe et build sur le PC d'entreprise verrouillé sur Node v20.14.0 / npm 10.7.0.

**Architecture:** Copie propre de l'arbre `main` (Angular 21) dans un répertoire frère, nouveau dépôt git, puis rétrogradation par re-pinning du `package.json` (Angular 19, TS 5.6, zone.js 0.15, PrimeNG 19, eslint 9), correction itérative des deltas d'API au build, et préservation des tests vitest via le plugin AnalogJS (le builder `@angular/build:unit-test` n'existe pas en Angular 19).

**Tech Stack:** Angular 19.2, PrimeNG 19.1, `@primeuix/themes` 1.x, TypeScript 5.6, vitest 3 + `@analogjs/vite-plugin-angular`, jsdom, angular-eslint 19, eslint 9.

**Spec source:** `docs/superpowers/specs/2026-06-15-node20-compat-fork-design.md`

**Contexte machine de dev:** Node v22.12.0 / npm 11.14.1 (Angular 19 accepte `>=22`, donc build + tests valident ici ; le smoke sur 20.14.0 exact appartient à l'utilisateur sur son PC pro — les champs `engines` d'Angular 19 listent `^20.11.1` et garantissent l'acceptation de 20.14.0).

---

## File Structure

Le travail se fait dans un **répertoire frère neuf** : `C:\Users\Renaud\WebstormProjects\FoxRunner_frontend_node20`. Tous les chemins ci-dessous sont relatifs à ce répertoire, **sauf** le plan/spec qui restent dans le repo source.

Fichiers créés/modifiés dans le fork :
- `package.json` — re-pinning complet des versions (cœur du travail).
- `vite.config.ts` — **créé** : config vitest + plugin AnalogJS Angular.
- `src/test-setup.ts` — **créé** : init du `TestBed` (auparavant implicite via le builder Angular 20+).
- `tsconfig.spec.json` — `types` ajusté pour le setup vitest.
- `angular.json` — suppression du target `test` (builder absent en v19).
- `eslint.config.js` — réécrit au format angular-eslint v19 (`tseslint.config(...)`, spreads).
- `.github/workflows/ci.yml` — Node 20.14, `ng test` → `vitest run`.
- `Dockerfile` — build stage `node:20-alpine`.
- `CLAUDE.md` — note « fork compat Node 20 / Angular 19 », deltas de versions, setup tests AnalogJS.

---

## Task 1: Échafauder le dépôt frère

**Files:**
- Create: répertoire `C:\Users\Renaud\WebstormProjects\FoxRunner_frontend_node20` (export de `main`)

- [ ] **Step 1: Créer le répertoire et exporter l'arbre `main` (tracked files only, sans `.git`/`node_modules`)**

Run (PowerShell, depuis n'importe où) :
```powershell
$src = "C:\Users\Renaud\WebstormProjects\FoxRunner_frontend"
$dst = "C:\Users\Renaud\WebstormProjects\FoxRunner_frontend_node20"
New-Item -ItemType Directory -Force $dst | Out-Null
git -C $src archive --format=tar main | tar -x -C $dst
```
`git archive main` ne contient que les fichiers suivis de la branche `main` (pas `.git`, pas `node_modules`, pas la branche `feat/step-form-nested`).

- [ ] **Step 2: Vérifier l'export**

Run:
```powershell
Test-Path "$dst\package.json"; (Get-ChildItem $dst -Force -Directory).Name -contains 'node_modules'
```
Expected: `True` puis `False` (package.json présent, pas de node_modules).

- [ ] **Step 3: Initialiser le dépôt et commit snapshot**

Run:
```powershell
cd $dst
git init -b main
git add -A
git commit -m "chore: snapshot FoxRunner_frontend at Angular 21 (fork base)"
```
Expected: un commit créé listant l'ensemble des fichiers de `main`.

---

## Task 2: Re-pinner `package.json` vers Angular 19

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remplacer `package.json` par la version Node-20**

Remplacer intégralement le contenu par :
```json
{
  "name": "fox-runner",
  "version": "0.0.0",
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "vitest run",
    "test:watch": "vitest",
    "gen:api": "openapi-typescript http://127.0.0.1:8000/api/v1/openapi.json -o src/app/core/api/schema.ts",
    "gen:api:file": "openapi-typescript ./openapi.local.json -o src/app/core/api/schema.ts",
    "format": "prettier --write \"src/**/*.{ts,html,scss}\"",
    "format:check": "prettier --check \"src/**/*.{ts,html,scss}\"",
    "lint": "ng lint",
    "e2e": "playwright test",
    "e2e:install": "playwright install --with-deps chromium"
  },
  "private": true,
  "packageManager": "npm@10.7.0",
  "dependencies": {
    "@angular/animations": "^19.2.0",
    "@angular/common": "^19.2.0",
    "@angular/compiler": "^19.2.0",
    "@angular/core": "^19.2.0",
    "@angular/forms": "^19.2.0",
    "@angular/localize": "^19.2.0",
    "@angular/platform-browser": "^19.2.0",
    "@angular/platform-browser-dynamic": "^19.2.0",
    "@angular/router": "^19.2.0",
    "@primeuix/themes": "^1.0.0",
    "monaco-editor": "^0.55.1",
    "primeflex": "^4.0.0",
    "primeicons": "^7.0.0",
    "primeng": "^19.1.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "uuid": "^11.1.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@analogjs/vite-plugin-angular": "^1.10.0",
    "@analogjs/vitest-angular": "^1.10.0",
    "@angular/build": "^19.2.0",
    "@angular/cli": "^19.2.0",
    "@angular/compiler-cli": "^19.2.0",
    "@eslint/js": "^9.17.0",
    "@playwright/test": "^1.59.1",
    "@types/node": "^20.17.0",
    "angular-eslint": "^19.4.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^10.1.8",
    "jsdom": "^25.0.0",
    "openapi-typescript": "^7.13.0",
    "prettier": "^3.8.1",
    "typescript": "~5.6.3",
    "typescript-eslint": "^8.18.0",
    "vitest": "^3.0.0"
  }
}
```

Changements clés vs v21 :
- Tous les `@angular/*` → `^19.2.0` ; ajout de `@angular/platform-browser-dynamic` (requis pour l'init `TestBed` vitest).
- `ngx-monaco-editor-v2` **retiré** (inutilisé dans `src/` ; `monaco-editor` conservé car copié en asset par `angular.json`).
- `uuid` `^14` → `^11.1.0` (supprime tout risque `engines` > Node 20.14 ; `v4` inchangé). `@types/uuid` retiré (uuid 11 fournit ses types).
- `typescript` `~5.9` → `~5.6.3` ; `zone.js` `0.16` → `~0.15.0`.
- `eslint`/`@eslint/js` `10` → `^9.17.0` ; `angular-eslint` `21` → `^19.4.0` ; `typescript-eslint` → `^8.18.0`.
- Tests : `@angular/build:unit-test` remplacé par `vitest` + `@analogjs/*` ; script `test` = `vitest run`.
- `packageManager` → `npm@10.7.0`.

- [ ] **Step 2: Commit**

Run:
```powershell
git add package.json
git commit -m "chore(deps): pin toolchain to Angular 19 / Node 20 compatible versions"
```

---

## Task 3: Installer et résoudre les peer-deps

**Files:** aucun (génère `package-lock.json`)

- [ ] **Step 1: Installation propre**

Run:
```powershell
cd $dst
npm install
```
Expected: `package-lock.json` généré, `node_modules/` peuplé. Avertissements npm tolérés.

- [ ] **Step 2: En cas d'échec de peer-deps AnalogJS/vitest**

Si `npm install` échoue sur un conflit `@analogjs/*` ↔ `vitest`/`@angular/*`, inspecter les peers exigés :
```powershell
npm view @analogjs/vite-plugin-angular peerDependencies
npm view @analogjs/vitest-angular peerDependencies
```
Aligner `vitest` (et `jsdom` si besoin) sur la fourchette retournée, puis `npm install` à nouveau. Ne PAS utiliser `--force` (masque les vrais conflits).

- [ ] **Step 3: Vérifier la version Angular installée**

Run:
```powershell
npx ng version
```
Expected: Angular CLI **19.x**, Angular **19.x**. Pas d'avertissement de version Node bloquant sur Node 22.

- [ ] **Step 4: Commit du lockfile**

Run:
```powershell
git add package-lock.json
git commit -m "chore(deps): add resolved package-lock for Angular 19 toolchain"
```

---

## Task 4: Retirer le target `test` obsolète d'`angular.json`

**Files:**
- Modify: `angular.json` (bloc `architect.test`)

- [ ] **Step 1: Supprimer le target `test`**

Le builder `@angular/build:unit-test` n'existe pas en v19 ; vitest tourne hors `ng`. Supprimer ces lignes du bloc `architect` :
```json
        "test": {
          "builder": "@angular/build:unit-test"
        },
```
Le bloc `lint` (`@angular-eslint/builder:lint`) et les blocs `build`/`serve` (`@angular/build:application` / `@angular/build:dev-server`, présents en v19) restent inchangés.

- [ ] **Step 2: Vérifier que le JSON reste valide**

Run:
```powershell
node -e "JSON.parse(require('fs').readFileSync('angular.json','utf8')); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 3: Commit**

Run:
```powershell
git add angular.json
git commit -m "chore(build): drop Angular-20-only unit-test target"
```

---

## Task 5: Câbler vitest via AnalogJS

**Files:**
- Create: `vite.config.ts`
- Create: `src/test-setup.ts`
- Modify: `tsconfig.spec.json`

- [ ] **Step 1: Créer `vite.config.ts`**

```ts
/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
  define: {
    'import.meta.vitest': mode !== 'production',
  },
}));
```

- [ ] **Step 2: Créer `src/test-setup.ts`**

Initialise l'environnement `TestBed` que le builder Angular 20+ fournissait implicitement :
```ts
import '@analogjs/vitest-angular/setup-zone';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);
```

- [ ] **Step 3: Ajuster `tsconfig.spec.json`**

Le runner ne passe plus par le builder Angular ; inclure le setup et garder les types vitest :
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": [
      "vitest/globals",
      "node"
    ]
  },
  "include": [
    "src/**/*.d.ts",
    "src/**/*.spec.ts",
    "src/test-setup.ts"
  ]
}
```

- [ ] **Step 4: Commit (config seule, exécution validée en Task 7)**

Run:
```powershell
git add vite.config.ts src/test-setup.ts tsconfig.spec.json
git commit -m "test: wire vitest via AnalogJS plugin (replaces Angular unit-test builder)"
```

---

## Task 6: Boucle de correction au build (deltas d'API v19↔v21)

**Files:** `src/**` selon les erreurs (à déterminer au build)

> Inconnue principale du projet, mais bornée. On compile, on lit les erreurs, on corrige, on recompile. Le build esbuild d'Angular liste précisément les fichiers/lignes fautifs.

- [ ] **Step 1: Premier build**

Run:
```powershell
cd $dst
npm run build
```
Expected (premier passage) : soit succès direct, soit erreurs de compilation TS/template à corriger.

- [ ] **Step 2: Corriger les deltas, par catégorie**

Pour chaque erreur, identifier la catégorie et corriger :
- **Props/API de composants PrimeNG** renommées ou retirées entre 19 et 21 (ex. attributs de `p-table`, `p-tabs`, `p-calendar`). Consulter la doc PrimeNG 19 pour l'API correcte et adapter le template/TS.
- **Tokens de thème `@primeuix/themes`** : l'API `definePreset`/`Aura` est stable entre 1.x et 2.x ; si un token de design a été renommé, ajuster dans la config de thème (`src/app/app.config.ts` ou équivalent).
- **API Angular** retirée en v19 (rare ici : signals, control flow, `provideHttpClient` existent déjà en v19). Si une signature `inject`/`resource`/`httpResource` v21 est utilisée, la remplacer par l'équivalent v19.
- **zone.js** : aucune action attendue (polyfill inchangé), sauf erreur explicite.

Corriger fichier par fichier ; relancer `npm run build` après chaque lot de corrections.

- [ ] **Step 3: Build prod vert**

Run:
```powershell
npm run build
```
Expected: build terminé, sortie dans `dist/fox-runner/browser`. L'avertissement de budget initial (~1.1 MB < 2 MB error) est attendu et toléré.

- [ ] **Step 4: Commit**

Run:
```powershell
git add -A
git commit -m "fix: adapt component/theme APIs to PrimeNG 19 / Angular 19"
```
(Si Step 1 a réussi sans correction, noter « aucun delta d'API » et passer à la Task 7 sans commit.)

---

## Task 7: Faire passer les tests vitest

**Files:** `src/**/*.spec.ts` si un test nécessite un ajustement d'import

- [ ] **Step 1: Lancer la suite**

Run:
```powershell
cd $dst
npm test
```
Expected: vitest démarre via `vite.config.ts`, environnement jsdom, **9 fichiers de spec / 26 tests** verts.

Fichiers attendus :
`src/app/app.spec.ts`, `src/app/core/api/{jobs,scenarios,slots}.service.spec.ts`,
`src/app/core/auth/auth.service.spec.ts`, `src/app/core/http/{auth.interceptor,network-health.service}.spec.ts`,
`src/app/core/utils/idempotency.spec.ts`, `src/app/shared/pipes/api-date.pipe.spec.ts`.

- [ ] **Step 2: Corriger les échecs éventuels**

- Si « TestBed not initialized » : vérifier que `src/test-setup.ts` est bien référencé dans `vite.config.ts > test.setupFiles` et que `@angular/platform-browser-dynamic` est installé.
- Si un test échoue sur un import PrimeNG renommé : aligner l'import sur l'API v19.
- Les tests utilisent les globals (`describe`/`it`/`expect`) sans import — garantis par `test.globals: true` + `types: ["vitest/globals"]`.

Relancer `npm test` jusqu'au vert.

- [ ] **Step 3: Commit**

Run:
```powershell
git add -A
git commit -m "test: green vitest suite on Angular 19 (26 tests, jsdom)"
```

---

## Task 8: Aligner lint + format sur v19

**Files:**
- Modify: `eslint.config.js`

- [ ] **Step 1: Réécrire `eslint.config.js` au format angular-eslint v19**

En v19, `tseslint.configs.*` et `angular.configs.*` sont des tableaux à étaler ; on utilise le helper `tseslint.config()` :
```js
// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: [
      'dist/**',
      '.angular/**',
      'coverage/**',
      'e2e/**',
      'playwright-report/**',
      'test-results/**',
      'src/app/core/api/schema.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      prettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
```

- [ ] **Step 2: Lint vert**

Run:
```powershell
npm run lint
```
Expected: `All files pass linting.` (ou équivalent sans erreur). Corriger les éventuelles erreurs de règles introduites par la v19.

- [ ] **Step 3: Format check**

Run:
```powershell
npm run format:check
```
Expected: aucun fichier signalé. Si nécessaire, `npm run format` puis re-check.

- [ ] **Step 4: Commit**

Run:
```powershell
git add -A
git commit -m "chore(lint): align eslint flat config with angular-eslint 19"
```

---

## Task 9: Mettre à jour CI, Dockerfile et CLAUDE.md

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `Dockerfile`
- Modify: `CLAUDE.md`

- [ ] **Step 1: CI — Node 20.14 + `vitest run`**

Dans `.github/workflows/ci.yml`, remplacer le bloc setup-node et l'étape tests :
```yaml
      - name: Setup Node.js 20.14
        uses: actions/setup-node@v4
        with:
          node-version: '20.14.0'
          cache: 'npm'
```
et :
```yaml
      - name: Unit tests
        run: npm test
```
(le nom d'étape `Setup Node.js 22` et la commande `npx ng test --watch=false` disparaissent). Garder le reste (`npm ci`, lint, build, artifact, docker).

- [ ] **Step 2: Dockerfile — build stage Node 20**

Modifier l'en-tête et le stage build :
```dockerfile
# Multi-stage build: Angular 19 + PrimeNG 19 (Node 20 compat fork) → static files served by nginx.

FROM node:20-alpine AS build
```
Le reste (`npm ci`, `npm run build`, stage nginx, `dist/fox-runner/browser`) reste valide.

- [ ] **Step 3: CLAUDE.md — note de fork**

Sous le titre `## What this is`, ajouter un encart :
```markdown
> **Fork de compatibilité Node 20.** Ce dépôt est le fork `FoxRunner_frontend_node20`
> rétrogradé en **Angular 19 + PrimeNG 19** pour tourner sur Node v20.14.0 / npm 10.7.0
> (PC d'entreprise verrouillé par l'IT). Iso-fonctionnel au repo amont `FoxRunner_frontend`
> (Angular 21). Différences à connaître :
> - Tests unitaires : vitest via `@analogjs/vite-plugin-angular` (le builder
>   `@angular/build:unit-test` n'existe pas en Angular 19). Lancer avec `npm test`,
>   PAS `ng test`. Setup `TestBed` dans `src/test-setup.ts`, config dans `vite.config.ts`.
> - `ngx-monaco-editor-v2` retiré (inutilisé) ; `uuid` épinglé en `^11`.
> - Divergence assumée vs amont : pas de synchro automatique.
```
Remplacer aussi la mention « Angular 21 + PrimeNG 21 » de la première phrase par « Angular 19 + PrimeNG 19 (fork compat Node 20) ».

- [ ] **Step 4: Commit**

Run:
```powershell
git add .github/workflows/ci.yml Dockerfile CLAUDE.md
git commit -m "ci,docs: target Node 20.14 and document the compat fork"
```

---

## Task 10: Validation finale locale

**Files:** aucun

- [ ] **Step 1: Suite complète enchaînée**

Run:
```powershell
cd $dst
npm ci
npm run lint
npm test
npm run build
```
Expected: chaque commande termine sans erreur (avertissement budget build toléré).

- [ ] **Step 2: (Optionnel) smoke sur Node 20.14.0**

Si un Node 20.14.0 portable / nvm-windows est disponible sur la machine de dev, refaire `npm ci && npm run build` sous cette version pour confirmer l'absence de dépendance transitive exigeant > 20.14. Sinon, validation sur Node 22 ici + champs `engines` ; smoke final sur le PC d'entreprise.

- [ ] **Step 3: Vérifier l'état git**

Run:
```powershell
git log --oneline
git status
```
Expected: historique de commits cohérent (snapshot → toolchain → fixes → tests → lint → ci/docs), arbre propre.

---

## Task 11: Publier le dépôt GitHub (GATE — confirmation utilisateur requise)

**Files:** aucun

> Action externe. **Ne PAS exécuter sans feu vert explicite** de l'utilisateur (nom de repo, visibilité privé/public).

- [ ] **Step 1: Confirmer nom + visibilité**

Par défaut : `Foxugly/FoxRunner_frontend_node20`, **privé**. Demander confirmation/ajustement.

- [ ] **Step 2: Créer le repo et pousser**

Run (après confirmation) :
```powershell
cd $dst
gh repo create Foxugly/FoxRunner_frontend_node20 --private --source=. --remote=origin --push
```
Expected: repo créé, `main` poussé.

- [ ] **Step 3: Vérifier le run CI distant**

Run:
```powershell
gh run list --limit 1
```
Expected: le workflow CI démarre sur Node 20.14 et passe (lint + tests + build).

---

## Self-Review (effectuée à l'écriture)

- **Couverture spec :** repo séparé (T1, T11), matrice de versions (T2), setup vitest AnalogJS (T5,T7), boucle de build (T6), lint v19 (T8), CI Node 20.14 + Dockerfile + CLAUDE.md (T9), validation + note Node 20.14 exact (T10). `uuid` traité (T2, pin `^11`). Monaco résolu (retrait de `ngx-monaco-editor-v2`, T2). ✓
- **Placeholders :** aucun TODO/TBD ; tout le code de config est fourni intégral. La Task 6 est intrinsèquement itérative mais bornée par des commandes et un critère de sortie concret (build vert). ✓
- **Cohérence des types/noms :** `src/test-setup.ts` référencé identiquement dans `vite.config.ts` et `tsconfig.spec.json` ; script `test` = `vitest run` cohérent en CI (`npm test`). ✓
