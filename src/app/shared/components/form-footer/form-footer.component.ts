import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';

/**
 * Shared save/cancel bar for edit forms (fleet OPERATIONS.md §3.15): Cancel
 * (secondary outlined, `pi pi-times`) + Save (primary, `pi pi-save`,
 * `[loading]`), aligned bottom-right. The parent owns submit/validation — this
 * component only emits `save` / `cancel`.
 */
@Component({
  selector: 'app-form-footer',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <div class="flex justify-content-end gap-2 mt-2 footer-actions">
      <p-button
        type="button"
        [label]="cancelLabel()"
        icon="pi pi-times"
        severity="secondary"
        [outlined]="true"
        [disabled]="loading()"
        (onClick)="cancelled.emit()"
      />
      <p-button
        type="button"
        [label]="saveLabel()"
        icon="pi pi-save"
        [loading]="loading()"
        [disabled]="disabled()"
        (onClick)="save.emit()"
      />
    </div>
  `,
})
export class FormFooterComponent {
  readonly saveLabel = input<string>('Enregistrer');
  readonly cancelLabel = input<string>('Annuler');
  readonly loading = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly save = output<void>();
  readonly cancelled = output<void>();
}
