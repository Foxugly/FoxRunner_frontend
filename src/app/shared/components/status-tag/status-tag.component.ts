import { Component, Input, computed, inject, signal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../../core/i18n/language.service';

type Severity = 'info' | 'warn' | 'success' | 'danger' | 'secondary' | 'contrast';

const SEVERITIES: Record<string, Severity> = {
  queued: 'info',
  running: 'warn',
  success: 'success',
  failed: 'danger',
  cancelled: 'secondary',
  skipped: 'secondary',
  pending: 'info',
};

@Component({
  selector: 'app-status-tag',
  standalone: true,
  imports: [TagModule],
  template: `
    <p-tag [severity]="severity()" [value]="label()" />
  `,
})
export class StatusTagComponent {
  private readonly i18n = inject(TranslocoService);
  private readonly lang = inject(LanguageService);
  private readonly _status = signal<string>('');
  @Input({ required: true }) set status(v: string) {
    this._status.set(v);
  }
  readonly severity = computed<Severity>(() => SEVERITIES[this._status()] ?? 'secondary');
  readonly label = computed(() => {
    this.lang.activeLang();
    const status = this._status();
    if (!status) return '';
    const key = `common.status.${status}`;
    const translated = this.i18n.translate<string>(key);
    return translated && translated !== key ? translated : status;
  });
}
