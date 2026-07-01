import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { stepLabel, type StepLike } from '../../../core/api/step-label';

/** PrimeIcon per step type, so a step reads at a glance. */
const STEP_ICONS: Record<string, string> = {
  open_url: 'pi-globe',
  click: 'pi-arrow-up-right',
  input_text: 'pi-pencil',
  wait_for_element: 'pi-clock',
  assert_text: 'pi-check-circle',
  assert_attribute: 'pi-check-circle',
  select_option: 'pi-list',
  extract_text_to_context: 'pi-download',
  extract_attribute_to_context: 'pi-download',
  screenshot: 'pi-camera',
  wait_until_url_contains: 'pi-clock',
  wait_until_title_contains: 'pi-clock',
  close_browser: 'pi-times-circle',
  sleep: 'pi-clock',
  sleep_random: 'pi-clock',
  notify: 'pi-bell',
  http_request: 'pi-send',
  require_enterprise_network: 'pi-shield',
  set_context: 'pi-database',
  format_context: 'pi-database',
  group: 'pi-folder',
  parallel: 'pi-clone',
  repeat: 'pi-replay',
  try: 'pi-shield',
};

const asStepList = (value: unknown): StepLike[] | null =>
  Array.isArray(value) && value.length > 0 ? (value as StepLike[]) : null;

/**
 * Renders a list of DSL steps as human-readable French rows (via `stepLabel`),
 * one icon + sentence per step, numbered `prefix.n`. Composite steps
 * (group / parallel / repeat / try) recurse: their children (`steps` /
 * `try_steps`) are indented underneath, and a `try`'s `catch_steps` get their
 * own "en cas d'erreur" sub-list. The component references itself for recursion.
 */
@Component({
  selector: 'app-step-display',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <div class="flex flex-column gap-2">
      @for (step of steps(); track $index) {
        <div class="step-row">
          <div class="flex align-items-start gap-2">
            <span class="step-index">{{ prefix() }}{{ $index + 1 }}</span>
            <i [class]="'pi ' + iconFor(step) + ' step-icon'" aria-hidden="true"></i>
            <div class="flex-1 min-w-0">
              <div class="step-label">{{ label(step) }}</div>

              @if (childrenOf(step); as kids) {
                <div class="step-children">
                  <app-step-display [steps]="kids" [prefix]="prefix() + ($index + 1) + '.'" />
                </div>
              }
              @if (catchOf(step); as kids) {
                <div class="step-children">
                  <div class="step-caption">En cas d'erreur :</div>
                  <app-step-display [steps]="kids" [prefix]="prefix() + ($index + 1) + '.e'" />
                </div>
              }
            </div>
            @if (editable() && prefix() === '') {
              <div class="flex gap-1 flex-shrink-0">
                <p-button
                  icon="pi pi-pencil"
                  [rounded]="true"
                  [text]="true"
                  size="small"
                  ariaLabel="Éditer l'étape"
                  (onClick)="edit.emit($index)"
                />
                <p-button
                  icon="pi pi-trash"
                  [rounded]="true"
                  [text]="true"
                  size="small"
                  severity="danger"
                  ariaLabel="Supprimer l'étape"
                  (onClick)="remove.emit($index)"
                />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .step-row {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--surface-border, #e5e7eb);
        border-radius: 6px;
        background: var(--surface-card, #fff);
      }
      .step-index {
        min-width: 2rem;
        font-variant-numeric: tabular-nums;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--fox-primary);
      }
      .step-icon {
        margin-top: 0.15rem;
        font-size: 0.85rem;
        color: var(--text-color-secondary, #6b7280);
      }
      .step-label {
        line-height: 1.35;
      }
      .step-children {
        margin-top: 0.5rem;
        padding-left: 0.75rem;
        border-left: 2px solid var(--surface-border, #e5e7eb);
      }
      .step-caption {
        font-size: 0.75rem;
        color: var(--text-color-secondary, #6b7280);
        margin-bottom: 0.35rem;
      }
    `,
  ],
})
export class StepDisplayComponent {
  readonly steps = input.required<StepLike[]>();
  readonly prefix = input<string>('');
  /** When true, top-level steps (prefix === '') show edit/delete actions. */
  readonly editable = input<boolean>(false);
  readonly edit = output<number>();
  readonly remove = output<number>();

  label(step: StepLike): string {
    return stepLabel(step);
  }

  iconFor(step: StepLike): string {
    return STEP_ICONS[step.type] ?? 'pi-angle-right';
  }

  /** group / parallel / repeat use `steps`; try uses `try_steps`. */
  childrenOf(step: StepLike): StepLike[] | null {
    return asStepList(step['steps']) ?? asStepList(step['try_steps']);
  }

  catchOf(step: StepLike): StepLike[] | null {
    return asStepList(step['catch_steps']);
  }
}
