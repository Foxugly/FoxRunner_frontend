import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth/auth.service';
import { PlanService } from '../../core/api/plan.service';
import type { Plan } from '../../core/api/types';
import { ApiDatePipe } from '../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-plan',
  standalone: true,
  imports: [
    RouterLink,
    CardModule,
    ButtonModule,
    TagModule,
    ApiDatePipe,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      icon="pi-clock"
      title="Plan"
    >
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
    </app-page-header>

    @if (plan(); as p) {
      <p-card>
        <div class="flex flex-column gap-3">
          <div class="flex align-items-center gap-3">
            <i class="pi pi-clock" style="font-size: 2rem; color: var(--fox-primary)"></i>
            <div>
              <div class="text-xl font-semibold">
                {{ p.slot_id }} — {{ p.scenario_id }}
              </div>
              <div class="text-color-secondary">
                Prévu le {{ p.scheduled_for | apiDate: 'medium' }}
              </div>
            </div>
          </div>
          @if (countdown(); as c) {
            <div class="text-2xl font-mono">
              <i class="pi pi-stopwatch mr-2"></i>{{ c }}
            </div>
          }
          <div class="flex flex-wrap gap-2 text-sm">
            <p-tag value="Fuseau : {{ p.timezone }}" severity="secondary" />
            @if (p.requires_enterprise_network) {
              <p-tag value="Réseau entreprise requis" severity="warn" />
            }
            <p-tag value="Steps : {{ p.steps }}" severity="secondary" />
            @if (p.before_steps > 0) {
              <p-tag value="Before : {{ p.before_steps }}" severity="secondary" />
            }
          </div>
        </div>
      </p-card>
    } @else if (!loading()) {
      <app-empty-state
        icon="pi-calendar-plus"
        title="Aucun créneau planifié"
        message="Ajoute des créneaux actifs depuis un scénario (section Planification) pour alimenter le planning."
      >
        <p-button label="Voir les scénarios" icon="pi pi-sitemap" routerLink="/scenarios" />
      </app-empty-state>
    }
  `,
})
export class PlanComponent implements OnInit, OnDestroy {
  private readonly service = inject(PlanService);
  private readonly auth = inject(AuthService);

  readonly plan = signal<Plan | null>(null);
  readonly loading = signal(false);
  readonly countdown = signal<string>('');
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      const p = await this.service.getPlan(me.id);
      this.plan.set(p);
      this.refreshCountdown();
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      if (p) this.countdownTimer = setInterval(() => this.refreshCountdown(), 1000);
    } catch {
      this.plan.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private refreshCountdown(): void {
    const p = this.plan();
    if (!p) {
      this.countdown.set('');
      return;
    }
    const target = new Date(p.scheduled_for).getTime();
    const delta = target - Date.now();
    if (delta <= 0) {
      this.countdown.set('En attente du scheduler…');
      return;
    }
    const hours = Math.floor(delta / 3_600_000);
    const mins = Math.floor((delta % 3_600_000) / 60_000);
    const secs = Math.floor((delta % 60_000) / 1000);
    this.countdown.set(
      `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`,
    );
  }
}
