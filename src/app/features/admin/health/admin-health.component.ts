import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
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
    CardModule,
    ButtonModule,
    TagModule,
    ApiDatePipe,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      icon="pi-heart"
      title="Santé du système"
      subtitle="Validation configuration, statistiques DB et monitoring Celery"
    >
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

    <div class="grid">
      <div class="col-12 lg:col-4">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center justify-content-between p-3">
              <strong>Validation configuration</strong>
              @if (checks(); as c) {
                <p-tag [severity]="checksSeverity()" [value]="c.status" />
              }
            </div>
          </ng-template>
          @if (checks(); as c) {
            <div class="flex flex-column gap-2 text-sm">
              @for (entry of checkEntries(c); track entry.key) {
                <div class="flex align-items-center justify-content-between gap-2">
                  <code>{{ entry.key }}</code>
                  <span class="text-color-secondary">{{ entry.value }}</span>
                </div>
              }
            </div>
          } @else {
            <span class="text-color-secondary">Chargement…</span>
          }
        </p-card>
      </div>

      <div class="col-12 lg:col-4">
        <p-card header="Base de données">
          @if (db(); as d) {
            <div class="flex flex-column gap-2 text-sm">
              <div><strong>Jobs en échec :</strong> {{ d.failed_jobs }}</div>
              <div>
                <strong>Dernière exécution :</strong>
                {{ d.last_execution_at | apiDate: 'medium' }}
              </div>
              <div>
                <strong>Abonnements Graph expirant :</strong>
                {{ d.graph_subscriptions_expiring }}
              </div>
              <hr />
              <strong>Tables</strong>
              @for (entry of dbTableEntries(d); track entry.name) {
                <div class="flex align-items-center justify-content-between">
                  <code>{{ entry.name }}</code>
                  <span>{{ entry.count }}</span>
                </div>
              }
            </div>
          } @else {
            <span class="text-color-secondary">Chargement…</span>
          }
        </p-card>
      </div>

      <div class="col-12 lg:col-4">
        <p-card header="Monitoring jobs">
          @if (monitoring(); as m) {
            <div class="flex flex-column gap-2 text-sm">
              <div><strong>Total :</strong> {{ m.jobs.total }}</div>
              <div><strong>En file :</strong> {{ m.jobs.queued }}</div>
              <div><strong>En cours :</strong> {{ m.jobs.running }}</div>
              <div class="text-red-500">
                <strong>Échoués :</strong> {{ m.jobs.failed }}
              </div>
              <div class="text-orange-500">
                <strong>Bloqués :</strong> {{ m.jobs.stuck }}
              </div>
              @if (m.jobs.average_duration_seconds !== null && m.jobs.average_duration_seconds !== undefined) {
                <div>
                  <strong>Durée moyenne :</strong>
                  {{ m.jobs.average_duration_seconds | number: '1.0-2' }}s
                </div>
              }
              <hr />
              <div>
                <strong>Graph expirant bientôt :</strong>
                {{ m.graph.subscriptions_expiring }} (&lt; {{ m.graph.expiring_within_hours }} h)
              </div>
            </div>
          } @else {
            <span class="text-color-secondary">Chargement…</span>
          }
        </p-card>
      </div>
    </div>
  `,
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
