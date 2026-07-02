import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { HistoryService } from '../../../core/api/history.service';
import { JobsService } from '../../../core/api/jobs.service';
import type { History, Job } from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StatusTagComponent } from '../../../shared/components/status-tag/status-tag.component';

type Source = 'all' | 'job' | 'scheduled';

interface ExecRow {
  key: string;
  source: 'job' | 'scheduled';
  status: string;
  when: string;
  dryRun?: boolean;
  jobId?: string;
  history?: History;
}

interface Opt {
  label: string;
  value: string;
}

const SOURCE_OPTIONS: Opt[] = [
  { label: 'Toutes les sources', value: 'all' },
  { label: 'À la demande', value: 'job' },
  { label: 'Planifié', value: 'scheduled' },
];

const STATUS_OPTIONS: Opt[] = [
  { label: 'Tous les statuts', value: '' },
  { label: 'Réussis', value: 'success' },
  { label: 'Échecs', value: 'failed' },
  { label: 'En cours', value: 'running' },
  { label: 'Annulés', value: 'cancelled' },
];

/**
 * Executions of a single scenario: merges on-demand runs (Jobs, with the live
 * execution view) and scheduled runs (the CLI scheduler's history) for the
 * given `scenarioId`. Same Source / Statut filters as the former global
 * Exécutions page. Embedded in the scenario-detail "Exécutions" tab.
 */
@Component({
  selector: 'app-scenario-executions',
  standalone: true,
  imports: [
    FormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    SelectModule,
    DialogModule,
    TooltipModule,
    ApiDatePipe,
    EmptyStateComponent,
    StatusTagComponent,
  ],
  template: `
    <div class="flex align-items-end gap-3 mb-3 flex-wrap">
      <div class="flex flex-column gap-1">
        <label for="f-source" class="text-sm text-color-secondary">Source</label>
        <p-select inputId="f-source" [options]="sourceOptions" [(ngModel)]="source" optionLabel="label" optionValue="value" [style]="{ width: '14rem' }" (onChange)="reload()" />
      </div>
      <div class="flex flex-column gap-1">
        <label for="f-status" class="text-sm text-color-secondary">Statut</label>
        <p-select inputId="f-status" [options]="statusOptions" [(ngModel)]="status" optionLabel="label" optionValue="value" [style]="{ width: '12rem' }" (onChange)="reload()" />
      </div>
      <p-button icon="pi pi-refresh" severity="secondary" [text]="true" [loading]="loading()" (onClick)="reload()" pTooltip="Rafraîchir" />
    </div>

    @if (truncatedCount(); as n) {
      <div class="mb-3 text-sm text-color-secondary flex align-items-center gap-2">
        <i class="pi pi-info-circle"></i>
        <span>Résultats tronqués (affiche les {{ n }} plus récents).</span>
      </div>
    }

    <p-table
      [value]="rows()"
      [paginator]="rows().length > 0"
      [rows]="25"
      [rowsPerPageOptions]="[25, 50, 100]"
      [loading]="loading()"
      dataKey="key"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 8rem">Statut</th>
          <th style="width: 10rem">Source</th>
          <th style="width: 13rem">Quand</th>
          <th style="width: 9rem"></th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-r>
        <tr class="cursor-pointer" (click)="openRow(r)">
          <td>
            <app-status-tag [status]="r.status" />
            @if (r.dryRun) {
              <p-tag class="ml-2" severity="secondary" value="dry-run" />
            }
          </td>
          <td>
            @if (r.source === 'job') {
              <p-tag severity="secondary" value="à la demande" />
            } @else {
              <p-tag severity="secondary" value="planifié" />
            }
          </td>
          <td>{{ r.when | apiDate: 'medium' }}</td>
          <td class="text-right">
            @if (r.source === 'job' && r.status === 'failed') {
              <span class="text-red-500 text-sm">voir l'échec →</span>
            } @else if (r.source === 'job') {
              <span class="text-primary text-sm">détail →</span>
            } @else {
              <span class="text-color-secondary text-sm">détail</span>
            }
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="4">
            <app-empty-state icon="pi-play" title="Aucune exécution" message="Lance ce scénario ou attends un créneau planifié." />
          </td>
        </tr>
      </ng-template>
    </p-table>

    <!-- Scheduled-run detail (no live timeline exists for scheduler runs) -->
    <p-dialog [modal]="true" [(visible)]="detailOpen" [style]="{ width: '34rem' }" header="Exécution planifiée">
      @if (detail(); as h) {
        <div class="flex flex-column gap-2 text-sm">
          <div><strong>Slot :</strong> {{ h.slot_id }}</div>
          <div><strong>Statut :</strong> <app-status-tag [status]="h.status" /></div>
          <div><strong>Exécuté le :</strong> {{ h.executed_at | apiDate: 'medium' }}</div>
          <div><strong>Étape :</strong> {{ h.step || '—' }}</div>
          <div><strong>Message :</strong></div>
          <div class="p-2 border-1 surface-border border-round" [style.white-space]="'pre-wrap'">{{ h.message || '—' }}</div>
        </div>
      }
    </p-dialog>
  `,
})
export class ScenarioExecutionsComponent implements OnInit {
  /** Scope executions to this scenario. */
  @Input({ required: true }) scenarioId!: string;

  private readonly jobs = inject(JobsService);
  private readonly history = inject(HistoryService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sourceOptions = SOURCE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;
  source: Source = 'all';
  status = '';

  readonly loading = signal(false);
  private readonly all = signal<ExecRow[]>([]);
  readonly rows = computed(() => this.all());
  readonly truncatedCount = signal<number | null>(null);

  readonly detail = signal<History | null>(null);
  detailOpen = false;

  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me || !this.scenarioId) return;
    this.loading.set(true);
    try {
      const wantJobs = this.source !== 'scheduled';
      const wantHistory = this.source !== 'job';
      const status = this.status || undefined;
      const [jobsRes, histRes] = await Promise.allSettled([
        wantJobs
          ? this.jobs.list({ user_id: me.id, scenario_id: this.scenarioId, status, limit: 200, offset: 0 })
          : Promise.resolve(null),
        wantHistory
          ? this.history.list(me.id, { scenario_id: this.scenarioId, status, limit: 200, offset: 0 })
          : Promise.resolve(null),
      ]);
      const rows: ExecRow[] = [];
      if (jobsRes.status === 'fulfilled' && jobsRes.value) {
        rows.push(...jobsRes.value.items.map((j) => this.fromJob(j)));
      }
      if (histRes.status === 'fulfilled' && histRes.value) {
        rows.push(...histRes.value.items.map((h) => this.fromHistory(h)));
      }
      rows.sort((a, b) => Date.parse(b.when) - Date.parse(a.when));
      this.all.set(rows);

      let truncated = false;
      if (jobsRes.status === 'fulfilled' && jobsRes.value && jobsRes.value.total > jobsRes.value.items.length) {
        truncated = true;
      }
      if (histRes.status === 'fulfilled' && histRes.value && histRes.value.total > histRes.value.items.length) {
        truncated = true;
      }
      this.truncatedCount.set(truncated ? rows.length : null);
    } finally {
      this.loading.set(false);
    }
  }

  private fromJob(j: Job): ExecRow {
    return {
      key: `job:${j.job_id}`,
      source: 'job',
      status: j.status,
      when: j.finished_at ?? j.started_at ?? j.created_at,
      dryRun: j.dry_run,
      jobId: j.job_id,
    };
  }

  private fromHistory(h: History): ExecRow {
    return {
      key: `hist:${h.execution_id ?? h.executed_at}:${h.slot_id}`,
      source: 'scheduled',
      status: h.status,
      when: h.executed_at,
      history: h,
    };
  }

  openRow(r: ExecRow): void {
    if (r.source === 'job' && r.jobId) {
      void this.router.navigate(['/jobs', r.jobId]);
    } else if (r.history) {
      this.detail.set(r.history);
      this.detailOpen = true;
    }
  }
}
