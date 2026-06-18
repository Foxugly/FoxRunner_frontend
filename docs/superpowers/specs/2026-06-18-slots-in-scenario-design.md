# Design — Slots gérés dans le scénario (UX refactor zone 2)

> Zone 2 du refactoring UX FoxRunner. Frontend-only : le backend a déjà le
> CRUD slots + le filtre `GET /slots?scenario_id=…`. Repos : `FoxRunner_frontend`
> (Angular 21), `FoxRunner_frontend_node20` (Angular 19).

## Problème
Les slots sont aujourd'hui sur une page `/slots` à plat (table slot_id /
scénario / jours / horaire / actif), alors qu'un slot appartient toujours à un
scénario. Renaud : « avoir une liste de slots est inutile ». Le détail du
scénario n'affiche aucun slot.

## Objectif
Gérer les créneaux **depuis la page du scénario** (section « Planification »
avec liste + ajout/édition/suppression, scénario pré-rempli et verrouillé), et
**retirer la page « Slots » à plat** du menu.

## Décisions (validées)
- La page `/slots` à plat est **supprimée** (entrée de menu + route +
  composant `slots-list`). Les slots ne se gèrent plus que par scénario.
- Un petit **badge « N créneaux »** est ajouté sur la liste des scénarios pour
  compenser la perte de vue globale.

## Composants

### `ScenarioSlotsComponent` (nouveau) — `features/scenarios/detail/scenario-slots.component.ts`
- Inputs : `scenarioId: string`, `canEdit: boolean`.
- Charge les slots du scénario via `SlotsService.list({ scenario_id })`.
- Affiche une liste compacte par créneau : tags jours (Lu..Di), `start → end`,
  toggle actif (optimiste, revert sur erreur), boutons éditer/supprimer (si
  `canEdit`). État vide : « Ce scénario n'a pas encore de créneau planifié. »
- Bouton « + Créneau » (si `canEdit`) → dialog avec le formulaire slot
  (slot_id éditable en création, jours multi-select, début/fin masqués HH:MM,
  actif). **Pas de sélecteur de scénario** : `scenario_id` est fixé à l'input.
- Réutilise `SlotsService` (create/patch/remove/get), `newIdempotencyKey()`,
  `ConfirmationService` (suppression), `MessageService`. Émet `(changed)` pour
  que le parent rafraîchisse le compteur si besoin.

Le formulaire et les constantes `DAYS` sont repris du `slots-list` existant
(dont la logique CRUD est la référence), allégés du picker scénario.

### `ScenarioDetailComponent` (modifié)
- Ajoute une carte « Planification » après « Step collections », contenant
  `<app-scenario-slots [scenarioId]="s.scenario_id" [canEdit]="isWritable()" />`.

### `SlotsService` (modifié)
- Ajoute `listForScenario(scenarioId): Promise<SlotSummary[]>` = `list({
  scenario_id, limit: 500 }).items` (le param `scenario_id` est déjà supporté).

### Liste des scénarios (modifié) — badge
- Pour chaque scénario, afficher « N créneaux » (compte via
  `listForScenario`). Pour éviter N+1 requêtes : un seul appel
  `SlotsService.list({ limit: 500 })` puis regroupement par `scenario_id` côté
  client (la liste des scénarios est bornée). Badge discret (p-tag secondary).

### Suppressions
- `app.routes.ts` : retirer la route `/slots` (lazy import de `slots-list`).
- `core/layout/topmenu` : retirer l'entrée de menu « Slots ».
- Supprimer le fichier `features/slots/list/slots-list.component.ts` (et son
  `.spec` s'il existe). Conserver `SlotsService`. Vérifier qu'aucun autre lien
  ne pointe vers `/slots`.

## Tests
- `SlotsService.listForScenario` (vitest) : appelle `/slots` avec
  `scenario_id` et renvoie `items`.
- Mettre à jour / retirer les specs qui visaient `slots-list` ou la route
  `/slots`.
- Lint + build + vitest verts sur les deux repos.

## Hors périmètre
- Pas de changement backend. Pas de vue « next run » calculée ici (le plan
  reste sur la page Plan). Pas de drag-and-drop de planning.
