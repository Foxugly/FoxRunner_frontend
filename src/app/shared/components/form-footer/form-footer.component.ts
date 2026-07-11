import { Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../core/i18n/language.service';

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
    <div class="footer-actions">
      <p-button
        type="button"
        [label]="cancelText()"
        icon="pi pi-times"
        severity="secondary"
        [outlined]="true"
        [disabled]="loading()"
        (onClick)="cancelled.emit()"
      />
      <p-button
        type="button"
        [label]="saveText()"
        icon="pi pi-save"
        [loading]="loading()"
        [disabled]="disabled()"
        (onClick)="save.emit()"
      />
    </div>
  `,
  styleUrl: './form-footer.component.scss',
})
export class FormFooterComponent {
  private readonly i18n = inject(TranslocoService);
  private readonly lang = inject(LanguageService);
  readonly saveLabel = input<string>();
  readonly cancelLabel = input<string>();
  readonly loading = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly save = output<void>();
  readonly cancelled = output<void>();

  readonly saveText = computed(() => {
    this.lang.activeLang();
    return this.saveLabel() ?? this.i18n.translate('common.save');
  });
  readonly cancelText = computed(() => {
    this.lang.activeLang();
    return this.cancelLabel() ?? this.i18n.translate('common.cancel');
  });
}
