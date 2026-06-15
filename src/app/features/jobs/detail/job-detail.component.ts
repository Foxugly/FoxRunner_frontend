import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { AuthService } from '../../../core/auth/auth.service';
import { JobsService } from '../../../core/api/jobs.service';
import type { Job, JobEvent } from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusTagComponent } from '../../../shared/components/status-tag/status-tag.component';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    TimelineModule,
    ApiDatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
    StatusTagComponent,
  ],
  template: `
    <app-page-header
      icon="pi-play"
      [title]="'Job ' + (jobIdShort() || '…')"
    >
      <p-button
        label="Retour"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/jobs"
      />
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
      @if (job()?.status === 'queued' || job()?.status === 'running') {
        <p-button
          label="Annuler"
          icon="pi pi-times"
          severity="danger"
          [loading]="acting()"
          (onClick)="cancel()"
        />
      }
      @if (job()?.status === 'failed' || job()?.status === 'cancelled') {
        <p-button
          label="Relancer"
          icon="pi pi-refresh"
          severity="secondary"
          [loading]="acting()"
          (onClick)="retry()"
        />
      }
    </app-page-header>

    @if (job(); as j) {
      <div class="grid">
        <div class="col-12 md:col-6">
          <p-card header="État">
            <div class="flex flex-column gap-2 text-sm">
              <div>
                <strong>Statut :</strong> <app-status-tag [status]="j.status" />
              </div>
              <div><strong>Kind :</strong> {{ j.kind }}</div>
              <div><strong>Dry-run :</strong> {{ j.dry_run ? 'Oui' : 'Non' }}</div>
              <div><strong>Créé le :</strong> {{ j.created_at | apiDate: 'medium' }}</div>
              <div><strong>Démarré le :</strong> {{ j.started_at | apiDate: 'medium' }}</div>
              <div><strong>Terminé le :</strong> {{ j.finished_at | apiDate: 'medium' }}</div>
              @if (j.exit_code !== null && j.exit_code !== undefined) {
                <div><strong>Exit code :</strong> {{ j.exit_code }}</div>
              }
              @if (j.error) {
                <div class="text-red-500"><strong>Erreur :</strong> {{ j.error }}</div>
              }
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6">
          <p-card header="Contexte">
            <div class="text-sm">
              <div><strong>Job ID :</strong> <code>{{ j.job_id }}</code></div>
              <div><strong>Target :</strong> <code>{{ j.target_id }}</code></div>
              <div><strong>Utilisateur :</strong> <code>{{ j.user_id }}</code></div>
              @if (j.celery_task_id) {
                <div><strong>Celery task :</strong> <code>{{ j.celery_task_id }}</code></div>
              }
            </div>
          </p-card>
        </div>
      </div>

      <p-card header="Timeline" styleClass="mt-3">
        @if (events().length === 0) {
          <app-empty-state
            icon="pi-clock"
            title="Aucun événement"
            message="Les événements apparaîtront ici pendant et après l'exécution."
          />
        } @else {
          <p-timeline [value]="events()" align="left">
            <ng-template pTemplate="marker" let-e>
              <span
                class="flex w-2rem h-2rem align-items-center justify-content-center border-circle"
                [class]="markerClass(e)"
              >
                <i [class]="'pi ' + markerIcon(e)"></i>
              </span>
            </ng-template>
            <ng-template pTemplate="content" let-e>
              <div class="ml-2">
                <div class="flex align-items-center gap-2">
                  <strong>{{ e.event_type }}</strong>
                  <small class="text-color-secondary">{{ e.created_at | apiDate: 'medium' }}</small>
                </div>
                @if (e.step) {
                  <div class="text-sm"><em>Étape : {{ e.step }}</em></div>
                }
                <div class="text-sm">{{ e.message }}</div>
              </div>
            </ng-template>
          </p-timeline>
        }
      </p-card>
    } @else if (!loading()) {
      <app-empty-state
        icon="pi-exclamation-triangle"
        title="Job introuvable"
        message="Vérifie l'identifiant dans l'URL."
      />
    }
  `,
})
export class JobDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(JobsService);
  private readonly auth = inject(AuthService);
  private readonly messages = inject(MessageService);

  readonly job = signal<Job | null>(null);
  readonly events = signal<JobEvent[]>([]);
  readonly loading = signal(false);
  readonly acting = signal(false);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private jobId = '';

  ngOnInit(): void {
    this.jobId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.jobId) void this.load();
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  jobIdShort(): string {
    return this.jobId ? this.jobId.slice(0, 8) + '…' : '';
  }

  markerClass(e: JobEvent): string {
    const level = (e.level || 'info').toLowerCase();
    if (level === 'error' || level === 'critical') return 'bg-red-500 text-white';
    if (level === 'warn' || level === 'warning') return 'bg-orange-500 text-white';
    if (level === 'debug') return 'bg-gray-400 text-white';
    return 'bg-primary text-white';
  }

  markerIcon(e: JobEvent): string {
    const level = (e.level || 'info').toLowerCase();
    if (level === 'error' || level === 'critical') return 'pi-times';
    if (level === 'warn' || level === 'warning') return 'pi-exclamation-triangle';
    if (level === 'debug') return 'pi-circle';
    return 'pi-info-circle';
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      const [j, ev] = await Promise.all([
        this.service.get(this.jobId, me.id),
        this.service.events(this.jobId, me.id).catch(() => [] as JobEvent[]),
      ]);
      this.job.set(j);
      this.events.set(ev);
      if (j.status === 'queued' || j.status === 'running') this.startAutoRefresh();
      else this.stopAutoRefresh();
    } catch {
      this.job.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private startAutoRefresh(): void {
    if (this.refreshTimer) return;
    this.refreshTimer = setInterval(() => this.reload(), 5_000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  async cancel(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.acting.set(true);
    try {
      await this.service.cancel(this.jobId, me.id);
      this.messages.add({
        severity: 'success',
        summary: 'Job annulé',
        detail: this.jobId,
        life: 3000,
      });
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.acting.set(false);
    }
  }

  async retry(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.acting.set(true);
    try {
      await this.service.retry(this.jobId, me.id);
      this.messages.add({
        severity: 'success',
        summary: 'Job relancé',
        detail: this.jobId,
        life: 3000,
      });
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.acting.set(false);
    }
  }
}
