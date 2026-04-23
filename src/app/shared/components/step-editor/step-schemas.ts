/**
 * Step schemas — the source of truth that drives the `StepEditorComponent`
 * form rendering. Each DSL step type declares its fields and their types so
 * the form knows what widgets to render and how to validate.
 *
 * Hardcoded today (option A). When the backend starts exposing
 * `GET /api/v1/scenarios/step-types` (option B), swap `STEP_SCHEMAS` for a
 * `signal<StepSchema[]>` fed by a service — no other change required, the
 * `StepEditorComponent` only reads by lookup.
 */

export type FieldKind =
  | 'text'
  | 'url'
  | 'integer'
  | 'number'
  | 'enum'
  | 'boolean'
  | 'json';

export interface FieldSchema {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  default?: unknown;
  values?: readonly string[];
  placeholder?: string;
  help?: string;
  multiline?: boolean;
}

export interface StepSchema {
  type: string;
  label: string;
  icon: string;
  description?: string;
  fields: readonly FieldSchema[];
  /** Composite step types have nested `steps` arrays; the form renders the
   * top-level fields and delegates sub-step editing to the enclosing editor
   * (or JSON mode for v1). */
  composite?: boolean;
}

// ---- Shared field fragments --------------------------------------------

const BY_FIELD: FieldSchema = {
  name: 'by',
  label: 'Sélecteur par',
  kind: 'enum',
  required: true,
  values: ['css', 'xpath', 'id'],
  default: 'css',
};

const LOCATOR_FIELD: FieldSchema = {
  name: 'locator',
  label: 'Valeur du sélecteur',
  kind: 'text',
  required: true,
  placeholder: '.my-btn',
};

const TIMEOUT_FIELD: FieldSchema = {
  name: 'timeout',
  label: 'Timeout (secondes)',
  kind: 'integer',
  default: 10,
};

const MATCH_FIELD: FieldSchema = {
  name: 'match',
  label: 'Correspondance',
  kind: 'enum',
  values: ['contains', 'equals'],
  default: 'contains',
};

// ---- Transverse fields (rendered in the "Avancé" collapsible section) --

export const COMMON_FIELDS: readonly FieldSchema[] = [
  {
    name: 'when',
    label: 'Condition',
    kind: 'text',
    placeholder: 'context_equals:env=prod',
    help: "context_exists:X, context_equals:X=val, context_in:X=a,b, context_matches:X=regex",
  },
  {
    name: 'retry',
    label: 'Tentatives supplémentaires',
    kind: 'integer',
    default: 0,
  },
  {
    name: 'retry_delay_seconds',
    label: 'Délai entre tentatives (s)',
    kind: 'number',
  },
  {
    name: 'retry_backoff_seconds',
    label: 'Backoff entre tentatives (s)',
    kind: 'number',
  },
  {
    name: 'timeout_seconds',
    label: 'Timeout global (s)',
    kind: 'number',
  },
  {
    name: 'continue_on_error',
    label: "Continuer en cas d'erreur",
    kind: 'boolean',
    default: false,
  },
];

// ---- Step catalog ------------------------------------------------------

export const STEP_SCHEMAS: readonly StepSchema[] = [
  // -- Navigation / interaction -----------------------------------------
  {
    type: 'open_url',
    label: 'Ouvrir une URL',
    icon: 'pi-globe',
    fields: [
      { name: 'url', label: 'URL', kind: 'url', required: true, placeholder: 'https://example.com' },
    ],
  },
  {
    type: 'click',
    label: 'Cliquer sur un élément',
    icon: 'pi-arrow-up-right',
    fields: [BY_FIELD, LOCATOR_FIELD, TIMEOUT_FIELD],
  },
  {
    type: 'input_text',
    label: 'Saisir du texte',
    icon: 'pi-pencil',
    fields: [
      BY_FIELD,
      LOCATOR_FIELD,
      { name: 'text', label: 'Texte à saisir', kind: 'text', required: true, multiline: true },
      { name: 'clear_first', label: 'Effacer le champ avant', kind: 'boolean', default: true },
      TIMEOUT_FIELD,
    ],
  },
  {
    type: 'select_option',
    label: 'Choisir une option',
    icon: 'pi-list',
    fields: [
      BY_FIELD,
      LOCATOR_FIELD,
      {
        name: 'value',
        label: 'Valeur (exclusif avec visible_text / index)',
        kind: 'text',
      },
      {
        name: 'visible_text',
        label: 'Texte visible (exclusif avec value / index)',
        kind: 'text',
      },
      {
        name: 'index',
        label: 'Index (exclusif avec value / visible_text)',
        kind: 'integer',
      },
      TIMEOUT_FIELD,
    ],
  },
  {
    type: 'wait_for_element',
    label: 'Attendre un élément',
    icon: 'pi-hourglass',
    fields: [BY_FIELD, LOCATOR_FIELD, TIMEOUT_FIELD],
  },
  {
    type: 'wait_until_url_contains',
    label: "Attendre que l'URL contienne",
    icon: 'pi-hourglass',
    fields: [
      { name: 'value', label: 'Fragment recherché', kind: 'text', required: true },
      TIMEOUT_FIELD,
    ],
  },
  {
    type: 'wait_until_title_contains',
    label: 'Attendre que le titre contienne',
    icon: 'pi-hourglass',
    fields: [
      { name: 'value', label: 'Fragment recherché', kind: 'text', required: true },
      TIMEOUT_FIELD,
    ],
  },

  // -- Assertions --------------------------------------------------------
  {
    type: 'assert_text',
    label: 'Vérifier un texte',
    icon: 'pi-check-circle',
    fields: [
      BY_FIELD,
      LOCATOR_FIELD,
      { name: 'text', label: 'Texte attendu', kind: 'text', required: true },
      MATCH_FIELD,
      TIMEOUT_FIELD,
    ],
  },
  {
    type: 'assert_attribute',
    label: 'Vérifier un attribut',
    icon: 'pi-check-circle',
    fields: [
      BY_FIELD,
      LOCATOR_FIELD,
      { name: 'attribute', label: "Nom de l'attribut", kind: 'text', required: true },
      { name: 'value', label: 'Valeur attendue', kind: 'text', required: true },
      MATCH_FIELD,
      TIMEOUT_FIELD,
    ],
  },

  // -- Extraction vers contexte -----------------------------------------
  {
    type: 'extract_text_to_context',
    label: 'Mémoriser le texte dans le contexte',
    icon: 'pi-copy',
    fields: [
      BY_FIELD,
      LOCATOR_FIELD,
      { name: 'key', label: 'Clé de contexte', kind: 'text', required: true, placeholder: 'username_display' },
      TIMEOUT_FIELD,
    ],
  },
  {
    type: 'extract_attribute_to_context',
    label: 'Mémoriser un attribut dans le contexte',
    icon: 'pi-copy',
    fields: [
      BY_FIELD,
      LOCATOR_FIELD,
      { name: 'attribute', label: "Nom de l'attribut", kind: 'text', required: true },
      { name: 'key', label: 'Clé de contexte', kind: 'text', required: true },
      TIMEOUT_FIELD,
    ],
  },

  // -- Utilitaires navigateur / captures --------------------------------
  {
    type: 'screenshot',
    label: "Capture d'écran",
    icon: 'pi-camera',
    fields: [
      { name: 'path', label: 'Chemin relatif', kind: 'text', required: true, placeholder: '/artifacts/login_ok.png' },
    ],
  },
  {
    type: 'close_browser',
    label: 'Fermer le navigateur',
    icon: 'pi-times-circle',
    fields: [],
  },

  // -- Temporisation -----------------------------------------------------
  {
    type: 'sleep',
    label: 'Attendre un délai fixe',
    icon: 'pi-clock',
    fields: [
      { name: 'seconds', label: 'Secondes', kind: 'number', required: true, default: 1 },
    ],
  },
  {
    type: 'sleep_random',
    label: 'Attendre un délai aléatoire',
    icon: 'pi-clock',
    fields: [
      { name: 'min_seconds', label: 'Minimum (s)', kind: 'number', required: true, default: 1 },
      { name: 'max_seconds', label: 'Maximum (s)', kind: 'number', required: true, default: 3 },
    ],
  },

  // -- Effets externes ---------------------------------------------------
  {
    type: 'notify',
    label: 'Notifier (Pushover)',
    icon: 'pi-bell',
    fields: [
      {
        name: 'message',
        label: 'Message',
        kind: 'text',
        required: true,
        multiline: true,
        help: 'Variables: {slot_id}, {scenario_id}, {execution_id}, {executed_at}, {current_step}, {error_message}',
      },
      {
        name: 'pushover_key',
        label: 'Canal Pushover (optionnel)',
        kind: 'text',
        placeholder: 'channel_default',
      },
    ],
  },
  {
    type: 'http_request',
    label: 'Requête HTTP',
    icon: 'pi-link',
    fields: [
      {
        name: 'method',
        label: 'Méthode',
        kind: 'enum',
        required: true,
        values: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        default: 'GET',
      },
      { name: 'url', label: 'URL', kind: 'url', required: true },
      { name: 'headers', label: 'En-têtes (JSON object)', kind: 'json' },
      { name: 'json', label: 'Corps JSON', kind: 'json' },
      { name: 'data', label: 'Corps form-urlencoded (JSON object)', kind: 'json' },
      {
        name: 'expected_status',
        label: 'Statut attendu',
        kind: 'integer',
        default: 200,
      },
      TIMEOUT_FIELD,
    ],
  },
  {
    type: 'require_enterprise_network',
    label: 'Exiger le réseau entreprise',
    icon: 'pi-lock',
    fields: [
      {
        name: 'network_key',
        label: 'Clé réseau (optionnelle)',
        kind: 'text',
        placeholder: 'network_default',
      },
    ],
  },

  // -- Contexte ----------------------------------------------------------
  {
    type: 'set_context',
    label: 'Stocker une valeur en contexte',
    icon: 'pi-save',
    fields: [
      { name: 'key', label: 'Clé', kind: 'text', required: true },
      { name: 'value', label: 'Valeur', kind: 'text', required: true },
    ],
  },
  {
    type: 'format_context',
    label: 'Formater une valeur en contexte',
    icon: 'pi-save',
    fields: [
      { name: 'key', label: 'Clé', kind: 'text', required: true },
      {
        name: 'template',
        label: 'Modèle',
        kind: 'text',
        required: true,
        multiline: true,
        help: 'Utilise les variables disponibles, ex: "Bonjour {username_display}"',
      },
    ],
  },

  // -- Structures composites (éditées en mode JSON pour v1) -------------
  {
    type: 'group',
    label: 'Groupe d\'étapes',
    icon: 'pi-folder',
    composite: true,
    fields: [],
  },
  {
    type: 'parallel',
    label: 'Exécution en parallèle',
    icon: 'pi-sitemap',
    composite: true,
    fields: [],
  },
  {
    type: 'repeat',
    label: 'Répéter N fois',
    icon: 'pi-replay',
    composite: true,
    fields: [
      { name: 'times', label: 'Nombre de répétitions', kind: 'integer', required: true, default: 2 },
    ],
  },
  {
    type: 'try',
    label: 'Tenter / rattraper',
    icon: 'pi-shield',
    composite: true,
    fields: [],
  },
];

const BY_TYPE: Record<string, StepSchema> = Object.fromEntries(
  STEP_SCHEMAS.map((s) => [s.type, s]),
);

export function findStepSchema(type: string): StepSchema | null {
  return BY_TYPE[type] ?? null;
}

/**
 * Lazy-initialised public dropdown list (type + human label), sorted by
 * French label with composite types grouped at the end.
 */
export const STEP_TYPE_OPTIONS: readonly { type: string; label: string; icon: string; composite: boolean }[] =
  [...STEP_SCHEMAS]
    .sort((a, b) => {
      if (!!a.composite !== !!b.composite) return a.composite ? 1 : -1;
      return a.label.localeCompare(b.label, 'fr');
    })
    .map((s) => ({ type: s.type, label: s.label, icon: s.icon, composite: !!s.composite }));
