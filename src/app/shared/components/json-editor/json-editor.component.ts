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
    <div class="flex flex-column gap-2">
      <div class="flex align-items-center gap-2">
        @if (label) {
          <span class="font-semibold">{{ label }}</span>
        }
        <span class="flex-1"></span>
        @if (!valid()) {
          <span class="text-red-500 text-sm">
            <i class="pi pi-times-circle mr-1"></i>JSON invalide : {{ errorMessage() }}
          </span>
        } @else {
          <span class="text-color-secondary text-sm">
            <i class="pi pi-check mr-1"></i>JSON valide
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
        class="w-full font-mono text-sm"
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
      textarea {
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
