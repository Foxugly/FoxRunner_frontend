import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AdminService } from '../../../core/api/admin.service';
import type { AuditEntry } from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    ApiDatePipe,
    EmptyStateComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      icon="pi-list"
      title="Audit"
      [backLink]="'/admin'"
    >
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
    </app-page-header>

    <div class="flex gap-3 mb-3 flex-wrap">
      <div class="flex flex-column gap-1">
        <label for="actor" class="text-sm text-color-secondary">Acteur</label>
        <input
          id="actor"
          pInputText
          [(ngModel)]="filterActor"
          placeholder="email ou UUID"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label for="tgt-type" class="text-sm text-color-secondary">Type cible</label>
        <input
          id="tgt-type"
          pInputText
          [(ngModel)]="filterTargetType"
          placeholder="scenario, slot, user, setting…"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label for="tgt-id" class="text-sm text-color-secondary">ID cible</label>
        <input
          id="tgt-id"
          pInputText
          [(ngModel)]="filterTargetId"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="flex align-items-end">
        <p-button
          label="Appliquer"
          icon="pi pi-filter"
          severity="secondary"
          [text]="true"
          (onClick)="reload()"
        />
      </div>
    </div>

    <p-table
      [value]="items()"
      [lazy]="true"
      [paginator]="true"
      [rows]="rows()"
      [first]="first()"
      [totalRecords]="total()"
      [loading]="loading()"
      (onLazyLoad)="onLazyLoad($event)"
      [rowsPerPageOptions]="[20, 50, 100]"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 12rem">Quand</th>
          <th>Acteur</th>
          <th>Action</th>
          <th>Cible</th>
          <th>Détails</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-a>
        <tr>
          <td>{{ a.created_at | apiDate: 'medium' }}</td>
          <td>{{ a.actor_user_id }}</td>
          <td><p-tag severity="secondary" [value]="a.action" /></td>
          <td>
            <div class="text-sm">
              <div>{{ a.target_type }}</div>
              <code class="text-xs">{{ a.target_id }}</code>
            </div>
          </td>
          <td
            class="text-xs font-mono text-color-secondary text-overflow-ellipsis overflow-hidden white-space-nowrap"
            [style.max-width.rem]="30"
            [pTooltip]="diff(a)"
            tooltipPosition="left"
          >
            {{ diff(a) }}
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="5">
            <app-empty-state
              icon="pi-list"
              title="Aucune entrée"
              message="Le journal est vide pour ces filtres."
            />
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class AdminAuditComponent implements OnInit {
  private readonly service = inject(AdminService);

  readonly items = signal<AuditEntry[]>([]);
  readonly total = signal(0);
  readonly rows = signal(50);
  readonly first = signal(0);
  readonly loading = signal(false);

  filterActor = '';
  filterTargetType = '';
  filterTargetId = '';

  ngOnInit(): void {
    void this.load(0, this.rows());
  }

  onLazyLoad(ev: TableLazyLoadEvent): void {
    const first = ev.first ?? 0;
    const rows = ev.rows ?? this.rows();
    this.first.set(first);
    this.rows.set(rows);
    void this.load(first, rows);
  }

  reload(): void {
    this.first.set(0);
    void this.load(0, this.rows());
  }

  private async load(offset: number, limit: number): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.service.audit({
        actor_user_id: this.filterActor || undefined,
        target_type: this.filterTargetType || undefined,
        target_id: this.filterTargetId || undefined,
        limit,
        offset,
      });
      this.items.set(page.items);
      this.total.set(page.total);
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }

  diff(a: AuditEntry): string {
    const before = JSON.stringify(a.before ?? {});
    const after = JSON.stringify(a.after ?? {});
    return `before=${before} → after=${after}`;
  }
}
