# FoxRunner frontend — fork compatible Node 20.14.0 / npm 10.7.0

**Date:** 2026-06-15
**Statut:** design approuvé, prêt pour le plan d'implémentation
**Approche retenue:** rétrogradation Angular 19 + PrimeNG 19, tests vitest préservés via AnalogJS

## Problème

Le PC d'entreprise est verrouillé (politique IT) sur **Node v20.14.0** et **npm 10.7.0**,
impossible à contourner. Le projet `FoxRunner_frontend` est sur **Angular 21.2 + PrimeNG 21.1**,
dont le moteur exige Node `^20.19.0 || ^22.12.0 || ^24.0.0`. Node 20.14.0 est juste sous le
seuil 20.19.0 — l'install et le build échouent (ou refusent) sur le PC d'entreprise.

But : produire un **fork séparé** utilisable sur Node 20.14.0 / npm 10.7.0, avec **parité
fonctionnelle complète** : `npm start`, `npm run build`, tests unitaires vitest, lint+format,
et e2e Playwright doivent tous fonctionner.

## Palier cible imposé : Angular 19 + PrimeNG 19

C'est le seul palier dont le moteur accepte Node 20.14.0 :

| Framework | Node requis | 20.14.0 ? |
|---|---|---|
| Angular 21 | `^20.19 \|\| ^22.12 \|\| ^24` | ❌ |
| Angular 20 | `^20.19 \|\| ^22.12 \|\| >=24` | ❌ |
| **Angular 19** | `^18.19.1 \|\| ^20.11.1 \|\| >=22` | ✅ (20.14.0 satisfait `^20.11.1`) |

Pas de réécriture d'architecture : `p-tabs`, les signals, `@if/@for`,
`provideHttpClient(withInterceptors)` et le thème `@primeuix/themes` existent déjà en v19.
Le travail est essentiellement du **re-pinning de versions** + quelques **deltas d'API** à
corriger au build, + le **câblage des tests** (seul vrai point dur).

## 1. Stratégie de dépôt

- Nouveau repo GitHub **`Foxugly/FoxRunner_frontend_node20`** (nom ajustable avant création).
- Arbre copié dans un répertoire frère :
  `C:\Users\Renaud\WebstormProjects\FoxRunner_frontend_node20`, **sans** `.git` ni
  `node_modules`. Puis `git init`, commit de base « snapshot Angular 21 » (état identique au
  fork de départ pour garder un diff lisible), puis le(s) commit(s) de rétrogradation par-dessus.
- Création du repo GitHub via `gh` **uniquement après feu vert explicite** (action externe).
- Le fork **diverge** de `main` : pas de synchronisation automatique, divergence assumée.

## 2. Matrice de versions (`package.json`)

Fourchettes cibles ; le patch exact est figé à l'implémentation en fonction de ce que résout npm.

| Paquet | Actuel | Cible Node-20 |
|---|---|---|
| `@angular/*`, `@angular/cli`, `@angular/build`, `@angular/compiler-cli` | 21.2 | **~19.2** |
| `typescript` | 5.9 | **~5.6** (Angular 19 supporte 5.5–5.6) |
| `zone.js` | 0.16 | **~0.15** |
| `primeng` | 21.1 | **~19.1** |
| `@primeuix/themes` | 2.0 | **~1.x** (apparié à primeng 19) |
| `ngx-monaco-editor-v2` | 21.1 | **~19.x** |
| `monaco-editor` | 0.55 | version appariée à ngx-monaco-editor-v2 v19 |
| `angular-eslint` | 21.3 | **~19.x** |
| `eslint` + `@eslint/js` | 10 | **~9.x** (apparié angular-eslint 19) |
| `typescript-eslint` | 8.56 | ~8.x (compatible, ajusté si besoin) |
| `@types/node` | 25 | **~20.x** (reflète le runtime) |
| `uuid` | 14 | vérifier `engines`; repli **`^11`** si 14 exige Node > 20.14 |
| `vitest` | 4.0 | version supportée par le plugin AnalogJS v19 (probablement ~2.x/3.x) |
| `jsdom` | 28 | version appariée à la vitest retenue |
| `packageManager` | `npm@10.9.0` | **`npm@10.7.0`** (ou champ retiré) |

Inchangés (compatibles Node 20 et indépendants du palier Angular) : `rxjs ~7.8`,
`primeicons ^7`, `primeflex ^4`, `prettier ^3`, `@playwright/test ^1.59`,
`eslint-config-prettier`, `openapi-typescript ^7`, `@types/uuid`, `tslib`.

## 3. Setup de tests (point dur)

Le builder `@angular/build:unit-test` (vitest) est arrivé en Angular **20** : il **n'existe pas**
en v19. On préserve donc vitest + jsdom via AnalogJS :

- Ajout de **`@analogjs/vite-plugin-angular`** (v1.x, apparié Angular 19).
- `vite.config.ts` : plugin `angular()`, `test.environment: 'jsdom'`, `test.globals: true`,
  `test.setupFiles` pointant un fichier qui initialise le `TestBed`
  (`getTestBed().initTestEnvironment(BrowserDynamicTestingModule, …)`) et la zone de test.
- Script `package.json` : `"test": "vitest run"` (au lieu de `ng test`).
- Les 26 tests existants conservent `vitest/globals` (`describe`/`it`/`expect`) — port minimal,
  concentré dans le fichier de setup (bootstrap TestBed que le builder Angular 20 fournissait
  implicitement).

Cible : les **26 tests** passent en jsdom headless, sans navigateur.

## 4. Phases d'implémentation

1. **Échafaudage** : créer le répertoire frère, copier l'arbre (hors `.git`/`node_modules`),
   `git init`, commit snapshot « Angular 21 baseline ».
2. **Re-pinning** : réécrire `package.json` selon la matrice §2 → `npm install` propre sur
   npm 10.7.0.
3. **Boucle de correction au build** : `npm run build`, corriger itérativement les deltas
   d'API qui sortent — props de composants PrimeNG 19↔21, tokens de thème `@primeuix/themes`
   1.x↔2.x, changements Angular 19↔21, zone.js. **Inconnue principale** : bornée mais itérative.
4. **Tests** : câbler vitest/AnalogJS (§3) → les 26 tests passent.
5. **Lint + format** : aligner `angular-eslint`/`eslint` v19, `eslint.config.*`, vérifier
   `ng lint` et `prettier --check`.
6. **CI & docs** : `.github/workflows/ci.yml` → Node **20.14.x** ; `Dockerfile` build stage →
   `node:20-alpine` ; `CLAUDE.md` du fork mis à jour (« fork compat Node 20 / Angular 19 »,
   différences de versions, setup de tests AnalogJS).

## 5. Validation

Critères de succès dans le fork :

- `npm install` réussit sur npm 10.7.0.
- `npm run build` (prod) réussit.
- `vitest run` : 26 tests verts en jsdom.
- `ng lint` et `prettier --check` passent.
- e2e Playwright inchangé (indépendant d'Angular) — exécuté si backend + dev server joignables.

⚠️ **Validation sur Node 20.14.0 exact** : elle se fait sur le PC d'entreprise. La machine de
dev a probablement un Node plus récent. Les champs `engines` (Angular 19) **garantissent**
l'acceptation de 20.14.0 ; le smoke final appartient à l'utilisateur. Si `nvm-windows` est
disponible sur la machine de dev, on teste directement sur 20.14.0 pour réduire le risque.

## Risques et points de vigilance

- **Deltas d'API PrimeNG 19↔21** : ampleur inconnue jusqu'au build. Probablement quelques
  props/tokens. Mitigé par la boucle de correction (phase 3).
- **`uuid` 14** : si son champ `engines` exige Node > 20.14, repli sur `^11` (API compatible
  pour `v4`).
- **Monaco / ngx-monaco-editor-v2** : l'appariement de versions v19 doit être vérifié ; le
  `JsonEditor` actuel est basé textarea, donc l'impact réel est limité.
- **Validation runtime** : impossible de garantir à 100 % sans exécuter sur 20.14.0 ; les
  `engines` + un smoke utilisateur couvrent ce trou.

## Hors périmètre

- Maintien d'une synchronisation automatique fork ↔ `main` (divergence assumée).
- Toute modification fonctionnelle de l'app (le fork doit être iso-fonctionnel à la v21).
