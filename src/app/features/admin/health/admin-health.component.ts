import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AdminService } from '../../../core/api/admin.service';
import type {
  ConfigChecks,
  DbStats,
  MonitoringSummaryData,
} from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

type Severity = 'success' | 'warn' | 'danger' | 'info' | 'secondary';

@Component({
  selector: 'app-admin-health',
  standalone: true,
  imports: [
    DecimalPipe,
    RouterLink,
    TranslocoPipe,
    CardModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ApiDatePipe,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header icon="pi-heart" [title]="'admin.health.title' | transloco">
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

    <div class="cards-grid">
      <div>
        <p-card>
          <ng-template pTemplate="header">
            <div class="card-head">
              <strong>{{ 'admin.health.config_title' | transloco }}</strong>
              @if (checks(); as c) {
                <p-tag [severity]="checksSeverity()" [value]="c.status" />
              }
            </div>
          </ng-template>
          @if (checks(); as c) {
            <div class="stat-list">
              @for (entry of checkEntries(c); track entry.key) {
                <div class="kv-row">
                  <code>{{ entry.key }}</code>
                  <span class="muted">{{ entry.value }}</span>
                </div>
              }
            </div>
          } @else {
            <span class="muted">{{ 'admin.common.loading' | transloco }}</span>
          }
        </p-card>
      </div>

      <div>
        <p-card [header]="'admin.health.db_title' | transloco">
          @if (db(); as d) {
            <div class="stat-list">
              <div><strong>{{ 'admin.health.db_failed_jobs' | transloco }}</strong> {{ d.failed_jobs }}</div>
              <div>
                <strong>{{ 'admin.health.db_last_execution' | transloco }}</strong>
                {{ d.last_execution_at | apiDate: 'medium' }}
              </div>
              <div>
                <strong>{{ 'admin.health.db_graph_expiring' | transloco }}</strong>
                {{ d.graph_subscriptions_expiring }}
              </div>
              <hr />
              <strong>{{ 'admin.health.db_tables' | transloco }}</strong>
              @for (entry of dbTableEntries(d); track entry.name) {
                <div class="kv-row-flush">
                  <code>{{ entry.name }}</code>
                  <span>{{ entry.count }}</span>
                </div>
              }
            </div>
          } @else {
            <span class="muted">{{ 'admin.common.loading' | transloco }}</span>
          }
        </p-card>
      </div>

      <div>
        <p-card [header]="'admin.health.monitoring_title' | transloco">
          @if (monitoring(); as m) {
            <div class="stat-list">
              <div><strong>{{ 'admin.health.mon_total' | transloco }}</strong> {{ m.jobs.total }}</div>
              <div><strong>{{ 'admin.health.mon_queued' | transloco }}</strong> {{ m.jobs.queued }}</div>
              <div><strong>{{ 'admin.health.mon_running' | transloco }}</strong> {{ m.jobs.running }}</div>
              <div class="danger">
                <strong>{{ 'admin.health.mon_failed' | transloco }}</strong> {{ m.jobs.failed }}
              </div>
              <div class="warn">
                <strong>{{ 'admin.health.mon_stuck' | transloco }}</strong> {{ m.jobs.stuck }}
              </div>
              @if (m.jobs.average_duration_seconds !== null && m.jobs.average_duration_seconds !== undefined) {
                <div>
                  <strong>{{ 'admin.health.mon_avg_duration' | transloco }}</strong>
                  {{ m.jobs.average_duration_seconds | number: '1.0-2' }}s
                </div>
              }
              <hr />
              <div>
                <strong>{{ 'admin.health.mon_graph_expiring' | transloco }}</strong>
                {{ m.graph.subscriptions_expiring }}
                {{ 'admin.health.mon_within_hours' | transloco: { hours: m.graph.expiring_within_hours } }}
              </div>
            </div>
          } @else {
            <span class="muted">{{ 'admin.common.loading' | transloco }}</span>
          }
        </p-card>
      </div>
    </div>
  `,
  styleUrl: './admin-health.component.scss',
})
export class AdminHealthComponent implements OnInit {
  private readonly service = inject(AdminService);

  readonly checks = signal<ConfigChecks | null>(null);
  readonly db = signal<DbStats | null>(null);
  readonly monitoring = signal<MonitoringSummaryData | null>(null);
  readonly loading = signal(false);

  readonly checksSeverity = computed<Severity>(() => {
    const status = this.checks()?.status?.toLowerCase() ?? '';
    if (status === 'ok' || status === 'valid') return 'success';
    if (status === 'warn' || status === 'warning' || status === 'degraded') return 'warn';
    if (status === 'error' || status === 'fail' || status === 'invalid') return 'danger';
    return 'secondary';
  });

  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  checkEntries(c: ConfigChecks): { key: string; value: string }[] {
    return Object.entries(c.checks).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    }));
  }

  dbTableEntries(d: DbStats): { name: string; count: number }[] {
    return Object.entries(d.tables)
      .map(([name, count]) => ({ name, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [c, d, m] = await Promise.all([
        this.service.configChecks().catch(() => null),
        this.service.dbStats().catch(() => null),
        this.service.monitoringSummary().catch(() => null),
      ]);
      this.checks.set(c);
      this.db.set(d);
      this.monitoring.set(m);
    } finally {
      this.loading.set(false);
    }
  }
}
