import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PushItTargetsService } from '../../core/api/pushit-targets.service';
import type { PushItTarget } from '../../core/api/types';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { FormFooterComponent } from '../../shared/components/form-footer/form-footer.component';

@Component({
  selector: 'app-pushit-targets',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    TableModule,
    TagModule,
    TooltipModule,
    EmptyStateComponent,
    FormFooterComponent,
  ],
  template: `
    <p-card>
      <ng-template #header>
        <div class="flex align-items-center justify-content-between p-3">
          <div class="flex flex-column gap-1">
            <span class="font-semibold">
              <i class="pi pi-bell mr-2"></i>Applications PushIT
            </span>
            <small class="text-color-secondary">
              Vos notifications (alertes du scheduleur + étapes <code>notify</code>) passent par
              ces apps. La configuration est personnelle : personne d'autre ne la voit.
            </small>
          </div>
          <p-button
            label="Ajouter"
            icon="pi pi-plus"
            severity="success"
            size="small"
            (onClick)="openCreate()"
          />
        </div>
      </ng-template>

      @if (loading() || targets().length > 0) {
      <p-table
        [value]="targets()"
        [loading]="loading()"
        styleClass="p-datatable-sm"
      >
        <ng-template #header>
          <tr>
            <th>Nom</th>
            <th>Token</th>
            <th>Titre</th>
            <th>Défaut</th>
            <th class="text-right">Actions</th>
          </tr>
        </ng-template>
        <ng-template #body let-t>
          <tr>
            <td>{{ t.name }}</td>
            <td><code>{{ mask(t.app_token) }}</code></td>
            <td>{{ t.title }}</td>
            <td>
              @if (t.is_default) {
                <p-tag value="défaut" severity="success" />
              }
            </td>
            <td class="text-right white-space-nowrap">
              <p-button
                icon="pi pi-send"
                severity="secondary"
                [text]="true"
                size="small"
                pTooltip="Tester"
                [loading]="testingId() === t.id"
                (onClick)="test(t)"
              />
              <p-button
                icon="pi pi-pencil"
                severity="secondary"
                [text]="true"
                size="small"
                (onClick)="openEdit(t)"
              />
              <p-button
                icon="pi pi-trash"
                severity="danger"
                [text]="true"
                size="small"
                (onClick)="confirmId.set(t.id)"
              />
            </td>
          </tr>
        </ng-template>
      </p-table>
      } @else {
        <app-empty-state
          icon="pi-bell"
          title="Aucune application PushIT"
          subtitle="Ajoutez une application pour recevoir vos notifications (alertes du scheduleur et étapes notify)."
        >
          <p-button
            label="Ajouter"
            icon="pi pi-plus"
            severity="success"
            size="small"
            (onClick)="openCreate()"
          />
        </app-empty-state>
      }
    </p-card>

    <!-- Create / edit dialog -->
    <p-dialog
      [visible]="dialogOpen()"
      (visibleChange)="onDialogVisible($event)"
      [modal]="true"
      [style]="{ width: '32rem' }"
      [header]="dialogHeader()"
    >
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="meta-grid">
          <div class="meta-item">
            <label class="meta-label" for="pit-name">Nom</label>
            <div class="meta-value">
              <input id="pit-name" pInputText formControlName="name" placeholder="Mon téléphone" />
            </div>
          </div>
          <div class="meta-item">
            <label class="meta-label" for="pit-token">Token de l'app (X-App-Token)</label>
            <div class="meta-value">
              <input id="pit-token" pInputText formControlName="app_token" placeholder="apt_…" />
            </div>
          </div>
          <div class="meta-item">
            <label class="meta-label" for="pit-base">URL de base de l'API</label>
            <div class="meta-value">
              <input id="pit-base" pInputText formControlName="base_url" />
            </div>
          </div>
          <div class="meta-item">
            <label class="meta-label" for="pit-title">Titre des notifications</label>
            <div class="meta-value">
              <input id="pit-title" pInputText formControlName="title" />
            </div>
          </div>
          <div class="meta-item">
            <span class="meta-label">Application par défaut</span>
            <div class="meta-value">
              <p-checkbox inputId="pit-default" formControlName="is_default" [binary]="true" />
            </div>
          </div>
        </div>
      </form>
      <ng-template #footer>
        <app-form-footer
          [loading]="saving()"
          [disabled]="form.invalid || saving()"
          (save)="save()"
          (cancelled)="closeDialog()"
        />
      </ng-template>
    </p-dialog>

    <!-- Delete confirm dialog -->
    <p-dialog
      [visible]="confirmId() !== null"
      (visibleChange)="$event || confirmId.set(null)"
      [modal]="true"
      [style]="{ width: '26rem' }"
      header="Supprimer l'application ?"
    >
      <p>Cette action est définitive.</p>
      <ng-template #footer>
        <p-button label="Annuler" severity="secondary" [text]="true" (onClick)="confirmId.set(null)" />
        <p-button label="Supprimer" icon="pi pi-trash" severity="danger" (onClick)="remove()" />
      </ng-template>
    </p-dialog>
  `,
})
export class PushItTargetsComponent implements OnInit {
  private readonly service = inject(PushItTargetsService);
  private readonly messages = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  readonly targets = signal<PushItTarget[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dialogOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly confirmId = signal<number | null>(null);
  readonly testingId = signal<number | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    app_token: ['', Validators.required],
    base_url: ['https://pushit-api.foxugly.com/api/v1', Validators.required],
    title: ['FoxRunner', Validators.required],
    is_default: [false],
  });

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  dialogHeader(): string {
    return this.editingId() === null ? 'Nouvelle application PushIT' : "Modifier l'application";
  }

  mask(token: string): string {
    if (token.length <= 6) return '••••';
    return `${token.slice(0, 4)}…${token.slice(-2)}`;
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.targets.set(await this.service.list());
    } catch {
      /* interceptor toasts */
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      name: '',
      app_token: '',
      base_url: 'https://pushit-api.foxugly.com/api/v1',
      title: 'FoxRunner',
      is_default: false,
    });
    this.dialogOpen.set(true);
  }

  openEdit(t: PushItTarget): void {
    this.editingId.set(t.id);
    this.form.reset({
      name: t.name,
      app_token: t.app_token,
      base_url: t.base_url,
      title: t.title,
      is_default: t.is_default,
    });
    this.dialogOpen.set(true);
  }

  onDialogVisible(visible: boolean): void {
    if (!visible) this.closeDialog();
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    const dto = this.form.getRawValue();
    const id = this.editingId();
    try {
      if (id === null) {
        await this.service.create(dto);
        this.messages.add({ severity: 'success', summary: 'Application créée', life: 3000 });
      } else {
        await this.service.update(id, dto);
        this.messages.add({ severity: 'success', summary: 'Application mise à jour', life: 3000 });
      }
      this.dialogOpen.set(false);
      await this.reload();
    } catch {
      /* interceptor toasts */
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    const id = this.confirmId();
    if (id === null) return;
    try {
      await this.service.remove(id);
      this.messages.add({ severity: 'success', summary: 'Application supprimée', life: 3000 });
      await this.reload();
    } catch {
      /* interceptor toasts */
    } finally {
      this.confirmId.set(null);
    }
  }

  async test(t: PushItTarget): Promise<void> {
    this.testingId.set(t.id);
    try {
      const result = await this.service.test(t.id);
      this.messages.add(
        result.sent
          ? { severity: 'success', summary: 'Notification envoyée', detail: t.name, life: 3000 }
          : { severity: 'warn', summary: 'Échec de l\'envoi', detail: 'Vérifiez le token.', life: 4000 },
      );
    } catch {
      /* interceptor toasts */
    } finally {
      this.testingId.set(null);
    }
  }
}
