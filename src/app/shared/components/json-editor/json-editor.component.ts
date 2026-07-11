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
  styleUrl: './json-editor.component.scss',
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
