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

@Component({
  selector: 'app-json-editor',
  standalone: true,
  imports: [FormsModule, ButtonModule],
  template: `
    <div class="json-editor">
      <div class="json-editor__header">
        @if (label) {
          <span class="json-editor__label">{{ label }}</span>
        }
        <span class="json-editor__spacer"></span>
        @if (!valid()) {
          <span class="json-editor__status json-editor__status--error">
            <i class="pi pi-times-circle"></i>JSON invalide : {{ errorMessage() }}
          </span>
        } @else {
          <span class="json-editor__status json-editor__status--ok">
            <i class="pi pi-check"></i>JSON valide
          </span>
        }
        <p-button
          label="Formater"
          icon="pi pi-align-justify"
          size="small"
          severity="secondary"
          [text]="true"
          [disabled]="!valid()"
          (onClick)="format()"
        />
      </div>
      <textarea
        [rows]="rows"
        [ngModel]="text()"
        (ngModelChange)="onChange($event)"
        spellcheck="false"
        [attr.aria-label]="label"
        [placeholder]="placeholder"
      ></textarea>
    </div>
  `,
  styles: [
    `
      .json-editor {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .json-editor__header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .json-editor__label {
        font-weight: 600;
      }
      .json-editor__spacer {
        flex: 1 1 0;
      }
      .json-editor__status {
        font-size: 0.875rem;
      }
      .json-editor__status i {
        margin-right: 0.25rem;
      }
      .json-editor__status--error {
        color: var(--danger);
      }
      .json-editor__status--ok {
        color: var(--muted);
      }
      textarea {
        width: 100%;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.875rem;
        padding: 0.5rem;
        border: 1px solid var(--p-inputtext-border-color, #d4d4d8);
        border-radius: 0.375rem;
        background: var(--p-inputtext-background, #fff);
        color: var(--p-inputtext-color, inherit);
        resize: vertical;
        min-height: 8rem;
      }
      textarea:focus {
        outline: 2px solid var(--p-primary-color, #d97706);
        outline-offset: -2px;
      }
    `,
  ],
})
export class JsonEditorComponent implements OnChanges {
  @Input() label?: string;
  @Input() placeholder = '{}';
  @Input() rows = 16;
  @Input() value: unknown = null;
  @Output() readonly valueChange = new EventEmitter<unknown>();
  @Output() readonly validChange = new EventEmitter<boolean>();

  readonly text = signal<string>('{}');
  readonly errorMessage = signal<string>('');
  readonly valid = computed(() => this.errorMessage() === '');

  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) {
      try {
        this.text.set(JSON.stringify(this.value ?? {}, null, 2));
        this.errorMessage.set('');
        this.validChange.emit(true);
      } catch {
        this.text.set(String(this.value));
      }
    }
  }

  onChange(v: string): void {
    this.text.set(v);
    try {
      const parsed = JSON.parse(v);
      this.errorMessage.set('');
      this.validChange.emit(true);
      this.valueChange.emit(parsed);
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'erreur de parsing');
      this.validChange.emit(false);
    }
  }

  format(): void {
    try {
      const parsed = JSON.parse(this.text());
      this.text.set(JSON.stringify(parsed, null, 2));
    } catch {
      /* already signalled */
    }
  }
}
