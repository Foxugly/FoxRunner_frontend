import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import { HistoryService } from '../../core/api/history.service';
import type { History } from '../../core/api/types';
import { ApiDatePipe } from '../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusTagComponent } from '../../shared/components/status-tag/status-tag.component';

interface StatusOption {
  label: string;
  value: string | null;
}

const STATUS_OPTIONS: StatusOption[] = [
  { label: 'Tous', value: null },
  { label: 'Réussis', value: 'success' },
  { label: 'Échecs', value: 'failed' },
  { label: 'Annulés', value: 'cancelled' },
  { label: 'Ignorés', value: 'skipped' },
];

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    ApiDatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusTagComponent,
  ],
  template: `
    <app-page-header
      icon="pi-history"
      title="Historique"
      subtitle="Exécutions passées, paginées depuis la base"
    >
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
        pTooltip="Rafraîchir"
      />
    </app-page-header>

    <div class="flex gap-3 mb-3 flex-wrap">
      <div class="flex flex-column gap-1">
        <label for="f-status" class="text-sm text-color-secondary">Statut</label>
        <p-select
          inputId="f-status"
          [options]="statusOptions"
          [(ngModel)]="filterStatus"
          optionLabel="label"
          optionValue="value"
          placeholder="Tous"
          [style]="{ width: '12rem' }"
          (onChange)="reload()"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label for="f-scenario" class="text-sm text-color-secondary">Scénario</label>
        <input
          id="f-scenario"
          pInputText
          [(ngModel)]="filterScenarioId"
          placeholder="scenario_id"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="flex flex-column gap-1">
        <label for="f-slot" class="text-sm text-color-secondary">Slot</label>
        <input
          id="f-slot"
          pInputText
          [(ngModel)]="filterSlotId"
          placeholder="slot_id"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="flex align-items-end">
        <p-button
          label="Appliquer"
          icon="pi pi-filter"
          [text]="true"
          severity="secondary"
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
          <th>Scénario</th>
          <th>Slot</th>
          <th style="width: 7rem">Statut</th>
          <th style="width: 12rem">Exécuté le</th>
          <th>Étape</th>
          <th>Message</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-h>
        <tr>
          <td>{{ h.scenario_id }}</td>
          <td>{{ h.slot_id }}</td>
          <td><app-status-tag [status]="h.status" /></td>
          <td>{{ h.executed_at | apiDate: 'medium' }}</td>
          <td>{{ h.step }}</td>
          <td [pTooltip]="h.message" [style.max-width.rem]="30" class="text-overflow-ellipsis overflow-hidden white-space-nowrap">
            {{ h.message }}
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6">
            <app-empty-state
              icon="pi-history"
              title="Historique vide"
              message="Aucune exécution ne correspond aux filtres."
            />
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class HistoryComponent implements OnInit {
  private readonly service = inject(HistoryService);
  private readonly auth = inject(AuthService);

  readonly statusOptions = STATUS_OPTIONS;
  readonly items = signal<History[]>([]);
  readonly total = signal(0);
  readonly rows = signal(50);
  readonly first = signal(0);
  readonly loading = signal(false);

  filterStatus: string | null = null;
  filterScenarioId = '';
  filterSlotId = '';

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
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      const page = await this.service.list(me.id, {
        status: this.filterStatus ?? undefined,
        scenario_id: this.filterScenarioId || undefined,
        slot_id: this.filterSlotId || undefined,
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
}
