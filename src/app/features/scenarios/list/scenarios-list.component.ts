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
import { AuthService } from '../../../core/auth/auth.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { SlotsService } from '../../../core/api/slots.service';
import { HistoryService } from '../../../core/api/history.service';
import { JobsService } from '../../../core/api/jobs.service';
import type { ScenarioSummary, ScenarioCreate } from '../../../core/api/types';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { StatusTagComponent } from '../../../shared/components/status-tag/status-tag.component';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';

interface LastRun {
  status: string;
  when: string;
}

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
    PageHeaderComponent,
    DataTableComponent,
    CellTemplateDirective,
    StatusTagComponent,
    ApiDatePipe,
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
        routerLink="/scenarios/new"
      />
    </app-page-header>

    <app-data-table
      [value]="items()"
      [columns]="columns"
      [loading]="loading()"
      dataKey="scenario_id"
      emptyIcon="pi-sitemap"
      emptyTitle="Aucun scénario"
      emptyMessage="Crée un premier scénario pour démarrer."
    >
      <ng-template appCell="scenario_id" let-s>
        <a [routerLink]="['/scenarios', s.scenario_id]">{{ s.scenario_id }}</a>
      </ng-template>
      <ng-template appCell="description" let-s>{{ s.description || '—' }}</ng-template>
      <ng-template appCell="slots" let-s>
        @if (slotCounts()[s.scenario_id]; as n) {
          <p-tag severity="secondary" [value]="n + (n > 1 ? ' créneaux' : ' créneau')" />
        } @else {
          <span class="text-color-secondary text-sm">—</span>
        }
      </ng-template>
      <ng-template appCell="last_run" let-s>
        @if (lastRuns()[s.scenario_id]; as lr) {
          <span class="flex align-items-center gap-2">
            <app-status-tag [status]="lr.status" />
            <span class="text-color-secondary text-xs">{{ lr.when | apiDate: 'short' }}</span>
          </span>
        } @else {
          <span class="text-color-secondary text-sm">jamais</span>
        }
      </ng-template>
      <ng-template appCell="role" let-s>
        @if (s.role === 'owner') {
          <p-tag severity="success" value="Propriétaire" />
        } @else {
          <p-tag severity="info" value="Partagé" />
        }
      </ng-template>
      <ng-template appCell="network" let-s>
        @if (s.requires_enterprise_network) {
          <span pTooltip="Requiert le réseau entreprise/VPN">
            <i class="pi pi-lock mr-1"></i>Entreprise
          </span>
        } @else {
          <span class="text-color-secondary">Public</span>
        }
      </ng-template>
      <ng-template appCell="actions" let-s>
        <div class="flex gap-1">
          <p-button
            icon="pi pi-eye"
            [rounded]="true"
            [text]="true"
            size="small"
            severity="secondary"
            [routerLink]="['/scenarios', s.scenario_id]"
            pTooltip="Détail"
          />
          @if (s.writable) {
            <p-button
              icon="pi pi-copy"
              [rounded]="true"
              [text]="true"
              size="small"
              severity="secondary"
              (onClick)="askDuplicate(s)"
              pTooltip="Dupliquer"
            />
            <p-button
              icon="pi pi-trash"
              [rounded]="true"
              [text]="true"
              size="small"
              severity="danger"
              (onClick)="askDelete(s)"
              pTooltip="Supprimer"
            />
          }
        </div>
      </ng-template>
      <p-button
        emptyActions
        label="Créer un scénario"
        icon="pi pi-plus"
        routerLink="/scenarios/new"
      />
    </app-data-table>

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
})
export class ScenariosListComponent implements OnInit {
  private readonly service = inject(ScenariosService);
  private readonly slotsService = inject(SlotsService);
  private readonly historyService = inject(HistoryService);
  private readonly jobsService = inject(JobsService);
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
  /** scenario_id -> number of slots, for the "N créneaux" badge. */
  readonly slotCounts = signal<Record<string, number>>({});
  /** scenario_id -> most recent run (job or scheduled), for the "dernier run" badge. */
  readonly lastRuns = signal<Record<string, LastRun>>({});

  readonly columns: DataTableColumn[] = [
    { field: 'scenario_id', header: 'Scenario ID', sortable: true },
    { field: 'description', header: 'Description', sortable: true },
    { field: 'slots', header: 'Créneaux', width: '8rem', searchable: false },
    { field: 'last_run', header: 'Dernier run', width: '11rem', searchable: false },
    { field: 'role', header: 'Rôle', width: '8rem', searchable: false },
    { field: 'network', header: 'Réseau', width: '10rem', searchable: false },
    { field: 'actions', header: 'Actions', width: '9rem', searchable: false },
  ];

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
      void this.loadSlotCounts();
      void this.loadLastRuns(me.id);
    } catch {
      /* interceptor toasts */
    } finally {
      this.loading.set(false);
    }
  }

  /** One bounded call, grouped client-side, for the "N créneaux" badges. */
  private async loadSlotCounts(): Promise<void> {
    try {
      const page = await this.slotsService.list({ limit: 500, offset: 0 });
      const counts: Record<string, number> = {};
      for (const slot of page.items) {
        counts[slot.scenario_id] = (counts[slot.scenario_id] ?? 0) + 1;
      }
      this.slotCounts.set(counts);
    } catch {
      /* badge is best-effort */
    }
  }

  /** Most recent run per scenario across on-demand jobs + scheduled history. */
  private async loadLastRuns(userId: string): Promise<void> {
    const [jobsRes, histRes] = await Promise.allSettled([
      this.jobsService.list({ user_id: userId, limit: 100, offset: 0 }),
      this.historyService.list(userId, { limit: 100, offset: 0 }),
    ]);
    const map: Record<string, LastRun> = {};
    const consider = (scenario: string, status: string, when: string) => {
      const cur = map[scenario];
      if (!cur || cur.when < when) map[scenario] = { status, when };
    };
    if (jobsRes.status === 'fulfilled') {
      for (const j of jobsRes.value.items) {
        consider(j.target_id, j.status, j.finished_at ?? j.started_at ?? j.created_at);
      }
    }
    if (histRes.status === 'fulfilled') {
      for (const h of histRes.value.items) {
        consider(h.scenario_id, h.status, h.executed_at);
      }
    }
    this.lastRuns.set(map);
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
