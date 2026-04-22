import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AdminService } from '../../../core/api/admin.service';
import type { ExportPayload, ImportResult } from '../../../core/api/types';
import { JsonEditorComponent } from '../../../shared/components/json-editor/json-editor.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CardModule,
    ButtonModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    JsonEditorComponent,
  ],
  template: `
    <app-page-header
      icon="pi-file-export"
      title="Catalogue"
      subtitle="Export/import des scénarios et slots"
    >
      <p-button
        label="Retour admin"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/admin"
      />
    </app-page-header>

    <div class="grid">
      <div class="col-12 lg:col-6">
        <p-card header="Export">
          <p class="text-color-secondary">
            Récupère l'ensemble des scénarios et slots persistés au format JSON pour sauvegarde
            ou audit.
          </p>
          <div class="flex gap-2 mt-2">
            <p-button
              label="Charger l'export"
              icon="pi pi-download"
              [loading]="exporting()"
              (onClick)="loadExport()"
            />
            @if (exportData()) {
              <p-button
                label="Télécharger .json"
                icon="pi pi-save"
                severity="secondary"
                (onClick)="downloadExport()"
              />
            }
          </div>
          @if (exportData(); as e) {
            <div class="mt-3 text-sm text-color-secondary">
              {{ countKeys(e.scenarios) }} scénarios, {{ countKeys(e.slots) }} slots chargés.
            </div>
          }
        </p-card>
      </div>

      <div class="col-12 lg:col-6">
        <p-card header="Import">
          <p class="text-color-secondary">
            Colle le JSON d'un export précédent. Le mode <em>dry-run</em> simule l'import sans
            écrire en base.
          </p>
          <app-json-editor
            label="Payload JSON"
            [value]="importDraft()"
            (valueChange)="onImportChange($event)"
            (validChange)="importValid.set($event)"
            [rows]="14"
          />
          <div class="flex align-items-center gap-3 mt-3">
            <p-toggleswitch inputId="dry" [(ngModel)]="dryRun" />
            <label for="dry">Dry-run</label>
          </div>
          <div class="flex gap-2 mt-3">
            <p-button
              label="Lancer l'import"
              icon="pi pi-upload"
              [severity]="dryRun ? 'secondary' : 'warn'"
              [loading]="importing()"
              [disabled]="!importValid() || importing()"
              (onClick)="runImport()"
            />
          </div>
          @if (importResult(); as r) {
            <div class="mt-3 text-sm">
              @if (r.dry_run) {
                <i class="pi pi-info-circle text-blue-500 mr-1"></i>Simulation uniquement.
              } @else {
                <i class="pi pi-check text-green-500 mr-1"></i>Import effectué.
              }
              <div class="mt-1">
                Scénarios : {{ r.scenarios ?? '—' }} · Slots : {{ r.slots ?? '—' }}
              </div>
            </div>
          }
        </p-card>
      </div>
    </div>
  `,
})
export class AdminCatalogComponent {
  private readonly service = inject(AdminService);
  private readonly messages = inject(MessageService);

  readonly exporting = signal(false);
  readonly importing = signal(false);
  readonly exportData = signal<ExportPayload | null>(null);
  readonly importDraft = signal<Record<string, unknown>>({ scenarios: {}, slots: {} });
  readonly importValid = signal(true);
  readonly importResult = signal<ImportResult | null>(null);
  dryRun = true;
  private latestImport: Record<string, unknown> = { scenarios: {}, slots: {} };

  countKeys(obj: Record<string, unknown> | null | undefined): number {
    return obj ? Object.keys(obj).length : 0;
  }

  onImportChange(v: unknown): void {
    this.latestImport = (v ?? {}) as Record<string, unknown>;
  }

  async loadExport(): Promise<void> {
    this.exporting.set(true);
    try {
      const data = await this.service.exportCatalog();
      this.exportData.set(data);
      this.messages.add({
        severity: 'success',
        summary: 'Export chargé',
        detail: `${this.countKeys(data.scenarios)} scénarios, ${this.countKeys(data.slots)} slots`,
        life: 2500,
      });
    } catch {
      /* toast */
    } finally {
      this.exporting.set(false);
    }
  }

  downloadExport(): void {
    const data = this.exportData();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `foxrunner-catalog-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async runImport(): Promise<void> {
    if (!this.importValid()) return;
    this.importing.set(true);
    try {
      const r = await this.service.importCatalog(this.latestImport, this.dryRun);
      this.importResult.set(r);
      this.messages.add({
        severity: 'success',
        summary: r.dry_run ? 'Dry-run terminé' : 'Import effectué',
        detail: `Scénarios : ${r.scenarios ?? '—'} · Slots : ${r.slots ?? '—'}`,
        life: 3500,
      });
    } catch {
      /* toast */
    } finally {
      this.importing.set(false);
    }
  }
}
