import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputMaskModule } from 'primeng/inputmask';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { SlotsService } from '../../../core/api/slots.service';
import { newIdempotencyKey } from '../../../core/utils/idempotency';
import type { Slot, SlotSummary } from '../../../core/api/types';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

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

/**
 * Planning section embedded in the scenario detail page: lists and manages the
 * slots of ONE scenario. The scenario is fixed (no picker) — `scenario_id` is
 * taken from the `scenarioId` input. Relies on the parent's `<p-confirmDialog>`
 * (shared ConfirmationService) for delete confirmation.
 */
@Component({
  selector: 'app-scenario-slots',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ToggleSwitchModule,
    DialogModule,
    InputTextModule,
    InputMaskModule,
    MultiSelectModule,
    CheckboxModule,
    SkeletonModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="flex align-items-center justify-content-between mb-3">
      <span class="font-semibold"><i class="pi pi-calendar mr-2"></i>Planification</span>
      @if (canEdit()) {
        <p-button label="Créneau" icon="pi pi-plus" severity="success" size="small" (onClick)="openCreate()" />
      }
    </div>

    @if (loading()) {
      <div class="flex flex-column gap-2">
        <p-skeleton height="3rem" />
        <p-skeleton height="3rem" />
        <p-skeleton height="3rem" />
      </div>
    } @else if (slots().length === 0) {
      <app-empty-state
        icon="pi-calendar"
        title="Aucun créneau planifié"
        message="Ce scénario n'a pas encore de créneau planifié."
      />
    } @else {
      <div class="flex flex-column gap-2">
        @for (s of slots(); track s.slot_id) {
          <div class="flex align-items-center justify-content-between gap-2 p-2 border-1 surface-border border-round">
            <div class="flex align-items-center gap-3 flex-wrap">
              <div class="flex gap-1">
                @for (d of days; track d.value) {
                  <p-tag [severity]="s.days.includes(d.value) ? 'success' : 'secondary'" [value]="d.label" />
                }
              </div>
              <span class="font-medium">{{ s.start }} → {{ s.end }}</span>
              <code class="text-xs text-color-secondary">{{ s.slot_id }}</code>
            </div>
            <div class="flex align-items-center gap-1">
              <p-toggleswitch
                [(ngModel)]="s.enabled"
                [disabled]="!canEdit()"
                (onChange)="toggleEnabled(s)"
                [ariaLabel]="'Actif — créneau ' + s.slot_id"
              />
              @if (canEdit()) {
                <p-button icon="pi pi-pencil" [rounded]="true" [text]="true" size="small" severity="secondary" (onClick)="openEdit(s)" pTooltip="Modifier" />
                <p-button icon="pi pi-trash" [rounded]="true" [text]="true" size="small" severity="danger" (onClick)="askDelete(s)" pTooltip="Supprimer" />
              }
            </div>
          </div>
        }
      </div>
    }

    <p-dialog
      [modal]="true"
      [(visible)]="dialogOpen"
      [header]="editingId() ? 'Modifier le créneau' : 'Nouveau créneau'"
      [style]="{ width: '460px' }"
      [closable]="!saving()"
    >
      <form [formGroup]="form" class="flex flex-column gap-3">
        <div class="flex flex-column gap-2">
          <label for="ss-slot-id">Identifiant du créneau</label>
          <input id="ss-slot-id" pInputText formControlName="slot_id" placeholder="morning_check" />
        </div>
        <div class="flex flex-column gap-2">
          <label for="ss-days">Jours</label>
          <p-multiselect
            inputId="ss-days"
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
            <label for="ss-start">Début (HH:MM)</label>
            <p-inputmask inputId="ss-start" mask="99:99" formControlName="start" placeholder="08:00" slotChar="_" />
          </div>
          <div class="flex flex-column gap-2 flex-1">
            <label for="ss-end">Fin (HH:MM)</label>
            <p-inputmask inputId="ss-end" mask="99:99" formControlName="end" placeholder="08:15" slotChar="_" />
          </div>
        </div>
        <div class="flex align-items-center gap-2">
          <p-checkbox inputId="ss-enabled" [binary]="true" formControlName="enabled" />
          <label for="ss-enabled">Activé</label>
        </div>
      </form>
      <ng-template pTemplate="footer">
        <p-button label="Annuler" severity="secondary" [text]="true" (onClick)="closeDialog()" [disabled]="saving()" />
        <p-button label="Enregistrer" icon="pi pi-save" [loading]="saving()" [disabled]="form.invalid || saving()" (onClick)="save()" />
      </ng-template>
    </p-dialog>
  `,
})
export class ScenarioSlotsComponent implements OnInit {
  readonly scenarioId = input.required<string>();
  readonly canEdit = input<boolean>(false);
  readonly changed = output<number>();

  private readonly fb = inject(FormBuilder);
  private readonly slotsService = inject(SlotsService);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);

  readonly slots = signal<SlotSummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly days = DAYS;
  readonly daysOptions = [...DAYS];

  dialogOpen = false;
  readonly editingId = signal<string | null>(null);
  private idempotencyKey = '';

  readonly form = this.fb.nonNullable.group({
    slot_id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_\-.]+$/)]],
    days: this.fb.nonNullable.control<number[]>([0, 1, 2, 3, 4], {
      validators: [Validators.required, Validators.minLength(1)],
    }),
    start: ['08:00', [Validators.required, Validators.pattern(/^[0-9]{2}:[0-9]{2}$/)]],
    end: ['08:15', [Validators.required, Validators.pattern(/^[0-9]{2}:[0-9]{2}$/)]],
    enabled: [true],
  });

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const rows = await this.slotsService.listForScenario(this.scenarioId());
      this.slots.set(rows);
      this.changed.emit(rows.length);
    } catch {
      /* interceptor toasts */
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({ slot_id: '', days: [0, 1, 2, 3, 4], start: '08:00', end: '08:15', enabled: true });
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
          days: values.days,
          start: values.start,
          end: values.end,
          enabled: values.enabled,
        });
        this.messages.add({ severity: 'success', summary: 'Créneau mis à jour', detail: values.slot_id, life: 3000 });
      } else {
        const dto: Slot = {
          slot_id: values.slot_id,
          scenario_id: this.scenarioId(),
          days: values.days,
          start: values.start,
          end: values.end,
          enabled: values.enabled,
        };
        await this.slotsService.create(dto, this.idempotencyKey);
        this.messages.add({ severity: 'success', summary: 'Créneau créé', detail: values.slot_id, life: 3000 });
      }
      this.closeDialog();
      await this.load();
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
        summary: s.enabled ? 'Créneau activé' : 'Créneau désactivé',
        detail: s.slot_id,
        life: 2000,
      });
    } catch {
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
          this.messages.add({ severity: 'success', summary: 'Créneau supprimé', detail: s.slot_id, life: 3000 });
          await this.load();
        } catch {
          /* toast */
        }
      },
    });
  }
}
