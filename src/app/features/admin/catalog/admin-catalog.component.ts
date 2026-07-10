import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
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
    TranslocoPipe,
    CardModule,
    ButtonModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    JsonEditorComponent,
  ],
  template: `
    <app-page-header icon="pi-file-export" [title]="'admin.catalog.title' | transloco">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        [label]="'admin.common.back' | transloco"
        [outlined]="true"
        severity="secondary"
        routerLink="/admin"
      />
    </app-page-header>

    <div class="cards-grid">
      <div>
        <p-card [header]="'admin.catalog.export_title' | transloco">
          <p class="muted">
            {{ 'admin.catalog.export_desc' | transloco }}
          </p>
          <div class="btn-row">
            <p-button
              [label]="'admin.catalog.load_export' | transloco"
              icon="pi pi-download"
              [loading]="exporting()"
              (onClick)="loadExport()"
            />
            @if (exportData()) {
              <p-button
                [label]="'admin.catalog.download_json' | transloco"
                icon="pi pi-save"
                severity="secondary"
                (onClick)="downloadExport()"
              />
            }
          </div>
          @if (exportData(); as e) {
            <div class="export-note">
              {{ 'admin.catalog.export_loaded' | transloco: { scenarios: countKeys(e.scenarios), slots: countKeys(e.slots) } }}
            </div>
          }
        </p-card>
      </div>

      <div>
        <p-card [header]="'admin.catalog.import_title' | transloco">
          <p class="muted">
            {{ 'admin.catalog.import_desc_before' | transloco }} <em>dry-run</em>
            {{ 'admin.catalog.import_desc_after' | transloco }}
          </p>
          <app-json-editor
            [label]="'admin.catalog.import_label' | transloco"
            [value]="importDraft()"
            (valueChange)="onImportChange($event)"
            (validChange)="importValid.set($event)"
            [rows]="20"
          />
          <div class="toggle-row">
            <p-toggleswitch inputId="dry" [(ngModel)]="dryRun" />
            <label for="dry">{{ 'admin.catalog.dryrun_label' | transloco }}</label>
          </div>
          <div class="btn-row-lg">
            <p-button
              [label]="'admin.catalog.run_import' | transloco"
              icon="pi pi-upload"
              [severity]="dryRun ? 'secondary' : 'warn'"
              [loading]="importing()"
              [disabled]="!importValid() || importing()"
              (onClick)="runImport()"
            />
          </div>
          @if (importResult(); as r) {
            <div class="result-block">
              @if (r.dry_run) {
                <i class="pi pi-info-circle icon-info"></i>{{ 'admin.catalog.result_dryrun' | transloco }}
              } @else {
                <i class="pi pi-check icon-ok"></i>{{ 'admin.catalog.result_done' | transloco }}
              }
              <div class="result-counts">
                {{ 'admin.catalog.result_counts' | transloco: { scenarios: r.scenarios ?? '—', slots: r.slots ?? '—' } }}
              </div>
            </div>
          }
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .cards-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 1024px) {
        .cards-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      .muted {
        color: var(--muted);
      }
      .btn-row {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }
      .export-note {
        margin-top: 1rem;
        font-size: 0.875rem;
        color: var(--muted);
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1rem;
      }
      .btn-row-lg {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
      }
      .result-block {
        margin-top: 1rem;
        font-size: 0.875rem;
      }
      .icon-info {
        color: var(--muted);
        margin-right: 0.25rem;
      }
      .icon-ok {
        color: var(--success);
        margin-right: 0.25rem;
      }
      .result-counts {
        margin-top: 0.25rem;
      }
    `,
  ],
})
export class AdminCatalogComponent {
  private readonly service = inject(AdminService);
  private readonly messages = inject(MessageService);
  private readonly i18n = inject(TranslocoService);

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
        summary: this.i18n.translate('admin.catalog.toast_export_loaded'),
        detail: this.i18n.translate('admin.catalog.toast_export_detail', {
          scenarios: this.countKeys(data.scenarios),
          slots: this.countKeys(data.slots),
        }),
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
        summary: this.i18n.translate(
          r.dry_run ? 'admin.catalog.toast_dryrun_done' : 'admin.catalog.toast_import_done',
        ),
        detail: this.i18n.translate('admin.catalog.result_counts', {
          scenarios: r.scenarios ?? '—',
          slots: r.slots ?? '—',
        }),
        life: 3500,
      });
    } catch {
      /* toast */
    } finally {
      this.importing.set(false);
    }
  }
}
