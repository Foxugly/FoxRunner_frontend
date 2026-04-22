import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { AdminService } from '../../../core/api/admin.service';
import type { UserSummary } from '../../../core/api/types';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    EmptyStateComponent,
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

    <p-table
      [value]="items()"
      [lazy]="true"
      [paginator]="true"
      [rows]="rows()"
      [first]="first()"
      [totalRecords]="total()"
      [loading]="loading()"
      (onLazyLoad)="onLazyLoad($event)"
      [rowsPerPageOptions]="[10, 25, 50]"
      dataKey="id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Email</th>
          <th style="width: 18rem">UUID</th>
          <th>Fuseau</th>
          <th style="width: 6rem">Actif</th>
          <th style="width: 8rem">Superuser</th>
          <th style="width: 7rem">Vérifié</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-u>
        <tr>
          <td>{{ u.email }}</td>
          <td><code class="text-xs">{{ u.id }}</code></td>
          <td>{{ u.timezone_name }}</td>
          <td>
            <p-toggleswitch
              [(ngModel)]="u.is_active"
              (onChange)="updateFlag(u, 'is_active', u.is_active)"
            />
          </td>
          <td>
            <p-toggleswitch
              [(ngModel)]="u.is_superuser"
              (onChange)="updateFlag(u, 'is_superuser', u.is_superuser)"
            />
          </td>
          <td>
            <p-toggleswitch
              [(ngModel)]="u.is_verified"
              (onChange)="updateFlag(u, 'is_verified', u.is_verified)"
            />
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6">
            <app-empty-state icon="pi-users" title="Aucun utilisateur" />
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly service = inject(AdminService);
  private readonly messages = inject(MessageService);

  readonly items = signal<UserSummary[]>([]);
  readonly total = signal(0);
  readonly rows = signal(25);
  readonly first = signal(0);
  readonly loading = signal(false);

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
    void this.load(this.first(), this.rows());
  }

  private async load(offset: number, limit: number): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.service.listUsers(limit, offset);
      this.items.set(page.items);
      this.total.set(page.total);
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
