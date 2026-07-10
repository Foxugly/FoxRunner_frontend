import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
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
    RouterLink,
    TranslocoPipe,
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
    <app-page-header icon="pi-list" [title]="'admin.audit.title' | transloco">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'admin.common.back' | transloco"
        [outlined]="true"
        severity="secondary"
        routerLink="/admin"
      />
      <p-button
        slot="right"
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
    </app-page-header>

    <div class="filter-bar">
      <div class="filter-field">
        <label for="actor" class="filter-label">{{ 'admin.audit.filter_actor' | transloco }}</label>
        <input
          id="actor"
          pInputText
          [(ngModel)]="filterActor"
          [placeholder]="'admin.audit.filter_actor_ph' | transloco"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="filter-field">
        <label for="tgt-type" class="filter-label">{{ 'admin.audit.filter_target_type' | transloco }}</label>
        <input
          id="tgt-type"
          pInputText
          [(ngModel)]="filterTargetType"
          [placeholder]="'admin.audit.filter_target_type_ph' | transloco"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="filter-field">
        <label for="tgt-id" class="filter-label">{{ 'admin.audit.filter_target_id' | transloco }}</label>
        <input
          id="tgt-id"
          pInputText
          [(ngModel)]="filterTargetId"
          (keyup.enter)="reload()"
        />
      </div>
      <div class="filter-actions">
        <p-button
          [label]="'admin.common.apply' | transloco"
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
          <th class="col--when">{{ 'admin.audit.col_when' | transloco }}</th>
          <th>{{ 'admin.audit.col_actor' | transloco }}</th>
          <th>{{ 'admin.audit.col_action' | transloco }}</th>
          <th>{{ 'admin.audit.col_target' | transloco }}</th>
          <th>{{ 'admin.audit.col_details' | transloco }}</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-a>
        <tr>
          <td>{{ a.created_at | apiDate: 'medium' }}</td>
          <td>{{ a.actor_user_id }}</td>
          <td><p-tag severity="secondary" [value]="a.action" /></td>
          <td>
            <div class="target-cell">
              <div>{{ a.target_type }}</div>
              <code class="id-code">{{ a.target_id }}</code>
            </div>
          </td>
          <td
            class="diff-cell"
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
              [title]="'admin.audit.empty_title' | transloco"
              [message]="'admin.audit.empty_message' | transloco"
            />
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  styleUrl: './admin-audit.component.scss',
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
