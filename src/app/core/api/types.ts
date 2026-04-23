import type { components } from './schema';

type S = components['schemas'];

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// --- Users ---------------------------------------------------------------
// UserOut is returned by GET /users/me as well as the admin user endpoints.
// The paginated admin users endpoint has no documented response shape in the
// spec, so UserSummary keeps the same shape as UserOut.
export type UserRead = S['UserOut'];
export type UserSummary = S['UserOut'];
export type UserPatch = S['UserPatchIn'];

// --- Scenarios -----------------------------------------------------------
export type ScenarioSummary = S['ScenarioListItem'];
export type ScenarioDetail = S['ScenarioDetailOut'];
export type ScenarioCreate = S['ScenarioIn'];
export type ScenarioUpdate = S['ScenarioPatchIn'];
export type ScenarioBare = S['ScenarioOut'];
export type ScenarioDataBundle = S['ScenarioDataOut'];

// --- Slots ---------------------------------------------------------------
// SlotOut is the full slot; there is no separate list-item DTO.
export type SlotSummary = S['SlotOut'];
export type Slot = S['SlotOut'];
export type SlotCreate = S['SlotIn'];
export type SlotUpdate = S['SlotPatchIn'];

// --- Jobs & history ------------------------------------------------------
export type Job = S['JobOut'];
export type JobEvent = S['JobEventOut'];
export type History = S['HistoryItem'];

// --- Run / plan ----------------------------------------------------------
export type RunResponse = S['RunOut'];

// Plan has no documented response shape in the Django OpenAPI (the schema
// lives in the runtime payload but Ninja does not emit it). The runtime
// contract is still stable: see backend docs on PlanPayload.
export interface Plan {
  generated_at: string;
  timezone: string;
  slot_key: string;
  slot_id: string;
  scenario_id: string;
  scheduled_for: string;
  requires_enterprise_network: boolean;
  before_steps: number;
  steps: number;
  on_success: number;
  on_failure: number;
  finally_steps: number;
  default_pushover_key?: string | null;
  default_network_key?: string | null;
  default_network_available: boolean;
}

// --- Shares --------------------------------------------------------------
export type ShareList = S['ShareList'];
export type Share = S['ShareIn'];
export type ShareResponse = S['ShareOut'];

// --- Steps ---------------------------------------------------------------
export type Step = S['StepIn'];
export type StepMutation = S['StepMutationOut'];

// --- Admin ---------------------------------------------------------------
export type AdminUserUpdate = S['AdminUserPatchIn'];
export type AuditEntry = S['AuditOut'];
export type AppSetting = S['AppSettingOut'];
export type AppSettingUpsert = S['AppSettingIn'];
export type ConfigChecks = S['ConfigChecksOut'];
export type DbStats = S['DbStatsOut'];
export type ExportPayload = S['ExportOut'];
export type ImportResult = S['ImportDryRun'];
export type RetentionResult = S['RetentionResult'];

// --- Artifacts / monitoring ---------------------------------------------
export type Artifact = S['ArtifactItem'];
export type MonitoringSummaryData = S['MonitoringSummary'];

// --- Microsoft Graph -----------------------------------------------------
export type GraphSubscriptionCreate = S['GraphSubscriptionIn'];
export type GraphSubscription = S['GraphSubscriptionOut'];
export type GraphRenew = S['GraphRenewIn'];
export type GraphNotification = S['GraphNotificationOut'];

// --- Errors --------------------------------------------------------------
// The Django backend's global Ninja exception handler emits this shape on
// every non-2xx response. Post-processed into the OpenAPI spec as the
// `default` response on all 62 endpoints by scripts/export_openapi.py.
export type ApiError = S['ErrorOut'];

// --- Job statuses --------------------------------------------------------
export type JobStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

// --- Step collections ----------------------------------------------------
export type StepCollectionName =
  | 'before_steps'
  | 'steps'
  | 'on_success'
  | 'on_failure'
  | 'finally_steps';

export const STEP_COLLECTIONS: readonly StepCollectionName[] = [
  'before_steps',
  'steps',
  'on_success',
  'on_failure',
  'finally_steps',
] as const;

export const STEP_COLLECTION_LABELS_FR: Record<StepCollectionName, string> = {
  before_steps: 'Préparation (before_steps)',
  steps: 'Corps (steps)',
  on_success: 'Sur succès (on_success)',
  on_failure: 'Sur erreur (on_failure)',
  finally_steps: 'Finalement (finally_steps)',
};
