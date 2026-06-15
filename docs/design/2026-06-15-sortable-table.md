# Composant `<app-data-table>` triable/filtrable (2026-06-15)

Wrapper réutilisable de `p-table` (mode client) : recherche globale + colonnes triables +
pagination + empty-state, avec cellules riches projetées via `<ng-template appCell="field">`.

## Composant — `src/app/shared/components/data-table/`
- `data-table.types.ts` — `DataTableColumn { field; header; sortable?; width?; searchable? }`.
- `cell-template.directive.ts` — `[appCell]` (field + TemplateRef).
- `data-table.component.ts/.html/.scss` — `app-data-table` (inputs `value`, `columns`, `dataKey`,
  `loading`, `pageSize`, `rowsPerPageOptions`, `searchPlaceholder`,
  `emptyIcon`/`emptyTitle`/`emptyMessage` ; projection `[emptyActions]`).
  `globalFilterFields` = colonnes `searchable !== false`. Colonne sans `appCell` → texte
  `{{ row[field] }}`.

## Tables migrées (client, bornées)
`scenarios-list`, `slots-list`, `admin-users`, `admin-settings` — chacune charge toutes ses lignes
(`list(limit=500, offset=0)`, le cap est un garde-fou avec `console.warn` si dépassé) et délègue au
wrapper. Les toggles inline (`slots`, `admin-users`) et la logique dialog/CRUD sont préservés.

## Non migrées
- Journaux paginés-serveur : `jobs`, `history`, `admin-audit`, `admin-artifacts`, `admin-graph` —
  gardent leur pagination serveur + filtres existants (un vrai search/sort serveur = futur backend
  FoxRunner_server, aucun endpoint n'expose `search`/`sort` aujourd'hui).
- `shares-dialog` : lignes = `string[]` (pas des records), incompatibles avec `row[field]` /
  `globalFilterFields` ; déjà client-side, minuscule, dans un dialog. Volontairement non migrée.

## Réplication sur FoxRunner_frontend_node20 (Angular 19) — APRÈS ACCORD
1. `git pull` du fork. 2. Rejouer les mêmes fichiers à l'identique. 3. Différences v19 attendues :
   aucune (`@ContentChildren`, `*ngTemplateOutlet`, signals, standalone, `iconfield`/`inputicon`
   PrimeNG 19 existent). 4. Valider : `npm test`, `npm run build`, `npm run lint`.
