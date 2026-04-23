import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { PanelModule } from 'primeng/panel';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { JsonEditorComponent } from '../json-editor/json-editor.component';
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
    InputNumberModule,
    InputTextModule,
    PanelModule,
    SelectModule,
    SelectButtonModule,
    TextareaModule,
    ToggleSwitchModule,
    JsonEditorComponent,
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
          [disabled]="schema()?.composite === true"
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

        @if (s.composite) {
          <small class="text-color-secondary">
            <i class="pi pi-info-circle mr-1"></i>
            Les sous-étapes des types composites s'éditent en mode JSON pour
            cette version.
          </small>
        }
      } @else {
        <!-- JSON fallback: raw editor for power users or composite types -->
        <app-json-editor
          label="Étape (JSON brut)"
          [value]="rawJson()"
          (valueChange)="onJsonChange($event)"
          (validChange)="jsonValid.set($event)"
          [rows]="14"
        />
      }
    </div>
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
  private readonly _mode = signal<Mode>('form');
  private readonly _raw = signal<Record<string, unknown>>({});
  readonly advancedOpen = signal(false);
  readonly jsonValid = signal(true);

  readonly schema = computed(() => findStepSchema(this._type()));
  readonly mode = this._mode.asReadonly();
  readonly typed = this._typed.asReadonly();
  readonly common = this._common.asReadonly();
  readonly rawJson = this._raw.asReadonly();

  // Two-way-bound UI mirrors used by p-select / p-selectbutton ngModel.
  typeValue = '';
  modeValue: Mode = 'form';

  ngOnChanges(changes: SimpleChanges): void {
    if ('step' in changes) this.syncFromStep();
  }

  private syncFromStep(): void {
    const step = this.step ?? {};
    const type = typeof step['type'] === 'string' ? (step['type'] as string) : '';
    const schema = findStepSchema(type);
    const { typed, common } = splitStep(step, schema);
    this._type.set(type);
    this._typed.set(typed);
    this._common.set(common);
    this._raw.set(step);
    // Default to form mode for atomic types and JSON for composites, so opening
    // the dialog on a new step doesn't inherit the previous mode.
    const nextMode: Mode = schema?.composite ? 'json' : 'form';
    this._mode.set(nextMode);
    this.typeValue = type;
    this.modeValue = nextMode;
    this.emit();
  }

  onTypeChange(type: string): void {
    const schema = findStepSchema(type);
    this._type.set(type);
    this._typed.set(schema ? defaultsFor(schema) : {});
    // Common fields persist across type changes — retry/timeout/when are
    // transverse and the user's intent is usually independent of the type.
    const nextMode: Mode = schema?.composite ? 'json' : 'form';
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
    // Re-derive typed/common so toggling back to form mode shows the values.
    const type = typeof next['type'] === 'string' ? (next['type'] as string) : '';
    const schema = findStepSchema(type);
    const { typed, common } = splitStep(next, schema);
    this._type.set(type);
    this._typed.set(typed);
    this._common.set(common);
    this.typeValue = type;
    this.valueChange.emit(next);
    this.validChange.emit(this.jsonValid());
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
    // Preserve sub-step arrays from the original step — the form never edits
    // them but must not drop them on a simple field change either.
    const original = this.step ?? {};
    for (const k of NESTED_KEYS) {
      if (k in original) out[k] = original[k];
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
