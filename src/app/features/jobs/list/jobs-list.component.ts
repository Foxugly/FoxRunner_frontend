import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../../core/auth/auth.service';
import { JobsService } from '../../../core/api/jobs.service';
import type { Job } from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusTagComponent } from '../../../shared/components/status-tag/status-tag.component';

@Component({
  selector: 'app-jobs-list',
  standalone: true,
  imports: [
    RouterLink,
    TableModule,
    ButtonModule,
    TooltipModule,
    ApiDatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusTagComponent,
  ],
  template: `
    <app-page-header icon="pi-play" title="Jobs" subtitle="Exécutions asynchrones des scénarios">
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
        pTooltip="Rafraîchir"
      />
      @if (autoRefreshing()) {
        <span class="text-color-secondary text-sm ml-2">
          <i class="pi pi-sync pi-spin mr-1"></i>auto 10s
        </span>
      }
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
      dataKey="job_id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Job ID</th>
          <th>Scénario</th>
          <th style="width: 7rem">Statut</th>
          <th style="width: 4rem">Dry-run</th>
          <th style="width: 10rem">Créé le</th>
          <th style="width: 10rem">Terminé le</th>
          <th style="width: 7rem">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-j>
        <tr>
          <td>
            <a [routerLink]="['/jobs', j.job_id]" class="font-mono">{{ j.job_id.slice(0, 8) }}…</a>
          </td>
          <td>{{ j.target_id }}</td>
          <td><app-status-tag [status]="j.status" /></td>
          <td>{{ j.dry_run ? 'Oui' : 'Non' }}</td>
          <td>{{ j.created_at | apiDate }}</td>
          <td>{{ j.finished_at | apiDate }}</td>
          <td>
            <div class="flex gap-1">
              <p-button
                icon="pi pi-eye"
                [rounded]="true"
                [text]="true"
                size="small"
                severity="secondary"
                [routerLink]="['/jobs', j.job_id]"
                pTooltip="Détail"
              />
              @if (j.status === 'queued' || j.status === 'running') {
                <p-button
                  icon="pi pi-times"
                  [rounded]="true"
                  [text]="true"
                  size="small"
                  severity="danger"
                  (onClick)="cancelJob(j)"
                  pTooltip="Annuler"
                />
              }
              @if (j.status === 'failed' || j.status === 'cancelled') {
                <p-button
                  icon="pi pi-refresh"
                  [rounded]="true"
                  [text]="true"
                  size="small"
                  severity="secondary"
                  (onClick)="retryJob(j)"
                  pTooltip="Relancer"
                />
              }
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="7">
            <app-empty-state
              icon="pi-inbox"
              title="Aucun job"
              message="Lance un scénario pour voir ses exécutions ici."
            />
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class JobsListComponent implements OnInit, OnDestroy {
  private readonly service = inject(JobsService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);

  readonly items = signal<Job[]>([]);
  readonly total = signal(0);
  readonly rows = signal(25);
  readonly first = signal(0);
  readonly loading = signal(false);
  readonly autoRefreshing = signal(false);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.load(0, this.rows());
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
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
    const me = this.auth.currentUser();
    this.loading.set(true);
    try {
      const page = await this.service.list({
        user_id: me?.id,
        limit,
        offset,
      });
      this.items.set(page.items);
      this.total.set(page.total);
      const hasActive = page.items.some(
        (j) => j.status === 'queued' || j.status === 'running',
      );
      if (hasActive) this.startAutoRefresh();
      else this.stopAutoRefresh();
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) return;
    this.autoRefreshing.set(true);
    this.refreshTimer = setInterval(() => this.reload(), 10_000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.autoRefreshing.set(false);
  }

  async cancelJob(job: Job): Promise<void> {
    try {
      await this.service.cancel(job.job_id, job.user_id);
      this.messages.add({
        severity: 'success',
        summary: 'Job annulé',
        detail: job.job_id,
        life: 3000,
      });
      this.reload();
    } catch {
      /* toast */
    }
  }

  async retryJob(job: Job): Promise<void> {
    try {
      await this.service.retry(job.job_id, job.user_id);
      this.messages.add({
        severity: 'success',
        summary: 'Job relancé',
        detail: job.job_id,
        life: 3000,
      });
      this.reload();
    } catch {
      /* toast */
    }
  }
}
