import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  forwardRef,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
import { StepDisplayComponent } from '../step-display/step-display.component';
import {
  COMMON_FIELDS,
  type FieldSchema,
  STEP_TYPE_OPTIONS,
  type StepSchema,
  findStepSchema,
} from './step-schemas';

type Mode = 'form' | 'json';

// Sub-step array keys that composite steps own and that the editor must not
// drop when recomputing the step from form fields.
const NESTED_KEYS = [
  'steps',
  'try_steps',
  'catch_steps',
  'finally_steps',
] as const;

function defaultsFor(schema: StepSchema): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of schema.fields) {
    if (f.default !== undefined) out[f.name] = f.default;
  }
  return out;
}

function splitStep(
  step: Record<string, unknown>,
  schema: StepSchema | null,
): { typed: Record<string, unknown>; common: Record<string, unknown> } {
  const commonNames = new Set(COMMON_FIELDS.map((f) => f.name));
  const typedNames = new Set(schema?.fields.map((f) => f.name) ?? []);
  const typed: Record<string, unknown> = {};
  const common: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(step)) {
    if (k === 'type') continue;
    if (commonNames.has(k)) common[k] = v;
    else if (typedNames.has(k)) typed[k] = v;
  }
  return { typed, common };
}

function isEmpty(v: unknown): boolean {
  return (
    v === undefined ||
    v === null ||
    v === '' ||
    (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0)
  );
}

@Component({
  selector: 'app-step-editor',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    PanelModule,
    SelectModule,
    SelectButtonModule,
    TextareaModule,
    ToggleSwitchModule,
    TooltipModule,
    JsonEditorComponent,
    StepDisplayComponent,
    forwardRef(() => StepEditorComponent),
  ],
  template: `
    <div class="flex flex-column gap-3">
      <!-- Header: type picker + mode toggle -->
      <div class="flex flex-wrap align-items-end justify-content-between gap-3">
        <div class="flex flex-column gap-2 flex-1 min-w-0">
          <label for="step-type" class="font-semibold">Type d'étape</label>
          <p-select
            inputId="step-type"
            [options]="typeOptions"
            optionLabel="label"
            optionValue="type"
            [filter]="true"
            filterBy="label,type"
            placeholder="Choisir un type…"
            [(ngModel)]="typeValue"
            (onChange)="onTypeChange($event.value)"
            appendTo="body"
            styleClass="w-full"
          >
            <ng-template let-o pTemplate="selectedItem">
              @if (o) {
                <span class="flex align-items-center gap-2">
                  <i [class]="'pi ' + o.icon"></i>
                  <span>{{ o.label }}</span>
                  <code class="text-xs text-color-secondary">{{ o.type }}</code>
                </span>
              }
            </ng-template>
            <ng-template let-o pTemplate="item">
              <span class="flex align-items-center gap-2">
                <i [class]="'pi ' + o.icon" style="min-width: 1rem"></i>
                <span>{{ o.label }}</span>
                <code class="text-xs text-color-secondary ml-auto">{{ o.type }}</code>
                @if (o.composite) {
                  <span class="text-xs text-color-secondary">(composite)</span>
                }
              </span>
            </ng-template>
          </p-select>
          @if (schema()?.description; as desc) {
            <small class="text-color-secondary">{{ desc }}</small>
          }
        </div>

        <p-selectbutton
          [options]="modeOptions"
          optionLabel="label"
          optionValue="value"
          [(ngModel)]="modeValue"
          (onChange)="onModeChange($event.value)"
          [allowEmpty]="false"
        />
      </div>

      @if (mode() === 'form' && schema(); as s) {
        <!-- Dedicated fields for the selected type -->
        @if (s.fields.length === 0 && !s.composite) {
          <small class="text-color-secondary">
            Ce type d'étape n'a pas de paramètres propres.
          </small>
        } @else {
          <div class="flex flex-column gap-3">
            @for (f of s.fields; track f.name) {
              <div class="flex flex-column gap-1">
                <label [attr.for]="'f-' + f.name">
                  {{ f.label }}
                  @if (f.required) {
                    <span class="text-red-500">*</span>
                  }
                </label>

                @switch (f.kind) {
                  @case ('text') {
                    @if (f.multiline) {
                      <textarea
                        [id]="'f-' + f.name"
                        pTextarea
                        rows="3"
                        [ngModel]="typed()[f.name]"
                        (ngModelChange)="onTypedChange(f.name, $event)"
                        [placeholder]="f.placeholder ?? ''"
                      ></textarea>
                    } @else {
                      <input
                        [id]="'f-' + f.name"
                        pInputText
                        [ngModel]="typed()[f.name]"
                        (ngModelChange)="onTypedChange(f.name, $event)"
                        [placeholder]="f.placeholder ?? ''"
                      />
                    }
                  }
                  @case ('url') {
                    <input
                      [id]="'f-' + f.name"
                      pInputText
                      type="url"
                      [ngModel]="typed()[f.name]"
                      (ngModelChange)="onTypedChange(f.name, $event)"
                      [placeholder]="f.placeholder ?? 'https://…'"
                    />
                  }
                  @case ('integer') {
                    <p-inputnumber
                      [inputId]="'f-' + f.name"
                      [ngModel]="typed()[f.name]"
                      (ngModelChange)="onTypedChange(f.name, $event)"
                      [showButtons]="true"
                      buttonLayout="stacked"
                    />
                  }
                  @case ('number') {
                    <p-inputnumber
                      [inputId]="'f-' + f.name"
                      [ngModel]="typed()[f.name]"
                      (ngModelChange)="onTypedChange(f.name, $event)"
                      [minFractionDigits]="0"
                      [maxFractionDigits]="3"
                    />
                  }
                  @case ('enum') {
                    <p-select
                      [inputId]="'f-' + f.name"
                      [options]="enumValues(f)"
                      [ngModel]="typed()[f.name]"
                      (ngModelChange)="onTypedChange(f.name, $event)"
                      appendTo="body"
                    />
                  }
                  @case ('boolean') {
                    <p-toggleswitch
                      [inputId]="'f-' + f.name"
                      [ngModel]="typed()[f.name] === true"
                      (ngModelChange)="onTypedChange(f.name, $event)"
                      [ariaLabel]="f.label"
                    />
                  }
                  @case ('json') {
                    <app-json-editor
                      [value]="typed()[f.name] ?? {}"
                      (valueChange)="onTypedChange(f.name, $event)"
                      [rows]="8"
                    />
                  }
                }
                @if (f.help) {
                  <small class="text-color-secondary">{{ f.help }}</small>
                }
              </div>
            }
          </div>
        }

        <!-- Common transverse fields, collapsed by default -->
        <p-panel
          header="Avancé (retry, timeout, condition, continue_on_error)"
          [toggleable]="true"
          [collapsed]="!advancedOpen()"
          (collapsedChange)="advancedOpen.set(!$event)"
        >
          <div class="flex flex-column gap-3">
            @for (f of commonFields; track f.name) {
              <div class="flex flex-column gap-1">
                <label [attr.for]="'cf-' + f.name">{{ f.label }}</label>
                @switch (f.kind) {
                  @case ('text') {
                    <input
                      [id]="'cf-' + f.name"
                      pInputText
                      [ngModel]="common()[f.name]"
                      (ngModelChange)="onCommonChange(f.name, $event)"
                      [placeholder]="f.placeholder ?? ''"
                    />
                  }
                  @case ('integer') {
                    <p-inputnumber
                      [inputId]="'cf-' + f.name"
                      [ngModel]="common()[f.name]"
                      (ngModelChange)="onCommonChange(f.name, $event)"
                    />
                  }
                  @case ('number') {
                    <p-inputnumber
                      [inputId]="'cf-' + f.name"
                      [ngModel]="common()[f.name]"
                      (ngModelChange)="onCommonChange(f.name, $event)"
                      [minFractionDigits]="0"
                      [maxFractionDigits]="3"
                    />
                  }
                  @case ('boolean') {
                    <p-toggleswitch
                      [inputId]="'cf-' + f.name"
                      [ngModel]="common()[f.name] === true"
                      (ngModelChange)="onCommonChange(f.name, $event)"
                      [ariaLabel]="f.label"
                    />
                  }
                }
                @if (f.help) {
                  <small class="text-color-secondary">{{ f.help }}</small>
                }
              </div>
            }
          </div>
        </p-panel>

        <!-- Sub-step arrays for composite types (try_steps, catch_steps, …) -->
        @for (arr of s.arrays ?? []; track arr.key) {
          <p-panel [header]="arr.label + ' (' + subSteps(arr.key).length + ')'" [toggleable]="true">
            <div class="flex flex-column gap-2">
              @if (subSteps(arr.key).length === 0) {
                <small class="text-color-secondary">Aucune sous-étape.</small>
              }
              @for (sub of subSteps(arr.key); track $index; let i = $index) {
                <div class="flex align-items-start justify-content-between gap-2 p-2 border-1 surface-border border-round">
                  <div class="flex align-items-start gap-2 flex-1 min-w-0">
                    <span class="text-color-secondary text-sm" style="min-width: 2rem">
                      #{{ i }}
                    </span>
                    <app-step-display [step]="sub" />
                  </div>
                  <div class="flex gap-1 flex-shrink-0">
                    <p-button
                      icon="pi pi-arrow-up"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      [disabled]="i === 0"
                      (onClick)="moveSubStep(arr.key, i, -1)"
                      ariaLabel="Monter"
                      pTooltip="Monter"
                    />
                    <p-button
                      icon="pi pi-arrow-down"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      [disabled]="i === subSteps(arr.key).length - 1"
                      (onClick)="moveSubStep(arr.key, i, 1)"
                      ariaLabel="Descendre"
                      pTooltip="Descendre"
                    />
                    <p-button
                      icon="pi pi-pencil"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      (onClick)="openEditSubStep(arr.key, i)"
                      ariaLabel="Modifier"
                      pTooltip="Modifier"
                    />
                    <p-button
                      icon="pi pi-trash"
                      [rounded]="true"
                      [text]="true"
                      size="small"
                      severity="danger"
                      (onClick)="deleteSubStep(arr.key, i)"
                      ariaLabel="Supprimer"
                      pTooltip="Supprimer"
                    />
                  </div>
                </div>
              }
              <p-button
                label="Ajouter une sous-étape"
                icon="pi pi-plus"
                severity="secondary"
                [text]="true"
                styleClass="align-self-start"
                (onClick)="openAddSubStep(arr.key)"
              />
            </div>
          </p-panel>
        }
      } @else {
        <!-- JSON fallback: raw editor for power users or unknown types -->
        <app-json-editor
          label="Étape (JSON brut)"
          [value]="rawJson()"
          (valueChange)="onJsonChange($event)"
          (validChange)="jsonValid.set($event)"
          [rows]="14"
        />
      }
    </div>

    <!-- Nested dialog: sub-step editor for composite arrays -->
    <p-dialog
      [modal]="true"
      [(visible)]="subDialogOpenValue"
      [header]="
        (subDialogIndex() === null ? 'Ajouter à ' : 'Modifier #' + subDialogIndex() + ' de ') +
        subDialogArrayKey()
      "
      [style]="{ width: '720px' }"
    >
      <app-step-editor
        [step]="subDialogDraft()"
        (valueChange)="onSubDialogDraftChange($event)"
        (validChange)="subDialogValid.set($event)"
      />
      <ng-template pTemplate="footer">
        <p-button
          label="Annuler"
          severity="secondary"
          [text]="true"
          (onClick)="subDialogOpen.set(false)"
        />
        <p-button
          label="Enregistrer"
          icon="pi pi-save"
          [disabled]="!subDialogValid()"
          (onClick)="saveSubStepDraft()"
        />
      </ng-template>
    </p-dialog>
  `,
})
export class StepEditorComponent implements OnChanges {
  @Input({ required: true }) step: Record<string, unknown> = {};
  @Output() readonly valueChange = new EventEmitter<Record<string, unknown>>();
  @Output() readonly validChange = new EventEmitter<boolean>();

  readonly typeOptions = [...STEP_TYPE_OPTIONS];
  readonly commonFields = [...COMMON_FIELDS];
  readonly modeOptions: { label: string; value: Mode }[] = [
    { label: 'Formulaire', value: 'form' },
    { label: 'JSON', value: 'json' },
  ];

  enumValues(f: FieldSchema): string[] {
    return f.values ? [...f.values] : [];
  }

  private readonly _type = signal<string>('');
  private readonly _typed = signal<Record<string, unknown>>({});
  private readonly _common = signal<Record<string, unknown>>({});
  private readonly _nested = signal<Record<string, Record<string, unknown>[]>>({});
  private readonly _mode = signal<Mode>('form');
  private readonly _raw = signal<Record<string, unknown>>({});
  readonly advancedOpen = signal(false);
  readonly jsonValid = signal(true);

  readonly schema = computed(() => findStepSchema(this._type()));
  readonly mode = this._mode.asReadonly();
  readonly typed = this._typed.asReadonly();
  readonly common = this._common.asReadonly();
  readonly nested = this._nested.asReadonly();
  readonly rawJson = this._raw.asReadonly();

  // Nested sub-step edit dialog state. When the user clicks + or ✏ on a
  // sub-step we open a p-dialog containing another StepEditorComponent.
  readonly subDialogOpen = signal(false);
  readonly subDialogArrayKey = signal<string>('');
  readonly subDialogIndex = signal<number | null>(null);
  readonly subDialogDraft = signal<Record<string, unknown>>({});
  readonly subDialogValid = signal(true);

  // Two-way-bound UI mirrors used by p-select / p-selectbutton / p-dialog ngModel.
  typeValue = '';
  modeValue: Mode = 'form';

  get subDialogOpenValue(): boolean {
    return this.subDialogOpen();
  }
  set subDialogOpenValue(v: boolean) {
    this.subDialogOpen.set(v);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('step' in changes) this.syncFromStep();
  }

  private syncFromStep(): void {
    const step = this.step ?? {};
    const type = typeof step['type'] === 'string' ? (step['type'] as string) : '';
    const schema = findStepSchema(type);
    const { typed, common } = splitStep(step, schema);
    const nested: Record<string, Record<string, unknown>[]> = {};
    for (const a of schema?.arrays ?? []) {
      const raw = step[a.key];
      nested[a.key] = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    }
    this._type.set(type);
    this._typed.set(typed);
    this._common.set(common);
    this._nested.set(nested);
    this._raw.set(step);
    // Default to form mode for all known types (composites render their
    // sub-step arrays as editable panels); JSON remains accessible via toggle.
    const nextMode: Mode = schema ? 'form' : 'json';
    this._mode.set(nextMode);
    this.typeValue = type;
    this.modeValue = nextMode;
    this.emit();
  }

  onTypeChange(type: string): void {
    const schema = findStepSchema(type);
    this._type.set(type);
    this._typed.set(schema ? defaultsFor(schema) : {});
    // Dropping the previous composite's sub-step arrays when switching to a
    // different type is intentional — they belong to the old type and would be
    // meaningless on the new one.
    this._nested.set({});
    // Common fields persist across type changes — retry/timeout/when are
    // transverse and the user's intent is usually independent of the type.
    const nextMode: Mode = schema ? 'form' : 'json';
    this._mode.set(nextMode);
    this.modeValue = nextMode;
    this.emit();
  }

  onModeChange(mode: Mode): void {
    this._mode.set(mode);
    if (mode === 'json') {
      // Build a raw snapshot so the JSON editor starts from the current form
      // values rather than whatever was last pasted.
      this._raw.set(this.compose());
    }
  }

  onTypedChange(name: string, value: unknown): void {
    this._typed.update((m) => ({ ...m, [name]: value }));
    this.emit();
  }

  onCommonChange(name: string, value: unknown): void {
    this._common.update((m) => ({ ...m, [name]: value }));
    this.emit();
  }

  onJsonChange(value: unknown): void {
    const next = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    this._raw.set(next);
    // Re-derive typed/common/nested so toggling back to form mode shows the values.
    const type = typeof next['type'] === 'string' ? (next['type'] as string) : '';
    const schema = findStepSchema(type);
    const { typed, common } = splitStep(next, schema);
    const nested: Record<string, Record<string, unknown>[]> = {};
    for (const a of schema?.arrays ?? []) {
      const raw = next[a.key];
      nested[a.key] = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    }
    this._type.set(type);
    this._typed.set(typed);
    this._common.set(common);
    this._nested.set(nested);
    this.typeValue = type;
    this.valueChange.emit(next);
    this.validChange.emit(this.jsonValid());
  }

  // ---- Sub-step management for composite types -----------------------

  subSteps(key: string): Record<string, unknown>[] {
    return this._nested()[key] ?? [];
  }

  openAddSubStep(key: string): void {
    this.subDialogArrayKey.set(key);
    this.subDialogIndex.set(null);
    this.subDialogDraft.set({ type: 'sleep', seconds: 1 });
    this.subDialogValid.set(true);
    this.subDialogOpen.set(true);
  }

  openEditSubStep(key: string, index: number): void {
    const arr = this.subSteps(key);
    const step = arr[index];
    if (!step) return;
    this.subDialogArrayKey.set(key);
    this.subDialogIndex.set(index);
    this.subDialogDraft.set(step);
    this.subDialogValid.set(true);
    this.subDialogOpen.set(true);
  }

  onSubDialogDraftChange(v: Record<string, unknown>): void {
    this.subDialogDraft.set(v);
  }

  saveSubStepDraft(): void {
    const key = this.subDialogArrayKey();
    const index = this.subDialogIndex();
    const draft = this.subDialogDraft();
    const current = this._nested();
    const arr = [...(current[key] ?? [])];
    if (index === null) arr.push(draft);
    else arr[index] = draft;
    this._nested.set({ ...current, [key]: arr });
    this.subDialogOpen.set(false);
    this.emit();
  }

  moveSubStep(key: string, index: number, direction: -1 | 1): void {
    const current = this._nested();
    const arr = [...(current[key] ?? [])];
    const target = index + direction;
    if (target < 0 || target >= arr.length) return;
    const tmp = arr[index];
    arr[index] = arr[target];
    arr[target] = tmp;
    this._nested.set({ ...current, [key]: arr });
    this.emit();
  }

  deleteSubStep(key: string, index: number): void {
    const current = this._nested();
    const arr = [...(current[key] ?? [])];
    arr.splice(index, 1);
    this._nested.set({ ...current, [key]: arr });
    this.emit();
  }

  private compose(): Record<string, unknown> {
    const type = this._type();
    const out: Record<string, unknown> = { type };
    for (const [k, v] of Object.entries(this._typed())) {
      if (!isEmpty(v)) out[k] = v;
    }
    for (const [k, v] of Object.entries(this._common())) {
      if (!isEmpty(v) && !(k === 'continue_on_error' && v === false)) {
        out[k] = v;
      }
    }
    // Sub-step arrays: emit the edited in-memory version for known composite
    // keys; preserve any other nested key carried by the original (defensive
    // for types whose arrays are not declared in the schema yet).
    const nested = this._nested();
    const schema = this.schema();
    const knownKeys = new Set(schema?.arrays?.map((a) => a.key) ?? []);
    for (const [k, arr] of Object.entries(nested)) {
      out[k] = arr;
    }
    const original = this.step ?? {};
    for (const k of NESTED_KEYS) {
      if (k in original && !knownKeys.has(k) && !(k in nested)) {
        out[k] = original[k];
      }
    }
    return out;
  }

  private emit(): void {
    const out = this.compose();
    this.valueChange.emit(out);
    this.validChange.emit(this.checkValid(out));
  }

  private checkValid(step: Record<string, unknown>): boolean {
    const schema = this.schema();
    if (!schema) return false;
    for (const f of schema.fields) {
      if (f.required && isEmpty(step[f.name])) return false;
    }
    return true;
  }
}
