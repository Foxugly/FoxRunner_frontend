import type { components } from './schema';

type S = components['schemas'];

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type UserRead = S['UserRead'];
export type UserSummary = S['UserPayload'];
export type ScenarioSummary = S['ScenarioSummaryPayload'];
export type ScenarioDetail = S['ScenarioDetailPayload'];
export type ScenarioCreate = S['ScenarioPayload'];
export type ScenarioUpdate = S['ScenarioUpdatePayload'];
export type SlotSummary = S['SlotSummaryPayload'];
export type Slot = S['SlotPayload'];
export type SlotUpdate = S['SlotUpdatePayload'];
export type Job = S['JobPayload'];
export type JobEvent = S['JobEventPayload'];
export type History = S['HistoryPayload'];
export type Plan = S['PlanPayload'];
export type RunResponse = S['RunScenarioResponsePayload'];
export type ShareList = S['ShareListPayload'];
export type Share = S['SharePayload'];
export type ShareResponse = S['ShareResponsePayload'];
export type FeatureFlags = S['FeatureFlagsPayload'];
export type ClientConfigData = S['ClientConfigPayload'];
export type MonitoringSummary = S['MonitoringSummaryPayload'];
export type TimezoneList = S['TimezoneListPayload'];
export type Step = S['StepPayload'];
export type StepMutation = S['StepMutationPayload'];

export type JobStatus = 'queued' | 'running' | 'success' | 'failed' | 'cancelled';

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
