# FoxRunner frontend — composant de table triable/filtrable `<app-data-table>`

**Date:** 2026-06-15
**Statut:** design approuvé, prêt pour le plan d'implémentation
**Scope:** FoxRunner_frontend uniquement (réplication éventuelle sur le fork node20 à part, après accord)

## Problème

L'utilisateur veut « pour toutes les tables, un composant pour trier et filtrer ». État réel : les
listes sont des `p-table` **paginées-serveur** (`[lazy]="true"`, `(onLazyLoad)`, enveloppe
`{items,total,limit,offset}`), et **aucun endpoint n'expose de paramètre `search`/`sort`**
(les `list()` ne prennent que `limit`/`offset` + filtres spécifiques). Un filtre/tri client sur une
table lazy ne porterait que sur la page visible (~20 lignes) — trompeur.

**Stratégie retenue (hybride, frontend-only) :** sur les tables **bornées par design**, charger
toutes les lignes en un appel et faire un vrai filtre + tri **client-side** via un composant
réutilisable `<app-data-table>`. Les **journaux** volumineux restent paginés-serveur.

- **Tables converties (client, bornées) :** `scenarios-list`, `slots-list`, `admin-users`,
  `admin-settings`, `shares-dialog` (cette dernière est déjà client-side).
- **Tables inchangées (serveur, journaux) :** `jobs-list`, `history`, `admin-audit`,
  `admin-artifacts`, `admin-graph` (subs + notifs). Leurs filtres existants restent.

## 1. Architecture — `src/app/shared/components/data-table/`

### `data-table.component.ts` — `app-data-table`
Composant standalone générique. Possède la coquille de table :
- une **barre de recherche** (input avec icône `pi-search`, clearable) liée au filtre global ;
- un **`p-table` non-lazy** avec paginator client (`[rows]`, `[rowsPerPageOptions]`) ;
- des **en-têtes triables** générés depuis la config de colonnes (`pSortableColumn` + `p-sortIcon`
  sur les colonnes `sortable`) ;
- l'**empty-state** intégré (réutilise `EmptyStateComponent`) avec projection d'actions.

Le rendu des cellules : pour chaque colonne, si un template `appCell` du même `field` est fourni,
il est projeté (contexte `$implicit = row`) ; sinon `{{ row[field] }}` (texte brut).

### `cell-template.directive.ts` — `[appCell]`
Directive structurelle légère qui capture le `field` (`@Input('appCell')`) et son `TemplateRef`.
`app-data-table` les collecte via `@ContentChildren(CellTemplateDirective)` et construit une map
`field → TemplateRef`. Mirroir du pattern `pTemplate` de PrimeNG.

### `data-table.types.ts` — `DataTableColumn`
```ts
export interface DataTableColumn {
  field: string;        // clé de la ligne + identifiant du template appCell
  header: string;       // libellé d'en-tête
  sortable?: boolean;   // défaut false ; ajoute pSortableColumn + p-sortIcon
  width?: string;       // ex. '8rem' ; applique style.width sur le <th>
  searchable?: boolean; // défaut true ; participe à globalFilterFields
}
```

## 2. API publique de `<app-data-table>`

Inputs :
- `value: T[]` (requis) — toutes les lignes chargées (client-side).
- `columns: DataTableColumn[]` (requis).
- `dataKey?: string` — clé unique de ligne (perf + sélection PrimeNG).
- `loading?: boolean` — défaut `false` ; passe `[loading]` au `p-table`.
- `pageSize?: number` — défaut `25`.
- `rowsPerPageOptions?: number[]` — défaut `[10, 25, 50]`.
- `searchPlaceholder?: string` — défaut `'Rechercher…'`.
- `emptyIcon?: string` / `emptyTitle: string` / `emptyMessage?: string` — passés à `EmptyStateComponent`.

Projection :
- `<ng-template appCell="<field>" let-row>…</ng-template>` — une par colonne riche.
- `[emptyActions]` — contenu projeté dans l'empty-state (ex. le bouton « Créer »).

Dérivé :
- `globalFilterFields` = `columns.filter(c => c.searchable !== false).map(c => c.field)`.

Usage de référence (scenarios) :
```html
<app-data-table
  [value]="scenarios()"
  [columns]="columns"
  [loading]="loading()"
  dataKey="scenario_id"
  emptyIcon="pi-sitemap"
  emptyTitle="Aucun scénario"
  emptyMessage="Crée un premier scénario pour démarrer."
>
  <ng-template appCell="role" let-s>
    @if (s.role === 'owner') { <p-tag severity="success" value="Propriétaire" /> }
    @else { <p-tag severity="info" value="Partagé" /> }
  </ng-template>
  <ng-template appCell="actions" let-s>
    <!-- boutons détail / dupliquer / supprimer (markup repris tel quel) -->
  </ng-template>
  <p-button emptyActions label="Créer un scénario" icon="pi pi-plus" routerLink="/scenarios/new" />
</app-data-table>
```

## 3. Migration des 5 tables bornées

Pour chaque table convertie :
1. **Chargement full** : remplacer le chargement lazy par un seul appel `list(...)` avec un cap
   large (`PAGE_CAP = 500`, offset 0). Stocker `page.items` dans un signal `rows`. Si
   `page.total > PAGE_CAP`, `console.warn` (ces tables sont bornées par design ; le cap est un
   garde-fou, pas une pagination — documenté dans le code).
2. **Template** : remplacer le bloc `<p-table … [lazy] (onLazyLoad)>` par `<app-data-table>` +
   les `appCell` requis. Reprendre **tel quel** le markup des cellules riches (tags, toggles
   `ngModel`, boutons, liens, tooltips).
3. **Nettoyage** : retirer `first`/`total`/`onLazyLoad`/`TableLazyLoadEvent` et les imports
   `TableModule` devenus inutiles dans le composant (le wrapper les encapsule). Garder les
   dialogs/confirmations et la logique métier (duplicate/delete/toggle) inchangés.
4. **Colonnes** : déclarer le `columns: DataTableColumn[]` dans la classe, avec `sortable: true`
   sur les colonnes textuelles pertinentes (ex. scenario_id, description, email, clé, slot,
   horaire) et `searchable: false` + pas de `sortable` sur les colonnes d'actions/toggles.

Détails par table :
- **scenarios-list** : colonnes scenario_id (sortable), description (sortable), role, network,
  actions. Recherche sur scenario_id + description.
- **slots-list** : slot, scénario, jours, horaire (sortable), actif (toggle), actions. Le toggle
  `ngModel` d'activation reste dans un `appCell`.
- **admin-users** : email (sortable), uuid, fuseau (sortable), actif/superuser/vérifié (3 toggles
  en `appCell`). Recherche sur email + fuseau.
- **admin-settings** : clé (sortable), description (sortable), modifié le (sortable, date),
  actions. La date passe par `| apiDate` dans son `appCell`.
- **shares-dialog** : utilisateur, action retirer. Déjà client-side ; passe au wrapper pour la
  cohérence (recherche utile si beaucoup de partages).

## 4. Tests (vitest via `@angular/build:unit-test`, lancer avec `ng test --watch=false`)

`data-table.component.spec.ts` — composant de test hôte minimal déclarant des `columns` + un
`appCell` custom :
- monte et rend une ligne par élément de `value` ;
- rend le template `appCell` projeté (ex. un `<span class="custom">`) au lieu du texte brut ;
- rend `{{ row[field] }}` pour une colonne sans `appCell` ;
- `globalFilterFields` exclut les colonnes `searchable: false`.

Les 5 composants migrés n'ont **pas** de spec unitaire existant (seuls les *services* sont testés)
→ pas de spec à réécrire. `npm run build`, `ng lint`, `ng test --watch=false` doivent rester verts.

## 5. Documentation

`docs/design/2026-06-15-sortable-table.md` : API du wrapper, liste des tables converties vs
laissées en serveur, le cap de 500, et la procédure de réplication sur `FoxRunner_frontend_node20`
(après accord). Différences Angular 19 attendues : aucune (standalone, signals, `@ContentChildren`,
`@if/@for`, `*ngTemplateOutlet` existent en v19).

## Risques / points de vigilance

- **Cap de 500** : si une table bornée dépasse (improbable), seules 500 lignes s'affichent ; le
  `console.warn` le signale. Documenté ; pas de pagination serveur réintroduite ici.
- **Toggles inline (`ngModel`)** dans `slots`/`admin-users` : le filtre PrimeNG masque/affiche des
  lignes sans toucher leurs bindings ; vérifier que basculer un toggle puis filtrer conserve l'état.
- **Projection de cellules** : le contrat `appCell="field"` doit matcher exactement le `field` de
  la colonne ; un mismatch → cellule en texte brut. Couvert par le test.
- **`*ngTemplateOutlet`** : importer `NgTemplateOutlet` dans le composant wrapper.

## Hors périmètre

- Search/sort **serveur** sur les journaux (jobs/history/audit/artifacts/graph) → futur travail
  backend (FoxRunner_server), non fait ici.
- Filtres par colonne dédiés, export, sélection multiligne, et toute autre fonctionnalité de table
  non demandée (YAGNI).
