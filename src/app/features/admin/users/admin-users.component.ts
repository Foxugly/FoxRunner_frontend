import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { AdminService } from '../../../core/api/admin.service';
import type { UserSummary } from '../../../core/api/types';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TranslocoPipe,
    ButtonModule,
    CheckboxModule,
    TooltipModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    DataTableComponent,
    CellTemplateDirective,
  ],
  template: `
    <app-page-header icon="pi-users" [title]="'admin.users.title' | transloco">
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
        [outlined]="true"
        severity="secondary"
        [loading]="loading()"
        (onClick)="reload()"
        [pTooltip]="'common.refresh' | transloco"
      />
    </app-page-header>

    <div class="table-toolbar">
      <p-checkbox
        inputId="incInactive"
        [binary]="true"
        [ngModel]="includeInactive()"
        (ngModelChange)="includeInactive.set($event)"
      />
      <label for="incInactive">{{ 'admin.users.include_inactive' | transloco }}</label>
    </div>

    <app-data-table
      [value]="visibleItems()"
      [columns]="columns"
      [loading]="loading()"
      dataKey="id"
      emptyIcon="pi-users"
      [emptyTitle]="'admin.users.empty_title' | transloco"
    >
      <ng-template appCell="id" let-u><code class="id-code">{{ u.id }}</code></ng-template>
      <ng-template appCell="is_active" let-u>
        <p-toggleswitch
          [(ngModel)]="u.is_active"
          (onChange)="updateFlag(u, 'is_active', u.is_active)"
          [ariaLabel]="'admin.users.aria_active' | transloco: { email: u.email }"
        />
      </ng-template>
      <ng-template appCell="is_superuser" let-u>
        <p-toggleswitch
          [(ngModel)]="u.is_superuser"
          (onChange)="updateFlag(u, 'is_superuser', u.is_superuser)"
          [ariaLabel]="'admin.users.aria_superuser' | transloco: { email: u.email }"
        />
      </ng-template>
      <ng-template appCell="is_verified" let-u>
        <p-toggleswitch
          [(ngModel)]="u.is_verified"
          (onChange)="updateFlag(u, 'is_verified', u.is_verified)"
          [ariaLabel]="'admin.users.aria_verified' | transloco: { email: u.email }"
        />
      </ng-template>
    </app-data-table>
  `,
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly service = inject(AdminService);
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(TranslocoService);

  readonly items = signal<UserSummary[]>([]);
  readonly loading = signal(false);

  /** §218: inactive (deactivated) users are hidden until this is checked. */
  readonly includeInactive = signal(false);
  readonly visibleItems = computed(() =>
    this.includeInactive() ? this.items() : this.items().filter((u) => u.is_active),
  );

  readonly columns: DataTableColumn[] = [
    { field: 'email', header: this.i18n.translate('admin.users.col_email'), sortable: true },
    { field: 'id', header: this.i18n.translate('admin.users.col_uuid'), width: '18rem', searchable: false },
    { field: 'timezone_name', header: this.i18n.translate('admin.users.col_timezone'), sortable: true },
    { field: 'is_active', header: this.i18n.translate('admin.users.col_active'), width: '6rem', searchable: false },
    { field: 'is_superuser', header: this.i18n.translate('admin.users.col_superuser'), width: '8rem', searchable: false },
    { field: 'is_verified', header: this.i18n.translate('admin.users.col_verified'), width: '7rem', searchable: false },
  ];

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

  async updateFlag(
    user: UserSummary,
    field: 'is_active' | 'is_superuser' | 'is_verified',
    value: boolean,
  ): Promise<void> {
    try {
      await this.service.updateUser(user.id, { [field]: value });
      this.messages.add({
        severity: 'success',
        summary: this.i18n.translate('admin.users.toast_updated'),
        detail: `${user.email} · ${field}=${value}`,
        life: 2500,
      });
    } catch {
      // Optimistic rollback on failure.
      user[field] = !value;
    }
  }
}
