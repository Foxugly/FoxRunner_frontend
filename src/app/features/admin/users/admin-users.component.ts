import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
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
    ButtonModule,
    TooltipModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    DataTableComponent,
    CellTemplateDirective,
  ],
  template: `
    <app-page-header icon="pi-users" title="Utilisateurs" subtitle="Gestion des comptes">
      <p-button
        label="Retour admin"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/admin"
      />
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
    </app-page-header>

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
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly service = inject(AdminService);
  private readonly messages = inject(MessageService);

  readonly items = signal<UserSummary[]>([]);
  readonly loading = signal(false);

  readonly columns: DataTableColumn[] = [
    { field: 'email', header: 'Email', sortable: true },
    { field: 'id', header: 'UUID', width: '18rem', searchable: false },
    { field: 'timezone_name', header: 'Fuseau', sortable: true },
    { field: 'is_active', header: 'Actif', width: '6rem', searchable: false },
    { field: 'is_superuser', header: 'Superuser', width: '8rem', searchable: false },
    { field: 'is_verified', header: 'Vérifié', width: '7rem', searchable: false },
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
        summary: 'Utilisateur mis à jour',
        detail: `${user.email} · ${field}=${value}`,
        life: 2500,
      });
    } catch {
      // Optimistic rollback on failure.
      user[field] = !value;
    }
  }
}
