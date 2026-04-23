import { Component, Input, computed, signal } from '@angular/core';
import { TagModule } from 'primeng/tag';

// Each step is rendered as a sequence of typed fragments — the component
// styles them differently (bold for verbs, monospace for selectors/paths,
// angled quotes for user-facing strings, plain text for connective tissue).
type Fragment =
  | { kind: 'verb'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'text'; text: string };

interface Visual {
  icon: string;
  fragments: Fragment[];
  childCount?: { label: string; count: number }[];
}

interface MetaChip {
  icon: string;
  label: string;
}

const verb = (text: string): Fragment => ({ kind: 'verb', text });
const code = (text: string): Fragment => ({ kind: 'code', text });
const quote = (text: string): Fragment => ({ kind: 'quote', text });
const txt = (text: string): Fragment => ({ kind: 'text', text });

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

function trunc(s: string, max = 40): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function locator(s: Record<string, unknown>): string {
  const loc = str(s['locator']);
  const by = str(s['by']).toLowerCase();
  if (!loc) return '';
  if (by === 'id') return `#${loc}`;
  return loc;
}

function stepsLen(s: Record<string, unknown>, key = 'steps'): number {
  const v = s[key];
  return Array.isArray(v) ? v.length : 0;
}

const RENDERERS: Record<string, (s: Record<string, unknown>) => Visual> = {
  open_url: (s) => ({
    icon: 'pi-globe',
    fragments: [verb('Ouvrir'), txt(' '), code(trunc(str(s['url']), 60))],
  }),
  click: (s) => ({
    icon: 'pi-arrow-up-right',
    fragments: [verb('Cliquer sur'), txt(' '), code(locator(s))],
  }),
  input_text: (s) => ({
    icon: 'pi-pencil',
    fragments: [
      verb('Saisir'),
      txt(' '),
      quote(trunc(str(s['text']))),
      txt(' dans '),
      code(locator(s)),
    ],
  }),
  select_option: (s) => {
    const value = str(s['value'] ?? s['visible_text'] ?? s['index']);
    return {
      icon: 'pi-list',
      fragments: [
        verb('Choisir'),
        txt(' '),
        quote(trunc(value)),
        txt(' dans '),
        code(locator(s)),
      ],
    };
  },
  wait_for_element: (s) => ({
    icon: 'pi-hourglass',
    fragments: [verb("Attendre l'élément"), txt(' '), code(locator(s))],
  }),
  wait_until_url_contains: (s) => ({
    icon: 'pi-hourglass',
    fragments: [verb("Attendre que l'URL contienne"), txt(' '), code(str(s['value']))],
  }),
  wait_until_title_contains: (s) => ({
    icon: 'pi-hourglass',
    fragments: [verb('Attendre que le titre contienne'), txt(' '), code(str(s['value']))],
  }),
  assert_text: (s) => {
    const match = str(s['match']) === 'equals' ? 'égal à' : 'contient';
    return {
      icon: 'pi-check-circle',
      fragments: [
        verb('Vérifier que'),
        txt(' '),
        code(locator(s)),
        txt(` ${match} `),
        quote(trunc(str(s['text']))),
      ],
    };
  },
  assert_attribute: (s) => {
    const match = str(s['match']) === 'equals' ? '=' : 'contient';
    return {
      icon: 'pi-check-circle',
      fragments: [
        verb('Vérifier que'),
        txt(' '),
        code(`${locator(s)}.${str(s['attribute'])}`),
        txt(` ${match} `),
        quote(trunc(str(s['value']))),
      ],
    };
  },
  extract_text_to_context: (s) => ({
    icon: 'pi-copy',
    fragments: [
      verb('Mémoriser le texte de'),
      txt(' '),
      code(locator(s)),
      txt(' dans '),
      code(`{${str(s['key'])}}`),
    ],
  }),
  extract_attribute_to_context: (s) => ({
    icon: 'pi-copy',
    fragments: [
      verb('Mémoriser'),
      txt(' '),
      code(`${locator(s)}.${str(s['attribute'])}`),
      txt(' dans '),
      code(`{${str(s['key'])}}`),
    ],
  }),
  screenshot: (s) => ({
    icon: 'pi-camera',
    fragments: [verb("Capture d'écran →"), txt(' '), code(trunc(str(s['path']), 40))],
  }),
  close_browser: () => ({
    icon: 'pi-times-circle',
    fragments: [verb('Fermer le navigateur')],
  }),
  sleep: (s) => ({
    icon: 'pi-clock',
    fragments: [verb('Attendre'), txt(' '), code(`${str(s['seconds'])} s`)],
  }),
  sleep_random: (s) => ({
    icon: 'pi-clock',
    fragments: [
      verb('Attendre entre'),
      txt(' '),
      code(`${str(s['min_seconds'])}`),
      txt(' et '),
      code(`${str(s['max_seconds'])} s`),
    ],
  }),
  notify: (s) => ({
    icon: 'pi-bell',
    fragments: [verb('Notifier'), txt(' '), quote(trunc(str(s['message']), 60))],
  }),
  http_request: (s) => {
    const method = str(s['method']).toUpperCase() || 'GET';
    const expected = s['expected_status'];
    const tail = typeof expected === 'number' ? ` → attendre ${expected}` : '';
    return {
      icon: 'pi-link',
      fragments: [
        verb(method),
        txt(' '),
        code(trunc(str(s['url']), 50)),
        txt(tail),
      ],
    };
  },
  require_enterprise_network: (s) => {
    const key = str(s['network_key']);
    return {
      icon: 'pi-lock',
      fragments: key
        ? [verb('Exiger le réseau'), txt(' '), code(key)]
        : [verb('Exiger le réseau entreprise')],
    };
  },
  set_context: (s) => ({
    icon: 'pi-save',
    fragments: [
      code(`{${str(s['key'])}}`),
      txt(' ← '),
      quote(trunc(str(s['value']))),
    ],
  }),
  format_context: (s) => ({
    icon: 'pi-save',
    fragments: [
      code(`{${str(s['key'])}}`),
      txt(' ← '),
      verb('format'),
      txt(' '),
      quote(trunc(str(s['template']), 50)),
    ],
  }),
  // Composite: show count of children as p-tag(s)
  group: (s) => ({
    icon: 'pi-folder',
    fragments: [verb('Groupe')],
    childCount: [{ label: 'étapes', count: stepsLen(s) }],
  }),
  parallel: (s) => ({
    icon: 'pi-sitemap',
    fragments: [verb('Parallèle')],
    childCount: [{ label: 'étapes', count: stepsLen(s) }],
  }),
  repeat: (s) => ({
    icon: 'pi-replay',
    fragments: [verb('Répéter'), txt(' '), code(`${str(s['times'])} fois`)],
    childCount: [{ label: 'étapes', count: stepsLen(s) }],
  }),
  try: (s) => ({
    icon: 'pi-shield',
    fragments: [verb('Tenter')],
    childCount: [
      { label: 'try', count: stepsLen(s, 'try_steps') },
      { label: 'sinon', count: stepsLen(s, 'catch_steps') },
      { label: 'finalement', count: stepsLen(s, 'finally_steps') },
    ],
  }),
};

function fallback(s: Record<string, unknown>): Visual {
  const keys = Object.keys(s).filter((k) => k !== 'type');
  const summary = keys
    .slice(0, 3)
    .map((k) => `${k}=${trunc(JSON.stringify(s[k]) ?? '', 20)}`)
    .join(' · ');
  return {
    icon: 'pi-circle',
    fragments: [verb(str(s['type']) || 'step'), txt(summary ? ' — ' + summary : '')],
  };
}

function renderStep(step: Record<string, unknown>): Visual {
  const type = str(step['type']);
  const renderer = RENDERERS[type];
  return renderer ? renderer(step) : fallback(step);
}

function metaChips(s: Record<string, unknown>): MetaChip[] {
  const chips: MetaChip[] = [];
  const retry = s['retry'];
  if (typeof retry === 'number' && retry > 0) {
    const delay = s['retry_delay_seconds'];
    const tail = typeof delay === 'number' && delay > 0 ? ` (${delay}s entre chaque)` : '';
    chips.push({ icon: 'pi-refresh', label: `${retry} tentative${retry > 1 ? 's' : ''}${tail}` });
  }
  const tsec =
    typeof s['timeout_seconds'] === 'number'
      ? s['timeout_seconds']
      : typeof s['timeout'] === 'number'
        ? s['timeout']
        : null;
  if (tsec !== null) {
    chips.push({ icon: 'pi-clock', label: `timeout ${tsec}s` });
  }
  const when = s['when'];
  if (typeof when === 'string' && when.length > 0) {
    chips.push({ icon: 'pi-filter', label: `si ${trunc(when, 50)}` });
  }
  if (s['continue_on_error'] === true) {
    chips.push({ icon: 'pi-flag', label: 'continue si erreur' });
  }
  return chips;
}

@Component({
  selector: 'app-step-display',
  standalone: true,
  imports: [TagModule],
  template: `
    <div class="step-display flex align-items-start gap-2">
      <i
        [class]="'pi ' + visual().icon + ' step-display-icon'"
        [attr.title]="rawType()"
        aria-hidden="true"
      ></i>
      <div class="flex flex-column gap-1 flex-1 min-w-0">
        <div class="step-display-line">
          @for (f of visual().fragments; track $index) {
            @switch (f.kind) {
              @case ('verb') {
                <strong>{{ f.text }}</strong>
              }
              @case ('code') {
                <code>{{ f.text }}</code>
              }
              @case ('quote') {
                <span class="step-display-quote">«&nbsp;{{ f.text }}&nbsp;»</span>
              }
              @default {
                <span>{{ f.text }}</span>
              }
            }
          }
          @if (visual().childCount; as counts) {
            @for (c of counts; track c.label) {
              <p-tag
                styleClass="ml-2"
                severity="secondary"
                [value]="c.count + ' ' + c.label"
              />
            }
          }
        </div>
        @if (chips().length > 0) {
          <div class="step-display-meta flex flex-wrap gap-2 text-color-secondary text-xs">
            @for (c of chips(); track c.label) {
              <span class="flex align-items-center gap-1">
                <i [class]="'pi ' + c.icon" style="font-size: 0.75rem" aria-hidden="true"></i>
                {{ c.label }}
              </span>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .step-display-icon {
        font-size: 1.1rem;
        color: var(--fox-primary, #d97706);
        margin-top: 0.15rem;
        flex-shrink: 0;
      }
      .step-display-line {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.25rem;
        line-height: 1.5;
      }
      .step-display-line code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.85em;
        background: var(--p-surface-100, #f3f4f6);
        padding: 0.05rem 0.35rem;
        border-radius: 3px;
      }
      .step-display-quote {
        font-style: italic;
      }
    `,
  ],
})
export class StepDisplayComponent {
  private readonly _step = signal<Record<string, unknown>>({});

  @Input({ required: true }) set step(value: Record<string, unknown>) {
    this._step.set(value);
  }

  readonly visual = computed(() => renderStep(this._step()));
  readonly chips = computed(() => metaChips(this._step()));
  readonly rawType = computed(() => str(this._step()['type']) || 'step');
}
