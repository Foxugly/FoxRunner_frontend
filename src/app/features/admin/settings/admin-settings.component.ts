import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { AdminService } from '../../../core/api/admin.service';
import type { AppSetting } from '../../../core/api/types';
import { ApiDatePipe } from '../../../shared/pipes/api-date.pipe';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { JsonEditorComponent } from '../../../shared/components/json-editor/json-editor.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    TooltipModule,
    ConfirmDialogModule,
    ApiDatePipe,
    EmptyStateComponent,
    JsonEditorComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header icon="pi-sliders-h" title="Paramètres applicatifs">
      <p-button
        label="Retour admin"
        icon="pi pi-arrow-left"
        severity="secondary"
        [text]="true"
        routerLink="/admin"
      />
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
      />
      <p-button label="Nouveau" icon="pi pi-plus" (onClick)="openCreate()" />
    </app-page-header>

    <p-table
      [value]="items()"
      [lazy]="true"
      [paginator]="true"
      [rows]="rows()"
      [first]="first()"
      [totalRecords]="total()"
      [loading]="loading()"
      (onLazyLoad)="onLazyLoad($event)"
      [rowsPerPageOptions]="[10, 25, 50]"
      dataKey="key"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Clé</th>
          <th>Description</th>
          <th style="width: 12rem">Modifié le</th>
          <th style="width: 9rem">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-s>
        <tr>
          <td><code>{{ s.key }}</code></td>
          <td class="text-color-secondary">{{ s.description || '—' }}</td>
          <td>{{ s.updated_at | apiDate: 'medium' }}</td>
          <td>
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
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="4">
            <app-empty-state
              icon="pi-sliders-h"
              title="Aucun paramètre"
              message="Crée un paramètre pour le voir ici."
            />
          </td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [modal]="true"
      [(visible)]="dialogOpen"
      [header]="dialogHeader()"
      [style]="{ width: '640px' }"
      [closable]="!saving()"
    >
      <div class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="key">Clé</label>
          <input id="key" pInputText [(ngModel)]="draftKey" [disabled]="editing()" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="desc">Description</label>
          <textarea id="desc" pTextarea rows="2" [(ngModel)]="draftDesc"></textarea>
        </div>
        <app-json-editor
          label="Valeur (JSON)"
          [value]="draftValue()"
          (valueChange)="onValueChange($event)"
          (validChange)="draftValid.set($event)"
          [rows]="14"
        />
      </div>
      <ng-template pTemplate="footer">
        <p-button
          label="Annuler"
          severity="secondary"
          [text]="true"
          (onClick)="closeDialog()"
          [disabled]="saving()"
        />
        <p-button
          label="Enregistrer"
          icon="pi pi-save"
          [loading]="saving()"
          [disabled]="!draftKey || !draftValid() || saving()"
          (onClick)="save()"
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
  readonly total = signal(0);
  readonly rows = signal(25);
  readonly first = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);

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
    void this.load(0, this.rows());
  }

  onLazyLoad(ev: TableLazyLoadEvent): void {
    const first = ev.first ?? 0;
    const rows = ev.rows ?? this.rows();
    this.first.set(first);
    this.rows.set(rows);
    void this.load(first, rows);
  }

  reload(): void {
    void this.load(this.first(), this.rows());
  }

  private async load(offset: number, limit: number): Promise<void> {
    this.loading.set(true);
    try {
      const page = await this.service.listSettings(limit, offset);
      this.items.set(page.items);
      this.total.set(page.total);
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
