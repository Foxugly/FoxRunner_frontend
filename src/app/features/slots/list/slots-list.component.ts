import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputMaskModule } from 'primeng/inputmask';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '../../../core/auth/auth.service';
import { ScenariosService } from '../../../core/api/scenarios.service';
import { SlotsService } from '../../../core/api/slots.service';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import type { Slot, SlotSummary, ScenarioSummary } from '../../../core/api/types';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

interface DayOption {
  value: number;
  label: string;
}

const DAYS: readonly DayOption[] = [
  { value: 0, label: 'Lu' },
  { value: 1, label: 'Ma' },
  { value: 2, label: 'Me' },
  { value: 3, label: 'Je' },
  { value: 4, label: 'Ve' },
  { value: 5, label: 'Sa' },
  { value: 6, label: 'Di' },
] as const;

@Component({
  selector: 'app-slots-list',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    TagModule,
    ButtonModule,
    TooltipModule,
    ToggleSwitchModule,
    DialogModule,
    InputTextModule,
    InputMaskModule,
    MultiSelectModule,
    CheckboxModule,
    AutoCompleteModule,
    ConfirmDialogModule,
    PageHeaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-page-header icon="pi-calendar" title="Slots">
      <p-button
        icon="pi pi-refresh"
        severity="secondary"
        [text]="true"
        [loading]="loading()"
        (onClick)="reload()"
        pTooltip="Rafraîchir"
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
      dataKey="slot_id"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th>Slot</th>
          <th>Scénario</th>
          <th>Jours</th>
          <th>Horaire</th>
          <th style="width: 6rem">Actif</th>
          <th style="width: 9rem">Actions</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-s>
        <tr>
          <td>{{ s.slot_id }}</td>
          <td>{{ s.scenario_id }}</td>
          <td>
            <div class="flex gap-1">
              @for (d of days; track d.value) {
                <p-tag
                  [severity]="s.days?.includes(d.value) ? 'success' : 'secondary'"
                  [value]="d.label"
                />
              }
            </div>
          </td>
          <td>{{ s.start }} — {{ s.end }}</td>
          <td>
            <p-toggleswitch
              [(ngModel)]="s.enabled"
              (onChange)="toggleEnabled(s)"
              [ariaLabel]="'Actif — slot ' + s.slot_id"
            />
          </td>
          <td>
            <div class="flex gap-1">
              <p-button
                icon="pi pi-pencil"
                [rounded]="true"
                [text]="true"
                size="small"
                severity="secondary"
                (onClick)="openEdit(s)"
                pTooltip="Modifier"
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
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6">
            <app-empty-state
              icon="pi-calendar"
              title="Aucun slot"
              message="Crée un premier slot pour planifier une exécution."
            >
              <p-button label="Créer un slot" icon="pi pi-plus" (onClick)="openCreate()" />
            </app-empty-state>
          </td>
        </tr>
      </ng-template>
    </p-table>

    <p-dialog
      [modal]="true"
      [(visible)]="dialogOpen"
      [header]="editingId() ? 'Modifier le slot' : 'Créer un slot'"
      [style]="{ width: '520px' }"
      [closable]="!saving()"
    >
      <form [formGroup]="form" class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="slot_id">Identifiant du slot</label>
          <input
            id="slot_id"
            pInputText
            formControlName="slot_id"
            placeholder="morning_check"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="scenario_id">Scénario</label>
          <p-autocomplete
            inputId="scenario_id"
            formControlName="scenario_id"
            [suggestions]="scenarioSuggestions()"
            (completeMethod)="suggestScenarios($event)"
            [dropdown]="true"
            placeholder="alice_pointer"
            appendTo="body"
            styleClass="w-full"
          />
        </div>
        <div class="flex flex-column gap-2">
          <label for="days">Jours</label>
          <p-multiselect
            inputId="days"
            [options]="daysOptions"
            optionLabel="label"
            optionValue="value"
            formControlName="days"
            placeholder="Lundi à vendredi"
            display="chip"
            appendTo="body"
          />
        </div>
        <div class="flex gap-3">
          <div class="flex flex-column gap-2 flex-1">
            <label for="start">Début (HH:MM)</label>
            <p-inputmask
              inputId="start"
              mask="99:99"
              formControlName="start"
              placeholder="08:00"
              slotChar="_"
            />
          </div>
          <div class="flex flex-column gap-2 flex-1">
            <label for="end">Fin (HH:MM)</label>
            <p-inputmask
              inputId="end"
              mask="99:99"
              formControlName="end"
              placeholder="08:15"
              slotChar="_"
            />
          </div>
        </div>
        <div class="flex align-items-center gap-2">
          <p-checkbox inputId="enabled" [binary]="true" formControlName="enabled" />
          <label for="enabled">Activé</label>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" (onClick)="closeDialog()" [disabled]="saving()" />
        <p-button
          label="Enregistrer"
          icon="pi pi-save"
          [loading]="saving()"
          [disabled]="form.invalid || saving()"
          (onClick)="save()"
        />
      </ng-template>
    </p-dialog>

    <p-confirmDialog />
  `,
})
export class SlotsListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly slotsService = inject(SlotsService);
  private readonly scenariosService = inject(ScenariosService);
  private readonly auth = inject(AuthService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly items = signal<SlotSummary[]>([]);
  readonly total = signal(0);
  readonly rows = signal(25);
  readonly first = signal(0);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly days = DAYS;
  readonly daysOptions = [...DAYS];

  dialogOpen = false;
  readonly editingId = signal<string | null>(null);
  private idempotencyKey = '';

  readonly scenarioSuggestions = signal<string[]>([]);
  private scenarioCache: ScenarioSummary[] = [];

  readonly form = this.fb.nonNullable.group({
    slot_id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_\-.]+$/)]],
    scenario_id: ['', [Validators.required]],
    days: this.fb.nonNullable.control<number[]>([0, 1, 2, 3, 4], {
      validators: [Validators.required, Validators.minLength(1)],
    }),
    start: ['08:00', [Validators.required, Validators.pattern(/^[0-9]{2}:[0-9]{2}$/)]],
    end: ['08:15', [Validators.required, Validators.pattern(/^[0-9]{2}:[0-9]{2}$/)]],
    enabled: [true],
  });

  readonly slotIdEditable = computed(() => this.editingId() === null);

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
      const page = await this.slotsService.list({ limit, offset });
      this.items.set(page.items);
      this.total.set(page.total);
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }

  async suggestScenarios(ev: { query: string }): Promise<void> {
    const me = this.auth.currentUser();
    if (!me) return;
    if (this.scenarioCache.length === 0) {
      try {
        const page = await this.scenariosService.list(me.id, 200, 0);
        this.scenarioCache = page.items;
      } catch {
        this.scenarioCache = [];
      }
    }
    const q = ev.query.toLowerCase();
    this.scenarioSuggestions.set(
      this.scenarioCache
        .map((s) => s.scenario_id)
        .filter((id) => id.toLowerCase().includes(q))
        .slice(0, 20),
    );
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      slot_id: '',
      scenario_id: '',
      days: [0, 1, 2, 3, 4],
      start: '08:00',
      end: '08:15',
      enabled: true,
    });
    this.form.controls.slot_id.enable();
    this.idempotencyKey = newIdempotencyKey();
    this.dialogOpen = true;
  }

  openEdit(s: SlotSummary): void {
    this.editingId.set(s.slot_id);
    this.slotsService
      .get(s.slot_id)
      .then((full) => {
        this.form.reset({
          slot_id: full.slot_id,
          scenario_id: full.scenario_id,
          days: full.days,
          start: full.start,
          end: full.end,
          enabled: full.enabled,
        });
        this.form.controls.slot_id.disable();
        this.dialogOpen = true;
      })
      .catch(() => {
        /* toast */
      });
  }

  closeDialog(): void {
    this.dialogOpen = false;
    this.editingId.set(null);
    this.idempotencyKey = '';
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      const values = this.form.getRawValue();
      if (this.editingId()) {
        await this.slotsService.patch(this.editingId() as string, {
          scenario_id: values.scenario_id,
          days: values.days,
          start: values.start,
          end: values.end,
          enabled: values.enabled,
        });
        this.messages.add({
          severity: 'success',
          summary: 'Slot mis à jour',
          detail: values.slot_id,
          life: 3000,
        });
      } else {
        const dto: Slot = {
          slot_id: values.slot_id,
          scenario_id: values.scenario_id,
          days: values.days,
          start: values.start,
          end: values.end,
          enabled: values.enabled,
        };
        await this.slotsService.create(dto, this.idempotencyKey);
        this.messages.add({
          severity: 'success',
          summary: 'Slot créé',
          detail: values.slot_id,
          life: 3000,
        });
      }
      this.closeDialog();
      this.reload();
    } catch {
      /* toast */
    } finally {
      this.saving.set(false);
    }
  }

  async toggleEnabled(s: SlotSummary & { enabled: boolean }): Promise<void> {
    try {
      await this.slotsService.patch(s.slot_id, { enabled: s.enabled });
      this.messages.add({
        severity: 'success',
        summary: s.enabled ? 'Slot activé' : 'Slot désactivé',
        detail: s.slot_id,
        life: 2000,
      });
    } catch {
      // Revert optimistic toggle on error.
      s.enabled = !s.enabled;
    }
  }

  askDelete(s: SlotSummary): void {
    this.confirm.confirm({
      header: `Supprimer « ${s.slot_id} » ?`,
      message: 'Cette action est irréversible.',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Supprimer',
      rejectLabel: 'Annuler',
      acceptButtonProps: { severity: 'danger' },
      accept: async () => {
        try {
          await this.slotsService.remove(s.slot_id);
          this.messages.add({
            severity: 'success',
            summary: 'Slot supprimé',
            detail: s.slot_id,
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
