import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import type { ScenarioSummary } from '../../../core/api/types';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';

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
  ],
  template: `
    <app-page-header
      icon="pi-sitemap"
      title="Scénarios"
      subtitle="Scénarios dont tu es propriétaire ou qui te sont partagés"
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

    <p-confirmDialog />
  `,
})
export class ScenariosListComponent implements OnInit {
  private readonly service = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly items = signal<ScenarioSummary[]>([]);
  readonly loading = signal(false);

  readonly columns: DataTableColumn[] = [
    { field: 'scenario_id', header: 'Scenario ID', sortable: true },
    { field: 'description', header: 'Description', sortable: true },
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
}
