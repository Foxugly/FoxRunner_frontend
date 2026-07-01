import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { AuthService } from '../../../core/auth/auth.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import type { ScenarioSummary, ScenarioCreate } from '../../../core/api/types';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-scenarios-list',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    TagModule,
    TooltipModule,
    DialogModule,
    InputTextModule,
    ConfirmDialogModule,
    SkeletonModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header
      icon="pi-sitemap"
      title="Scénarios"
    >
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
        pTooltip="Rafraîchir"
      />
      <p-button
        label="Importer"
        icon="pi pi-upload"
        severity="secondary"
        (onClick)="openImport()"
      />
      <p-button
        label="Nouveau"
        icon="pi pi-plus"
        severity="success"
        routerLink="/scenarios/new"
      />
    </app-page-header>

    @if (loading()) {
      <div class="grid">
        @for (i of skeletons; track i) {
          <div class="col-12 md:col-6 lg:col-4">
            <div class="scn-card scn-card--static border-1 surface-border border-round p-3 flex flex-column gap-3 h-full">
              <div class="flex align-items-start gap-3">
                <p-skeleton shape="circle" size="2.5rem" />
                <div class="flex-1 flex flex-column gap-2">
                  <p-skeleton width="60%" height="1.1rem" />
                  <p-skeleton width="40%" height="0.75rem" />
                </div>
              </div>
              <div class="scn-card__footer">
                <p-skeleton width="6rem" height="1.5rem" borderRadius="16px" />
              </div>
            </div>
          </div>
        }
      </div>
    } @else if (items().length === 0) {
      <app-empty-state
        icon="pi-sitemap"
        title="Aucun scénario"
        subtitle="Crée un premier scénario pour démarrer."
        [tone]="'emerald'"
      >
        <p-button
          label="Créer un scénario"
          icon="pi pi-plus"
          severity="success"
          routerLink="/scenarios/new"
        />
      </app-empty-state>
    } @else {
      <div class="grid">
        @for (s of items(); track s.scenario_id) {
          <div class="col-12 md:col-6 lg:col-4">
            <a
              class="scn-card border-1 surface-border border-round p-3 flex flex-column gap-3 h-full"
              [routerLink]="['/scenarios', s.scenario_id]"
            >
              <div class="flex align-items-start gap-3">
                <span class="scn-card__icon">
                  <i class="pi pi-sitemap"></i>
                </span>
                <div class="flex-1 min-w-0">
                  <h3 class="scn-card__title m-0">{{ s.scenario_id }}</h3>
                  <p class="scn-card__subtitle m-0 mt-1">
                    {{ s.role === 'owner' ? 'Vous êtes propriétaire' : 'Partagé avec vous' }}
                  </p>
                </div>
              </div>
              <div class="scn-card__footer">
                @if (s.role === 'owner') {
                  <p-tag severity="success" value="Propriétaire" />
                } @else {
                  <p-tag severity="secondary" value="Partagé" />
                }
                <i class="pi pi-arrow-right scn-card__arrow"></i>
              </div>
            </a>
          </div>
        }
      </div>
    }

    <p-dialog
      header="Dupliquer le scénario"
      [modal]="true"
      [(visible)]="duplicateOpen"
      [style]="{ width: '420px' }"
    >
      <div class="flex flex-column gap-3">
        <label for="newId">Nouvel identifiant</label>
        <input
          id="newId"
          pInputText
          [(ngModel)]="duplicateNewId"
          placeholder="mon_scenario_v2"
        />
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" (onClick)="closeDuplicate()" />
        <p-button
          label="Dupliquer"
          icon="pi pi-copy"
          [loading]="duplicating()"
          [disabled]="!duplicateNewId || duplicating()"
          (onClick)="runDuplicate()"
        />
      </ng-template>
    </p-dialog>

    <p-dialog
      header="Importer un scénario (JSON)"
      [modal]="true"
      [(visible)]="importOpen"
      [style]="{ width: '40rem' }"
    >
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="importId">Identifiant du scénario</label>
          <input id="importId" pInputText [(ngModel)]="importId" placeholder="mon_scenario" />
          <small class="text-color-secondary">Pré-rempli depuis le JSON ; modifie-le pour importer sous un autre nom.</small>
        </div>
        <div class="flex flex-column gap-2">
          <label for="importFile">Fichier .json (optionnel)</label>
          <input id="importFile" type="file" accept="application/json,.json" (change)="onImportFile($event)" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="importText">…ou colle le JSON</label>
          <textarea id="importText" pInputText [(ngModel)]="importText" rows="10" class="font-mono text-sm"
            placeholder='{ "scenario_id": "...", "description": "...", "definition": { "steps": [] } }'></textarea>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" (onClick)="importOpen = false" />
        <p-button label="Importer" icon="pi pi-upload" [loading]="importing()" [disabled]="!importText.trim() || importing()" (onClick)="runImport()" />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
  styles: [
    `
      .scn-card {
        background: #ffffff;
        color: inherit;
        text-decoration: none;
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease,
          border-color 0.15s ease;
      }
      .scn-card:not(.scn-card--static):hover {
        transform: translateY(-2px);
        border-color: var(--fox-primary);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.15);
      }
      .scn-card__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 9999px;
        background: rgba(16, 185, 129, 0.12);
        color: var(--fox-primary);
      }
      .scn-card__icon i {
        font-size: 1.15rem;
      }
      .scn-card__title {
        font-size: 1rem;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .scn-card__subtitle {
        font-size: 0.8rem;
        color: var(--text-color-secondary);
      }
      .scn-card__footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
      }
      .scn-card__arrow {
        color: var(--fox-primary);
        opacity: 0;
        transform: translateX(-4px);
        transition:
          opacity 0.15s ease,
          transform 0.15s ease;
      }
      .scn-card:hover .scn-card__arrow {
        opacity: 1;
        transform: translateX(0);
      }
    `,
  ],
})
export class ScenariosListComponent implements OnInit {
  private readonly service = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  importOpen = false;
  importText = '';
  importId = '';
  readonly importing = signal(false);

  readonly items = signal<ScenarioSummary[]>([]);
  readonly loading = signal(false);

  /** Placeholder cards rendered while the list loads. */
  readonly skeletons = [0, 1, 2, 3, 4, 5];

  duplicateOpen = false;
  duplicating = signal(false);
  duplicateNewId = '';
  private duplicateSource: ScenarioSummary | null = null;

  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    this.loading.set(true);
    try {
      // Bounded table: load all rows for client-side search/sort (500 is a guard rail).
      const page = await this.service.list(me.id, 500, 0);
      this.items.set(page.items);
      if (page.total > 500) {
        console.warn(`scenarios: ${page.total} rows exceed the 500 client cap; showing first 500.`);
      }
    } catch {
      /* interceptor toasts */
    } finally {
      this.loading.set(false);
    }
  }

  askDuplicate(s: ScenarioSummary): void {
    this.duplicateSource = s;
    this.duplicateNewId = `${s.scenario_id}_copy`;
    this.duplicateOpen = true;
  }

  closeDuplicate(): void {
    this.duplicateOpen = false;
    this.duplicateSource = null;
    this.duplicateNewId = '';
  }

  async runDuplicate(): Promise<void> {
    if (!this.duplicateSource || !this.duplicateNewId) return;
    this.duplicating.set(true);
    try {
      const dup = await this.service.duplicate(
        this.duplicateSource.scenario_id,
        this.duplicateNewId,
      );
      this.messages.add({
        severity: 'success',
        summary: 'Scénario dupliqué',
        detail: dup.scenario_id,
        life: 3000,
      });
      this.closeDuplicate();
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.duplicating.set(false);
    }
  }

  askDelete(s: ScenarioSummary): void {
    this.confirm.confirm({
      header: `Supprimer « ${s.scenario_id} » ?`,
      message: 'Cette action est irréversible. Les slots associés deviendront invalides.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.service.remove(s.scenario_id);
          this.messages.add({
            severity: 'success',
            summary: 'Scénario supprimé',
            detail: s.scenario_id,
            life: 3000,
          });
          this.reload();
        } catch {
          /* toast */
        }
      },
    });
  }

  openImport(): void {
    this.importText = '';
    this.importId = '';
    this.importOpen = true;
  }

  onImportFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.importText = String(reader.result ?? '');
      this.prefillImportId();
    };
    reader.readAsText(file);
  }

  private prefillImportId(): void {
    if (this.importId.trim()) return;
    try {
      const obj = JSON.parse(this.importText) as { scenario_id?: string };
      if (obj.scenario_id) this.importId = obj.scenario_id;
    } catch {
      /* ignored — validated on import */
    }
  }

  async runImport(): Promise<void> {
    const me = this.auth.currentUser();
    if (!me || !this.importText.trim()) return;
    let parsed: Record<string, unknown>;
    try {
      const raw = JSON.parse(this.importText) as unknown;
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        this.messages.add({ severity: 'error', summary: 'JSON invalide', detail: 'Le contenu doit être un objet JSON.', life: 4000 });
        return;
      }
      parsed = raw as Record<string, unknown>;
    } catch {
      this.messages.add({ severity: 'error', summary: 'JSON invalide', detail: 'Contenu illisible.', life: 4000 });
      return;
    }
    // Tolerate either { scenario_id, description, definition } or a raw definition.
    const definition = (parsed['definition'] ?? parsed) as Record<string, unknown>;
    if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
      this.messages.add({ severity: 'error', summary: 'JSON invalide', detail: 'La définition doit être un objet JSON.', life: 4000 });
      return;
    }
    const scenarioId = (this.importId || (parsed['scenario_id'] as string) || '').trim();
    if (!scenarioId) {
      this.messages.add({ severity: 'error', summary: 'Identifiant requis', detail: 'Indique un identifiant de scénario.', life: 4000 });
      return;
    }
    const dto: ScenarioCreate = {
      scenario_id: scenarioId,
      owner_user_id: me.id,
      description: (parsed['description'] as string) ?? '',
      definition,
    };
    this.importing.set(true);
    try {
      await this.service.create(dto, newIdempotencyKey());
      this.messages.add({ severity: 'success', summary: 'Scénario importé', detail: scenarioId, life: 3000 });
      this.importOpen = false;
      this.router.navigate(['/scenarios', scenarioId]);
    } catch {
      /* interceptor toasts (e.g. 409 if the id already exists) */
    } finally {
      this.importing.set(false);
    }
  }
}
