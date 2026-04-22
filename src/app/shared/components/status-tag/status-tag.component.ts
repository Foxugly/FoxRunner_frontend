import { Component, Input, computed, signal } from '@angular/core';
import { TagModule } from 'primeng/tag';

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

const LABELS_FR: Record<string, string> = {
  queued: 'En file',
  running: 'En cours',
  success: 'Réussi',
  failed: 'Échec',
  cancelled: 'Annulé',
  skipped: 'Ignoré',
  pending: 'En attente',
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
  private readonly _status = signal<string>('');
  @Input({ required: true }) set status(v: string) {
    this._status.set(v);
  }
  readonly severity = computed<Severity>(() => SEVERITIES[this._status()] ?? 'secondary');
  readonly label = computed(() => LABELS_FR[this._status()] ?? this._status());
}
