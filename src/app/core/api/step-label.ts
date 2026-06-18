export interface StepLike {
  type: string;
  [k: string]: unknown;
}

export function stepId(collection: string, index: number): string {
  return `${collection}[${index}]`;
}

const q = (v: unknown): string => `« ${String(v ?? '')} »`;

const LABELS: Record<string, (s: StepLike) => string> = {
  open_url: (s) => `Ouvrir la page ${q(s['url'])}`,
  click: (s) => `Cliquer sur ${q(s['locator'])}`,
  input_text: (s) => `Saisir du texte dans ${q(s['locator'])}`,
  wait_for_element: (s) => `Attendre l'élément ${q(s['locator'])}`,
  assert_text: (s) => `Vérifier le texte de ${q(s['locator'])}`,
  assert_attribute: (s) => `Vérifier l'attribut de ${q(s['locator'])}`,
  select_option: (s) => `Choisir une option dans ${q(s['locator'])}`,
  extract_text_to_context: (s) => `Extraire le texte de ${q(s['locator'])}`,
  extract_attribute_to_context: (s) => `Extraire un attribut de ${q(s['locator'])}`,
  screenshot: () => 'Capture d’écran',
  wait_until_url_contains: (s) => `Attendre que l'URL contienne ${q(s['value'])}`,
  wait_until_title_contains: (s) => `Attendre que le titre contienne ${q(s['value'])}`,
  close_browser: () => 'Fermer le navigateur',
  sleep: (s) => `Attendre ${String(s['seconds'] ?? '?')} s`,
  sleep_random: () => 'Attendre une durée aléatoire',
  notify: () => 'Envoyer une notification',
  http_request: (s) => `Requête HTTP vers ${q(s['url'])}`,
  require_enterprise_network: () => 'Exiger le réseau d’entreprise',
  set_context: (s) => `Définir la variable ${q(s['key'])}`,
  format_context: (s) => `Composer la variable ${q(s['key'])}`,
  group: () => 'Groupe d’étapes',
  parallel: () => 'Étapes en parallèle',
  repeat: (s) => `Répéter ${String(s['times'] ?? '?')} fois`,
  try: () => 'Bloc try / catch',
};

export function stepLabel(step: StepLike): string {
  const fn = LABELS[step.type];
  return fn ? fn(step) : step.type;
}
