import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';
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
  imports: [ButtonModule, TranslocoPipe],
  template: `
    <div class="step-list">
      @for (step of steps(); track $index) {
        <div class="step-row">
          <div class="step-row__main">
            <span class="step-index">{{ prefix() }}{{ $index + 1 }}</span>
            <i [class]="'pi ' + iconFor(step) + ' step-icon'" aria-hidden="true"></i>
            <div class="step-row__body">
              <div class="step-label">{{ label(step) }}</div>

              @if (childrenOf(step); as kids) {
                <div class="step-children">
                  <app-step-display [steps]="kids" [prefix]="prefix() + ($index + 1) + '.'" />
                </div>
              }
              @if (catchOf(step); as kids) {
                <div class="step-children">
                  <div class="step-caption">{{ 'common.step.on_error' | transloco }}</div>
                  <app-step-display [steps]="kids" [prefix]="prefix() + ($index + 1) + '.e'" />
                </div>
              }
            </div>
            @if (editable() && prefix() === '') {
              <div class="step-row__actions">
                <p-button
                  icon="pi pi-pencil"
                  [rounded]="true"
                  [text]="true"
                  size="small"
                  severity="info"
                  [ariaLabel]="'common.step.edit_aria' | transloco"
                  (onClick)="edit.emit($index)"
                />
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  [rounded]="true"
                  [text]="true"
                  size="small"
                  severity="danger"
                  [ariaLabel]="'common.step.delete_aria' | transloco"
                  (onClick)="remove.emit($index)"
                />
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './step-display.component.scss',
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
