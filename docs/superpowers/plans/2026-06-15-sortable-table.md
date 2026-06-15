# Composant `<app-data-table>` triable/filtrable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un composant réutilisable `<app-data-table>` (recherche globale + colonnes triables + pagination + empty-state, cellules riches via projection `appCell`) appliqué aux tables bornées de FoxRunner, qui passent en chargement client complet.

**Architecture:** Le wrapper possède un `p-table` non-lazy ; chaque table bornée charge toutes ses lignes en un appel (cap 500) et fournit sa config de colonnes + des `<ng-template appCell="field">` pour les cellules riches. Les journaux paginés-serveur restent inchangés.

**Tech Stack:** Angular 21, PrimeNG 21 (`p-table`, `iconfield`/`inputicon`, `pSortableColumn`, filtre global), standalone components, signals, `@ContentChildren`, vitest.

**Spec source:** `docs/superpowers/specs/2026-06-15-sortable-table-design.md`
**Branche:** `feat/sortable-table` (déjà créée depuis `main`).
**Tests dans ce repo :** `npx ng test --watch=false` (PAS `npx vitest run`).

**Écart vs spec :** `shares-dialog` est **exclu** — ses lignes sont des `string` (pas des records), incompatibles avec le rendu `row[field]` / `globalFilterFields` du wrapper ; elle est déjà client-side, minuscule, dans un dialog. Migration = **4 tables** (scenarios, slots, admin-users, admin-settings).

---

## File Structure

- `src/app/shared/components/data-table/data-table.types.ts` — **créé** : `DataTableColumn`.
- `src/app/shared/components/data-table/cell-template.directive.ts` — **créé** : `[appCell]`.
- `src/app/shared/components/data-table/data-table.component.ts` — **créé** : `app-data-table`.
- `src/app/shared/components/data-table/data-table.component.html` — **créé**.
- `src/app/shared/components/data-table/data-table.component.scss` — **créé**.
- `src/app/shared/components/data-table/data-table.component.spec.ts` — **créé** : tests.
- `src/app/features/scenarios/list/scenarios-list.component.ts` — **modifié** : migration.
- `src/app/features/slots/list/slots-list.component.ts` — **modifié** : migration.
- `src/app/features/admin/users/admin-users.component.ts` — **modifié** : migration.
- `src/app/features/admin/settings/admin-settings.component.ts` — **modifié** : migration.
- `docs/design/2026-06-15-sortable-table.md` — **créé** : doc + réplication fork.

---

## Task 1: Type de colonne + directive `appCell`

**Files:**
- Create: `src/app/shared/components/data-table/data-table.types.ts`
- Create: `src/app/shared/components/data-table/cell-template.directive.ts`

- [ ] **Step 1: Créer le type**

`src/app/shared/components/data-table/data-table.types.ts` :
```ts
export interface DataTableColumn {
  /** Row property key AND the matching `appCell` template id. */
  field: string;
  header: string;
  /** Adds pSortableColumn + sort icon. Default false. */
  sortable?: boolean;
  /** CSS width applied to the <th>, e.g. '8rem'. */
  width?: string;
  /** Participates in the global filter. Default true. */
  searchable?: boolean;
}
```

- [ ] **Step 2: Créer la directive**

`src/app/shared/components/data-table/cell-template.directive.ts` :
```ts
import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Marks an <ng-template appCell="field"> projected into <app-data-table>.
 * The data-table renders this template for the column whose `field` matches,
 * with the row as the template's implicit context.
 */
@Directive({
  selector: '[appCell]',
  standalone: true,
})
export class CellTemplateDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  @Input('appCell') field = '';
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npm run build`
Expected: `Application bundle generation complete` (rien n'utilise encore ces fichiers — ils doivent juste compiler).

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/components/data-table/data-table.types.ts src/app/shared/components/data-table/cell-template.directive.ts
git commit -m "feat(data-table): column type + appCell template directive"
```

---

## Task 2: Composant `app-data-table` (TDD)

**Files:**
- Create: `src/app/shared/components/data-table/data-table.component.ts`
- Create: `src/app/shared/components/data-table/data-table.component.html`
- Create: `src/app/shared/components/data-table/data-table.component.scss`
- Test: `src/app/shared/components/data-table/data-table.component.spec.ts`

- [ ] **Step 1: Écrire le test (échoue d'abord)**

`src/app/shared/components/data-table/data-table.component.spec.ts` :
```ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DataTableComponent } from './data-table.component';
import { CellTemplateDirective } from './cell-template.directive';
import type { DataTableColumn } from './data-table.types';

@Component({
  standalone: true,
  imports: [DataTableComponent, CellTemplateDirective],
  template: `
    <app-data-table [value]="rows" [columns]="cols" emptyTitle="Vide">
      <ng-template appCell="name" let-row>
        <span class="custom">{{ row.name }}!</span>
      </ng-template>
    </app-data-table>
  `,
})
class HostComponent {
  rows = [
    { id: 1, name: 'Alice', role: 'owner' },
    { id: 2, name: 'Bob', role: 'guest' },
  ];
  cols: DataTableColumn[] = [
    { field: 'name', header: 'Nom', sortable: true },
    { field: 'role', header: 'Rôle', searchable: false },
  ];
}

describe('DataTableComponent', () => {
  it('renders one row per value, projecting appCell and falling back to text', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const custom = el.querySelectorAll('.custom');
    expect(custom.length).toBe(2);
    expect(custom[0].textContent).toContain('Alice!');
    // 'role' has no appCell → default {{ row.role }}
    expect(el.textContent).toContain('owner');
  });

  it('excludes searchable:false columns from globalFilterFields', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const dt = fixture.debugElement.query(By.directive(DataTableComponent))
      .componentInstance as DataTableComponent;
    expect(dt.globalFilterFields).toEqual(['name']);
  });
});
```

- [ ] **Step 2: Lancer le test → échec**

Run: `npx ng test --watch=false --include="**/data-table.component.spec.ts"`
Expected: FAIL (`Cannot find module './data-table.component'`).

- [ ] **Step 3: Implémenter le composant (TS)**

`src/app/shared/components/data-table/data-table.component.ts` :
```ts
import {
  Component,
  ContentChildren,
  Input,
  QueryList,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { CellTemplateDirective } from './cell-template.directive';
import type { DataTableColumn } from './data-table.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    EmptyStateComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent {
  @Input({ required: true }) value: unknown[] = [];
  @Input({ required: true }) columns: DataTableColumn[] = [];
  @Input() dataKey?: string;
  @Input() loading = false;
  @Input() pageSize = 25;
  @Input() rowsPerPageOptions: number[] = [10, 25, 50];
  @Input() searchPlaceholder = 'Rechercher…';
  @Input() emptyIcon?: string;
  @Input({ required: true }) emptyTitle = '';
  @Input() emptyMessage?: string;

  @ContentChildren(CellTemplateDirective)
  private cellTemplates?: QueryList<CellTemplateDirective>;

  get globalFilterFields(): string[] {
    return this.columns.filter((c) => c.searchable !== false).map((c) => c.field);
  }

  cellTemplate(field: string): TemplateRef<unknown> | null {
    const match = this.cellTemplates?.find((t) => t.field === field);
    return match ? match.templateRef : null;
  }
}
```

- [ ] **Step 4: Implémenter le template (HTML)**

`src/app/shared/components/data-table/data-table.component.html` :
```html
<div class="data-table">
  <div class="data-table__toolbar">
    <p-iconfield iconPosition="left">
      <p-inputicon styleClass="pi pi-search" />
      <input
        pInputText
        type="text"
        [placeholder]="searchPlaceholder"
        (input)="dt.filterGlobal($any($event.target).value, 'contains')"
      />
    </p-iconfield>
  </div>

  <p-table
    #dt
    [value]="value"
    [paginator]="true"
    [rows]="pageSize"
    [rowsPerPageOptions]="rowsPerPageOptions"
    [globalFilterFields]="globalFilterFields"
    [dataKey]="dataKey"
    [loading]="loading"
    styleClass="p-datatable-sm"
  >
    <ng-template pTemplate="header">
      <tr>
        @for (col of columns; track col.field) {
          @if (col.sortable) {
            <th [pSortableColumn]="col.field" [style.width]="col.width">
              {{ col.header }}
              <p-sortIcon [field]="col.field" />
            </th>
          } @else {
            <th [style.width]="col.width">{{ col.header }}</th>
          }
        }
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-row>
      <tr>
        @for (col of columns; track col.field) {
          <td>
            @if (cellTemplate(col.field); as tpl) {
              <ng-container
                [ngTemplateOutlet]="tpl"
                [ngTemplateOutletContext]="{ $implicit: row }"
              />
            } @else {
              {{ $any(row)[col.field] }}
            }
          </td>
        }
      </tr>
    </ng-template>
    <ng-template pTemplate="emptymessage">
      <tr>
        <td [attr.colspan]="columns.length">
          <app-empty-state
            [icon]="emptyIcon"
            [title]="emptyTitle"
            [message]="emptyMessage"
          >
            <ng-content select="[emptyActions]" />
          </app-empty-state>
        </td>
      </tr>
    </ng-template>
  </p-table>
</div>
```

- [ ] **Step 5: Implémenter les styles (SCSS)**

`src/app/shared/components/data-table/data-table.component.scss` :
```scss
.data-table__toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.75rem;
}
```

- [ ] **Step 6: Lancer le test → succès**

Run: `npx ng test --watch=false --include="**/data-table.component.spec.ts"`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/shared/components/data-table
git commit -m "feat(data-table): app-data-table wrapper (search, sortable columns, projected cells)"
```

---

## Task 3: Migrer `scenarios-list`

**Files:**
- Modify: `src/app/features/scenarios/list/scenarios-list.component.ts`

- [ ] **Step 1: Mettre à jour les imports du composant**

Dans le décorateur `@Component({ imports: [...] })`, **retirer** `TableModule` et `EmptyStateComponent` ; **ajouter** `DataTableComponent` + `CellTemplateDirective`. Dans les imports TS en tête de fichier, retirer `TableLazyLoadEvent, TableModule` et l'import de `EmptyStateComponent`, et ajouter :
```ts
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
```
Garder `RouterLink`, `TagModule`, `TooltipModule`, `ButtonModule`, `DialogModule`, `InputTextModule`, `ConfirmDialogModule`, `PageHeaderComponent`, `FormsModule`.

- [ ] **Step 2: Remplacer le bloc `<p-table>…</p-table>`**

Remplacer tout le bloc `<p-table … (onLazyLoad)…> … </p-table>` (l'élément `<p-table>` entier) par :
```html
    <app-data-table
      [value]="items()"
      [columns]="columns"
      [loading]="loading()"
      dataKey="scenario_id"
      emptyIcon="pi-sitemap"
      emptyTitle="Aucun scénario"
      emptyMessage="Crée un premier scénario pour démarrer."
    >
      <ng-template appCell="scenario_id" let-s>
        <a [routerLink]="['/scenarios', s.scenario_id]">{{ s.scenario_id }}</a>
      </ng-template>
      <ng-template appCell="description" let-s>{{ s.description || '—' }}</ng-template>
      <ng-template appCell="role" let-s>
        @if (s.role === 'owner') {
          <p-tag severity="success" value="Propriétaire" />
        } @else {
          <p-tag severity="info" value="Partagé" />
        }
      </ng-template>
      <ng-template appCell="network" let-s>
        @if (s.requires_enterprise_network) {
          <span pTooltip="Requiert le réseau entreprise/VPN">
            <i class="pi pi-lock mr-1"></i>Entreprise
          </span>
        } @else {
          <span class="text-color-secondary">Public</span>
        }
      </ng-template>
      <ng-template appCell="actions" let-s>
        <div class="flex gap-1">
          <p-button
            icon="pi pi-eye"
            [rounded]="true"
            [text]="true"
            size="small"
            severity="secondary"
            [routerLink]="['/scenarios', s.scenario_id]"
            pTooltip="Détail"
          />
          @if (s.writable) {
            <p-button
              icon="pi pi-copy"
              [rounded]="true"
              [text]="true"
              size="small"
              severity="secondary"
              (onClick)="askDuplicate(s)"
              pTooltip="Dupliquer"
            />
            <p-button
              icon="pi pi-trash"
              [rounded]="true"
              [text]="true"
              size="small"
              severity="danger"
              (onClick)="askDelete(s)"
              pTooltip="Supprimer"
            />
          }
        </div>
      </ng-template>
      <p-button
        emptyActions
        label="Créer un scénario"
        icon="pi pi-plus"
        routerLink="/scenarios/new"
      />
    </app-data-table>
```

- [ ] **Step 3: Déclarer `columns` + passer le chargement en full client**

Dans la classe, **ajouter** le champ colonnes (après `readonly loading = signal(false);`) :
```ts
  readonly columns: DataTableColumn[] = [
    { field: 'scenario_id', header: 'Scenario ID', sortable: true },
    { field: 'description', header: 'Description', sortable: true },
    { field: 'role', header: 'Rôle', width: '8rem', searchable: false },
    { field: 'network', header: 'Réseau', width: '10rem', searchable: false },
    { field: 'actions', header: 'Actions', width: '9rem', searchable: false },
  ];
```
**Retirer** les signals `total`, `rows`, `first` et la méthode `onLazyLoad`. Remplacer `ngOnInit`, `reload` et `load` par :
```ts
  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      // Bounded table: load all rows for client-side search/sort (500 is a guard rail).
      const page = await this.service.list(me.id, 500, 0);
      this.items.set(page.items);
      if (page.total > 500) {
        console.warn(`scenarios: ${page.total} rows exceed the 500 client cap; showing first 500.`);
      }
    } catch {
      /* interceptor toasts */
    } finally {
      this.loading.set(false);
    }
  }
```

- [ ] **Step 4: Build + lint**

Run: `npm run build` → Expected: `Application bundle generation complete`. Si une erreur signale un import inutilisé (`TableModule`, `EmptyStateComponent`, `TableLazyLoadEvent`), le retirer.
Run: `npm run lint` → Expected: `All files pass linting.`

- [ ] **Step 5: Commit**

```bash
git add src/app/features/scenarios/list/scenarios-list.component.ts
git commit -m "refactor(scenarios): migrate list to app-data-table (client search/sort)"
```

---

## Task 4: Migrer `slots-list`

**Files:**
- Modify: `src/app/features/slots/list/slots-list.component.ts`

- [ ] **Step 1: Mettre à jour les imports**

Dans `@Component imports`, retirer `TableModule` et `EmptyStateComponent` ; ajouter `DataTableComponent`, `CellTemplateDirective`. En tête, retirer `TableLazyLoadEvent, TableModule` et l'import `EmptyStateComponent` ; ajouter :
```ts
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
```
Garder `TagModule`, `ToggleSwitchModule`, `ButtonModule`, `TooltipModule`, `FormsModule`, et tous les modules du dialog (`DialogModule`, `InputTextModule`, `InputMaskModule`, `MultiSelectModule`, `CheckboxModule`, `AutoCompleteModule`, `ReactiveFormsModule`, `ConfirmDialogModule`, `PageHeaderComponent`).

- [ ] **Step 2: Remplacer le bloc `<p-table>…</p-table>`**

```html
    <app-data-table
      [value]="items()"
      [columns]="columns"
      [loading]="loading()"
      dataKey="slot_id"
      emptyIcon="pi-calendar"
      emptyTitle="Aucun slot"
      emptyMessage="Crée un premier slot pour planifier une exécution."
    >
      <ng-template appCell="days" let-s>
        <div class="flex gap-1">
          @for (d of days; track d.value) {
            <p-tag
              [severity]="s.days?.includes(d.value) ? 'success' : 'secondary'"
              [value]="d.label"
            />
          }
        </div>
      </ng-template>
      <ng-template appCell="schedule" let-s>{{ s.start }} — {{ s.end }}</ng-template>
      <ng-template appCell="enabled" let-s>
        <p-toggleswitch
          [(ngModel)]="s.enabled"
          (onChange)="toggleEnabled(s)"
          [ariaLabel]="'Actif — slot ' + s.slot_id"
        />
      </ng-template>
      <ng-template appCell="actions" let-s>
        <div class="flex gap-1">
          <p-button
            icon="pi pi-pencil"
            [rounded]="true"
            [text]="true"
            size="small"
            severity="secondary"
            (onClick)="openEdit(s)"
            pTooltip="Modifier"
          />
          <p-button
            icon="pi pi-trash"
            [rounded]="true"
            [text]="true"
            size="small"
            severity="danger"
            (onClick)="askDelete(s)"
            pTooltip="Supprimer"
          />
        </div>
      </ng-template>
      <p-button emptyActions label="Créer un slot" icon="pi pi-plus" (onClick)="openCreate()" />
    </app-data-table>
```

- [ ] **Step 3: Colonnes + chargement full client**

Ajouter le champ (après `readonly saving = signal(false);`) :
```ts
  readonly columns: DataTableColumn[] = [
    { field: 'slot_id', header: 'Slot', sortable: true },
    { field: 'scenario_id', header: 'Scénario', sortable: true },
    { field: 'days', header: 'Jours', searchable: false },
    { field: 'schedule', header: 'Horaire', searchable: false },
    { field: 'enabled', header: 'Actif', width: '6rem', searchable: false },
    { field: 'actions', header: 'Actions', width: '9rem', searchable: false },
  ];
```
Retirer les signals `total`, `rows`, `first` et la méthode `onLazyLoad`. Remplacer `ngOnInit`/`reload`/`load` par :
```ts
  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      // Bounded table: load all rows for client-side search/sort (500 is a guard rail).
      const page = await this.slotsService.list({ limit: 500, offset: 0 });
      this.items.set(page.items);
      if (page.total > 500) {
        console.warn(`slots: ${page.total} rows exceed the 500 client cap; showing first 500.`);
      }
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }
```

- [ ] **Step 4: Build + lint**

Run: `npm run build` → `Application bundle generation complete`. Retirer tout import devenu inutilisé.
Run: `npm run lint` → `All files pass linting.`

- [ ] **Step 5: Commit**

```bash
git add src/app/features/slots/list/slots-list.component.ts
git commit -m "refactor(slots): migrate list to app-data-table (client search/sort)"
```

---

## Task 5: Migrer `admin-users`

**Files:**
- Modify: `src/app/features/admin/users/admin-users.component.ts`

- [ ] **Step 1: Imports**

Dans `@Component imports`, retirer `TableModule` et `EmptyStateComponent` ; ajouter `DataTableComponent`, `CellTemplateDirective`. En tête, retirer `TableLazyLoadEvent, TableModule` et l'import `EmptyStateComponent` ; ajouter les 3 imports data-table (component, directive, type — chemin `../../../shared/components/data-table/...`). `TagModule` n'est plus utilisé (aucun `p-tag` dans les cellules) → le retirer aussi. Garder `RouterLink`, `ButtonModule`, `ToggleSwitchModule`, `TooltipModule`, `FormsModule`, `PageHeaderComponent`.

- [ ] **Step 2: Remplacer le `<p-table>…</p-table>`**

```html
    <app-data-table
      [value]="items()"
      [columns]="columns"
      [loading]="loading()"
      dataKey="id"
      emptyIcon="pi-users"
      emptyTitle="Aucun utilisateur"
    >
      <ng-template appCell="id" let-u><code class="text-xs">{{ u.id }}</code></ng-template>
      <ng-template appCell="is_active" let-u>
        <p-toggleswitch
          [(ngModel)]="u.is_active"
          (onChange)="updateFlag(u, 'is_active', u.is_active)"
          [ariaLabel]="'Actif — ' + u.email"
        />
      </ng-template>
      <ng-template appCell="is_superuser" let-u>
        <p-toggleswitch
          [(ngModel)]="u.is_superuser"
          (onChange)="updateFlag(u, 'is_superuser', u.is_superuser)"
          [ariaLabel]="'Superuser — ' + u.email"
        />
      </ng-template>
      <ng-template appCell="is_verified" let-u>
        <p-toggleswitch
          [(ngModel)]="u.is_verified"
          (onChange)="updateFlag(u, 'is_verified', u.is_verified)"
          [ariaLabel]="'Vérifié — ' + u.email"
        />
      </ng-template>
    </app-data-table>
```
(Les colonnes `email` et `timezone_name` n'ont pas de `appCell` → rendu texte par défaut.)

- [ ] **Step 3: Colonnes + chargement full client**

Ajouter (après `readonly loading = signal(false);`) :
```ts
  readonly columns: DataTableColumn[] = [
    { field: 'email', header: 'Email', sortable: true },
    { field: 'id', header: 'UUID', width: '18rem', searchable: false },
    { field: 'timezone_name', header: 'Fuseau', sortable: true },
    { field: 'is_active', header: 'Actif', width: '6rem', searchable: false },
    { field: 'is_superuser', header: 'Superuser', width: '8rem', searchable: false },
    { field: 'is_verified', header: 'Vérifié', width: '7rem', searchable: false },
  ];
```
Retirer `total`, `rows`, `first`, `onLazyLoad`. Remplacer `ngOnInit`/`reload`/`load` :
```ts
  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      // Bounded table: load all rows for client-side search/sort (500 is a guard rail).
      const page = await this.service.listUsers(500, 0);
      this.items.set(page.items);
      if (page.total > 500) {
        console.warn(`users: ${page.total} rows exceed the 500 client cap; showing first 500.`);
      }
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }
```

- [ ] **Step 4: Build + lint**

Run: `npm run build` → `Application bundle generation complete`. Retirer tout import inutilisé.
Run: `npm run lint` → `All files pass linting.`

- [ ] **Step 5: Commit**

```bash
git add src/app/features/admin/users/admin-users.component.ts
git commit -m "refactor(admin-users): migrate to app-data-table (client search/sort)"
```

---

## Task 6: Migrer `admin-settings`

**Files:**
- Modify: `src/app/features/admin/settings/admin-settings.component.ts`

- [ ] **Step 1: Imports**

Dans `@Component imports`, retirer `TableModule` et `EmptyStateComponent` ; ajouter `DataTableComponent`, `CellTemplateDirective`. En tête, retirer `TableLazyLoadEvent, TableModule` et l'import `EmptyStateComponent` ; ajouter les 3 imports data-table. Garder `ApiDatePipe` (utilisé dans `appCell="updated_at"`), `ButtonModule`, `DialogModule`, `InputTextModule`, `TextareaModule`, `TooltipModule`, `ConfirmDialogModule`, `JsonEditorComponent`, `PageHeaderComponent`, `FormsModule`, `RouterLink`.

- [ ] **Step 2: Remplacer le `<p-table>…</p-table>`**

```html
    <app-data-table
      [value]="items()"
      [columns]="columns"
      [loading]="loading()"
      dataKey="key"
      emptyIcon="pi-sliders-h"
      emptyTitle="Aucun paramètre"
      emptyMessage="Crée un paramètre pour le voir ici."
    >
      <ng-template appCell="key" let-s><code>{{ s.key }}</code></ng-template>
      <ng-template appCell="description" let-s>
        <span class="text-color-secondary">{{ s.description || '—' }}</span>
      </ng-template>
      <ng-template appCell="updated_at" let-s>{{ s.updated_at | apiDate: 'medium' }}</ng-template>
      <ng-template appCell="actions" let-s>
        <div class="flex gap-1">
          <p-button
            icon="pi pi-pencil"
            [rounded]="true"
            [text]="true"
            size="small"
            (onClick)="openEdit(s)"
          />
          <p-button
            icon="pi pi-trash"
            [rounded]="true"
            [text]="true"
            size="small"
            severity="danger"
            (onClick)="askDelete(s)"
          />
        </div>
      </ng-template>
    </app-data-table>
```

- [ ] **Step 3: Colonnes + chargement full client**

Ajouter (après `readonly saving = signal(false);`) :
```ts
  readonly columns: DataTableColumn[] = [
    { field: 'key', header: 'Clé', sortable: true },
    { field: 'description', header: 'Description', sortable: true },
    { field: 'updated_at', header: 'Modifié le', sortable: true, width: '12rem' },
    { field: 'actions', header: 'Actions', width: '9rem', searchable: false },
  ];
```
Retirer `total`, `rows`, `first`, `onLazyLoad`. Remplacer `ngOnInit`/`reload`/`load` :
```ts
  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      // Bounded table: load all rows for client-side search/sort (500 is a guard rail).
      const page = await this.service.listSettings(500, 0);
      this.items.set(page.items);
      if (page.total > 500) {
        console.warn(`settings: ${page.total} rows exceed the 500 client cap; showing first 500.`);
      }
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }
```

- [ ] **Step 4: Build + lint**

Run: `npm run build` → `Application bundle generation complete`. Retirer tout import inutilisé.
Run: `npm run lint` → `All files pass linting.`

- [ ] **Step 5: Commit**

```bash
git add src/app/features/admin/settings/admin-settings.component.ts
git commit -m "refactor(admin-settings): migrate to app-data-table (client search/sort)"
```

---

## Task 7: Documentation

**Files:**
- Create: `docs/design/2026-06-15-sortable-table.md`

- [ ] **Step 1: Écrire le doc**

`docs/design/2026-06-15-sortable-table.md` :
```markdown
# Composant `<app-data-table>` triable/filtrable (2026-06-15)

Wrapper réutilisable de `p-table` (mode client) : recherche globale + colonnes triables +
pagination + empty-state, avec cellules riches projetées via `<ng-template appCell="field">`.

## Composant — `src/app/shared/components/data-table/`
- `data-table.types.ts` — `DataTableColumn { field; header; sortable?; width?; searchable? }`.
- `cell-template.directive.ts` — `[appCell]` (field + TemplateRef).
- `data-table.component.ts/.html/.scss` — `app-data-table` (inputs `value`, `columns`, `dataKey`,
  `loading`, `pageSize`, `rowsPerPageOptions`, `searchPlaceholder`, `emptyIcon/emptyTitle/emptyMessage` ;
  projection `[emptyActions]`). `globalFilterFields` = colonnes `searchable !== false`.

## Tables migrées (client, bornées)
scenarios-list, slots-list, admin-users, admin-settings — chacune charge toutes ses lignes
(`list(limit=500, offset=0)`, cap = garde-fou avec `console.warn`) et délègue au wrapper.

## Non migrées
- Journaux paginés-serveur : jobs, history, admin-audit, admin-artifacts, admin-graph — gardent
  leur pagination serveur + filtres existants (un vrai search/sort serveur = futur backend).
- `shares-dialog` : lignes = `string[]` (pas des records), incompatibles avec `row[field]` /
  `globalFilterFields` ; déjà client-side, minuscule. Volontairement non migrée.

## Réplication sur FoxRunner_frontend_node20 (Angular 19) — APRÈS ACCORD
1. `git pull` du fork. 2. Rejouer les mêmes fichiers. 3. Différences v19 attendues : aucune
   (`@ContentChildren`, `*ngTemplateOutlet`, signals, standalone, `iconfield`/`inputicon` PrimeNG 19
   existent). 4. Valider : `npm test`, `npm run build`, `npm run lint`.
```

- [ ] **Step 2: Commit**

```bash
git add docs/design/2026-06-15-sortable-table.md
git commit -m "docs(data-table): document the wrapper + migrated tables + fork replication"
```

---

## Task 8: Validation finale

**Files:** aucun

- [ ] **Step 1: Chaîne complète**

Run: `npm run lint && npx ng test --watch=false && npm run build`
Expected: lint vert ; tous les tests verts (dont les 2 nouveaux du data-table) ; build complet
(warning budget toléré).

- [ ] **Step 2: Vérifier l'absence de résidu lazy dans les tables migrées**

Run: `grep -rn "onLazyLoad\|TableLazyLoadEvent\|\[lazy\]" src/app/features/scenarios/list src/app/features/slots/list src/app/features/admin/users src/app/features/admin/settings`
Expected: aucune sortie (les 4 tables ne sont plus lazy).

- [ ] **Step 3: État git**

Run: `git log --oneline main..HEAD && git status --short`
Expected: historique cohérent (types/directive → composant → 4 migrations → doc), arbre propre.

---

## Self-Review (effectuée à l'écriture)

- **Couverture spec :** §1 architecture (T1,T2) ; §2 API (T2) ; §3 migrations des 4 tables bornées
  (T3-T6) ; §4 tests (T2) ; §5 doc (T7) ; cap 500 + `console.warn` (T3-T6) ; toggles inline conservés
  (T4,T5) ; journaux laissés serveur (documenté T7). `shares-dialog` exclu avec rationale (en-tête + T7). ✓
- **Placeholders :** aucun TODO/TBD ; code TS/HTML/SCSS/tests complet ; chemins exacts ; les `columns`
  et `appCell` reprennent le markup réel de chaque table. ✓
- **Cohérence des noms :** `DataTableComponent`/`CellTemplateDirective`/`DataTableColumn` et le contrat
  `appCell="field"` ↔ `field` des colonnes identiques entre T1, T2 et les 4 migrations ; signal de
  données `items()` conservé partout ; `globalFilterFields` défini en T2 et testé en T2. ✓
