import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../../core/auth/auth.service';
import { JobsService } from '../../../core/api/jobs.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { StepCollectionsService } from '../../../core/api/step-collections.service';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import {
  STEP_COLLECTIONS,
  STEP_COLLECTION_LABELS_FR,
  type ScenarioDetail,
  type StepCollectionName,
} from '../../../core/api/types';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SharesDialogComponent } from '../shares/shares-dialog.component';
import { ScenarioSlotsComponent } from './scenario-slots.component';

@Component({
  selector: 'app-scenario-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    CardModule,
    TabsModule,
    TagModule,
    ConfirmDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
    SharesDialogComponent,
    ScenarioSlotsComponent,
  ],
  template: `
    <app-page-header
      [icon]="'pi-sitemap'"
      [title]="scenario()?.scenario_id ?? 'Scénario'"
    >
      <p-button
        label="Retour"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/scenarios"
      />
      <p-button
        label="Exécuter (dry-run)"
        icon="pi pi-play"
        severity="secondary"
        [loading]="running()"
        [disabled]="!scenario() || running()"
        (onClick)="triggerRun(true)"
      />
      <p-button
        label="Exécuter (réel)"
        icon="pi pi-bolt"
        severity="warn"
        [loading]="running()"
        [disabled]="!scenario() || running()"
        (onClick)="confirmRealRun()"
      />
      <p-button
        label="Exporter JSON"
        icon="pi pi-download"
        severity="secondary"
        [text]="true"
        [disabled]="!scenario()"
        (onClick)="exportJson()"
      />
      @if (isWritable()) {
        <p-button
          label="Éditer"
          icon="pi pi-pencil"
          [routerLink]="['/scenarios', scenario()?.scenario_id, 'edit']"
        />
        <p-button
          label="Éditer les steps"
          icon="pi pi-code"
          severity="secondary"
          [routerLink]="['/scenarios', scenario()?.scenario_id, 'steps']"
        />
        @if (isOwner()) {
          <p-button
            label="Partages"
            icon="pi pi-share-alt"
            severity="secondary"
            (onClick)="sharesOpen = true"
          />
        }
      }
    </app-page-header>

    <app-shares-dialog
      [scenarioId]="scenario()?.scenario_id ?? ''"
      [(visible)]="sharesOpen"
    />

    @if (scenario(); as s) {
      <div class="grid">
        <div class="col-12 md:col-6">
          <p-card header="Métadonnées">
            <div class="flex flex-column gap-2 text-sm">
              <div><strong>Propriétaire :</strong> {{ s.owner_user_id }}</div>
              <div>
                <strong>Rôle :</strong>
                @if (s.role === 'owner') {
                  <p-tag severity="success" value="Propriétaire" />
                } @else {
                  <p-tag severity="info" [value]="s.role" />
                }
              </div>
              <div>
                <strong>Réseau entreprise requis :</strong>
                {{ s.requires_enterprise_network ? 'Oui' : 'Non' }}
              </div>
              <div>
                <strong>Écriture :</strong>
                {{ s.writable ? 'Oui' : 'Non (lecture seule)' }}
              </div>
            </div>
          </p-card>
        </div>
        <div class="col-12 md:col-6">
          <p-card header="Décompte d'étapes">
            <div class="grid text-center">
              <div class="col-6 md:col-4">
                <div class="text-2xl font-semibold">{{ s.before_steps }}</div>
                <div class="text-color-secondary text-sm">before_steps</div>
              </div>
              <div class="col-6 md:col-4">
                <div class="text-2xl font-semibold">{{ s.steps }}</div>
                <div class="text-color-secondary text-sm">steps</div>
              </div>
              <div class="col-6 md:col-4">
                <div class="text-2xl font-semibold">{{ s.on_success }}</div>
                <div class="text-color-secondary text-sm">on_success</div>
              </div>
              <div class="col-6 md:col-4">
                <div class="text-2xl font-semibold">{{ s.on_failure }}</div>
                <div class="text-color-secondary text-sm">on_failure</div>
              </div>
              <div class="col-6 md:col-4">
                <div class="text-2xl font-semibold">{{ s.finally_steps }}</div>
                <div class="text-color-secondary text-sm">finally_steps</div>
              </div>
            </div>
          </p-card>
        </div>
      </div>

      <p-card header="Step collections" styleClass="mt-3">
        <p-tabs [value]="'before_steps'">
          <p-tablist>
            @for (col of collections; track col) {
              <p-tab [value]="col">
                {{ labelFor(col) }} ({{ stepsByCollection()[col]?.length ?? 0 }})
              </p-tab>
            }
          </p-tablist>
          <p-tabpanels>
            @for (col of collections; track col) {
              <p-tabpanel [value]="col">
                @if ((stepsByCollection()[col]?.length ?? 0) === 0) {
                  <app-empty-state
                    icon="pi-code"
                    title="Aucune étape"
                    [message]="'La collection ' + col + ' est vide.'"
                  />
                } @else {
                  <div class="flex flex-column gap-2">
                    @for (step of stepsByCollection()[col]; track $index) {
                      <div class="p-3 border-1 surface-border border-round">
                        <div class="flex align-items-center justify-content-between gap-2">
                          <div class="flex align-items-center gap-2">
                            <p-tag severity="secondary" [value]="'#' + $index" />
                            <strong>{{ stepType(step) }}</strong>
                          </div>
                          <small class="text-color-secondary">{{ stepSummary(step) }}</small>
                        </div>
                      </div>
                    }
                  </div>
                }
              </p-tabpanel>
            }
          </p-tabpanels>
        </p-tabs>
      </p-card>

      <p-card styleClass="mt-3">
        <app-scenario-slots [scenarioId]="s.scenario_id" [canEdit]="isWritable()" />
      </p-card>
    } @else if (!loading()) {
      <app-empty-state
        icon="pi-exclamation-triangle"
        title="Scénario introuvable"
        message="Vérifie l'identifiant dans l'URL."
      />
    }

    <p-confirmDialog />
  `,
})
export class ScenarioDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly scenariosService = inject(ScenariosService);
  private readonly stepsService = inject(StepCollectionsService);
  private readonly jobs = inject(JobsService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly collections = STEP_COLLECTIONS;
  readonly scenario = signal<ScenarioDetail | null>(null);
  readonly stepsByCollection = signal<Record<StepCollectionName, Record<string, unknown>[]>>({
    before_steps: [],
    steps: [],
    on_success: [],
    on_failure: [],
    finally_steps: [],
  });
  readonly loading = signal(true);
  readonly running = signal(false);

  readonly isWritable = computed(() => this.scenario()?.writable === true);
  readonly isOwner = computed(() => this.scenario()?.role === 'owner');
  sharesOpen = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) void this.load(id);
  }

  labelFor(col: StepCollectionName): string {
    return STEP_COLLECTION_LABELS_FR[col];
  }

  stepType(step: Record<string, unknown>): string {
    return (step['type'] as string | undefined) ?? 'step';
  }

  stepSummary(step: Record<string, unknown>): string {
    const keys = Object.keys(step).filter((k) => k !== 'type');
    if (keys.length === 0) return '';
    return keys
      .slice(0, 3)
      .map((k) => {
        const v = step[k];
        const str = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return `${k}=${str.length > 30 ? str.slice(0, 30) + '…' : str}`;
      })
      .join(' · ');
  }

  private async load(scenarioId: string): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      const [detail, steps] = await Promise.all([
        this.scenariosService.get(me.id, scenarioId),
        this.stepsService.getAll(me.id, scenarioId).catch(() => null),
      ]);
      this.scenario.set(detail);
      if (steps) {
        this.stepsByCollection.set({
          before_steps: steps.before_steps ?? [],
          steps: steps.steps ?? [],
          on_success: steps.on_success ?? [],
          on_failure: steps.on_failure ?? [],
          finally_steps: steps.finally_steps ?? [],
        });
      }
    } catch {
      this.scenario.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  confirmRealRun(): void {
    const s = this.scenario();
    if (!s) return;
    this.confirm.confirm({
      header: 'Exécuter en réel ?',
      message: `Le scénario « ${s.scenario_id} » va être exécuté immédiatement (effets externes non-simulés).`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Exécuter',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'warn' },
      accept: () => this.triggerRun(false),
    });
  }

  async triggerRun(dryRun: boolean): Promise<void> {
    const s = this.scenario();
    const me = this.auth.currentUser();
    if (!s || !me) return;
    this.running.set(true);
    try {
      const job = await this.jobs.trigger(me.id, s.scenario_id, dryRun, newIdempotencyKey());
      this.messages.add({
        severity: 'success',
        summary: dryRun ? 'Dry-run lancé' : 'Exécution lancée',
        detail: `Job ${job.job_id}`,
        life: 4000,
      });
      this.router.navigate(['/jobs', job.job_id]);
    } catch {
      /* toast */
    } finally {
      this.running.set(false);
    }
  }

  /** Download the scenario (id + description + DSL definition) as a JSON file,
   * re-importable via the scenarios list "Importer". */
  exportJson(): void {
    const s = this.scenario();
    if (!s) return;
    const payload = {
      schema: 'foxrunner.scenario/1',
      scenario_id: s.scenario_id,
      description: s.description,
      definition: s.definition,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.scenario_id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    this.messages.add({ severity: 'success', summary: 'Scénario exporté', detail: `${s.scenario_id}.json`, life: 3000 });
  }
}
