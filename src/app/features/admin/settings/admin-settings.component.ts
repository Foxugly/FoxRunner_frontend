import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { AdminService } from '../../../core/api/admin.service';
import type { AppSetting } from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import type { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { FormFooterComponent } from '../../../shared/components/form-footer/form-footer.component';
import { JsonEditorComponent } from '../../../shared/components/json-editor/json-editor.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    TooltipModule,
    ConfirmDialogModule,
    ApiDatePipe,
    DataTableComponent,
    CellTemplateDirective,
    FormFooterComponent,
    JsonEditorComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header icon="pi-sliders-h" title="Paramètres applicatifs">
      <p-button
        slot="left"
        icon="pi pi-arrow-left"
        label="Retour"
        [outlined]="true"
        severity="secondary"
        routerLink="/admin"
      />
      <p-button
        slot="right"
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
      <p-button slot="right" label="Nouveau" icon="pi pi-plus" (onClick)="openCreate()" />
    </app-page-header>

    <app-data-table
      [value]="items()"
      [columns]="columns"
      [loading]="loading()"
      dataKey="key"
      emptyIcon="pi-sliders-h"
      emptyTitle="Aucun paramètre"
      emptyMessage="Crée un paramètre pour le voir ici."
    >
      <ng-template appCell="key" let-s><code>{{ s.key }}</code></ng-template>
      <ng-template appCell="description" let-s>
        <span class="text-color-secondary">{{ s.description || '—' }}</span>
      </ng-template>
      <ng-template appCell="updated_at" let-s>{{ s.updated_at | apiDate: 'medium' }}</ng-template>
      <ng-template appCell="actions" let-s>
        <div class="flex gap-1">
          <p-button
            icon="pi pi-pencil"
            [rounded]="true"
            [text]="true"
            size="small"
            (onClick)="openEdit(s)"
          />
          <p-button
            icon="pi pi-trash"
            [rounded]="true"
            [text]="true"
            size="small"
            severity="danger"
            (onClick)="askDelete(s)"
          />
        </div>
      </ng-template>
    </app-data-table>

    <p-dialog
      [modal]="true"
      [(visible)]="dialogOpen"
      [header]="dialogHeader()"
      [style]="{ width: '640px' }"
      [closable]="!saving()"
    >
      <div class="meta-grid">
        <div class="meta-item">
          <label class="meta-label" for="key">Clé</label>
          <div class="meta-value">
            <input id="key" pInputText [(ngModel)]="draftKey" [disabled]="editing()" />
          </div>
        </div>
        <div class="meta-item">
          <label class="meta-label" for="desc">Description</label>
          <div class="meta-value">
            <textarea id="desc" pTextarea rows="2" [(ngModel)]="draftDesc"></textarea>
          </div>
        </div>
        <div class="meta-item meta-item--full">
          <app-json-editor
            label="Valeur (JSON)"
            [value]="draftValue()"
            (valueChange)="onValueChange($event)"
            (validChange)="draftValid.set($event)"
            [rows]="14"
          />
        </div>
      </div>
      <ng-template pTemplate="footer">
        <app-form-footer
          [loading]="saving()"
          [disabled]="!draftKey || !draftValid() || saving()"
          (save)="save()"
          (cancelled)="closeDialog()"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class AdminSettingsComponent implements OnInit {
  private readonly service = inject(AdminService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly items = signal<AppSetting[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly columns: DataTableColumn[] = [
    { field: 'key', header: 'Clé', sortable: true },
    { field: 'description', header: 'Description', sortable: true },
    { field: 'updated_at', header: 'Modifié le', sortable: true, width: '12rem' },
    { field: 'actions', header: 'Actions', width: '9rem', searchable: false },
  ];

  dialogOpen = false;
  readonly editing = signal(false);
  readonly dialogHeader = computed(() =>
    this.editing() ? 'Modifier le paramètre' : 'Nouveau paramètre',
  );
  draftKey = '';
  draftDesc = '';
  readonly draftValue = signal<Record<string, unknown>>({});
  readonly draftValid = signal(true);
  private latestValue: Record<string, unknown> = {};

  ngOnInit(): void {
    void this.load();
  }

  reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      // Bounded table: load all rows for client-side search/sort (500 is a guard rail).
      const page = await this.service.listSettings(500, 0);
      this.items.set(page.items);
      if (page.total > 500) {
        console.warn(`settings: ${page.total} rows exceed the 500 client cap; showing first 500.`);
      }
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editing.set(false);
    this.draftKey = '';
    this.draftDesc = '';
    this.draftValue.set({});
    this.latestValue = {};
    this.draftValid.set(true);
    this.dialogOpen = true;
  }

  openEdit(s: AppSetting): void {
    this.editing.set(true);
    this.draftKey = s.key;
    this.draftDesc = s.description;
    this.draftValue.set(s.value as Record<string, unknown>);
    this.latestValue = s.value as Record<string, unknown>;
    this.draftValid.set(true);
    this.dialogOpen = true;
  }

  closeDialog(): void {
    this.dialogOpen = false;
  }

  onValueChange(v: unknown): void {
    this.latestValue = (v ?? {}) as Record<string, unknown>;
  }

  async save(): Promise<void> {
    if (!this.draftKey || !this.draftValid()) return;
    this.saving.set(true);
    try {
      await this.service.upsertSetting(this.draftKey, {
        value: this.latestValue,
        description: this.draftDesc,
      });
      this.messages.add({
        severity: 'success',
        summary: this.editing() ? 'Paramètre mis à jour' : 'Paramètre créé',
        detail: this.draftKey,
        life: 2500,
      });
      this.dialogOpen = false;
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.saving.set(false);
    }
  }

  askDelete(s: AppSetting): void {
    this.confirm.confirm({
      header: `Supprimer « ${s.key} » ?`,
      message: 'Cette action est irréversible.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.service.deleteSetting(s.key);
          this.messages.add({
            severity: 'success',
            summary: 'Paramètre supprimé',
            detail: s.key,
            life: 2500,
          });
          this.reload();
        } catch {
          /* toast */
        }
      },
    });
  }
}
