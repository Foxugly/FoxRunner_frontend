import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toHttpParams } from './api-base';
import type {
  AdminUserUpdate,
  AppSetting,
  AppSettingUpsert,
  AuditEntry,
  ConfigChecks,
  DbStats,
  ExportPayload,
  ImportResult,
  MonitoringSummaryData,
  Paginated,
  RetentionResult,
  UserSummary,
} from './types';

export interface AuditParams {
  actor_user_id?: string;
  target_type?: string;
  target_id?: string;
  limit?: number;
  offset?: number;
}

export interface RetentionParams {
  jobs_days?: number;
  audit_days?: number;
  graph_notifications_days?: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  listUsers(limit = 50, offset = 0): Promise<Paginated<UserSummary>> {
    return firstValueFrom(
      this.http.get<Paginated<UserSummary>>(`${this.base}/admin/users`, {
        params: toHttpParams({ limit, offset }),
      }),
    );
  }

  updateUser(targetUserId: string, dto: AdminUserUpdate): Promise<UserSummary> {
    return firstValueFrom(
      this.http.patch<UserSummary>(
        `${this.base}/admin/users/${encodeURIComponent(targetUserId)}`,
        dto,
      ),
    );
  }

  audit(params: AuditParams = {}): Promise<Paginated<AuditEntry>> {
    return firstValueFrom(
      this.http.get<Paginated<AuditEntry>>(`${this.base}/audit`, {
        params: toHttpParams({ ...params }),
      }),
    );
  }

  configChecks(): Promise<ConfigChecks> {
    return firstValueFrom(this.http.get<ConfigChecks>(`${this.base}/admin/config-checks`));
  }

  dbStats(): Promise<DbStats> {
    return firstValueFrom(this.http.get<DbStats>(`${this.base}/admin/db-stats`));
  }

  exportCatalog(): Promise<ExportPayload> {
    return firstValueFrom(this.http.get<ExportPayload>(`${this.base}/admin/export`));
  }

  importCatalog(body: Record<string, unknown>, dryRun = true): Promise<ImportResult> {
    return firstValueFrom(
      this.http.post<ImportResult>(`${this.base}/admin/import`, body, {
        params: toHttpParams({ dry_run: dryRun }),
      }),
    );
  }

  prune(params: RetentionParams): Promise<RetentionResult> {
    return firstValueFrom(
      this.http.delete<RetentionResult>(`${this.base}/admin/retention`, {
        params: toHttpParams({ ...params }),
      }),
    );
  }

  listSettings(limit = 100, offset = 0): Promise<Paginated<AppSetting>> {
    return firstValueFrom(
      this.http.get<Paginated<AppSetting>>(`${this.base}/admin/settings`, {
        params: toHttpParams({ limit, offset }),
      }),
    );
  }

  upsertSetting(key: string, dto: AppSettingUpsert): Promise<AppSetting> {
    return firstValueFrom(
      this.http.put<AppSetting>(
        `${this.base}/admin/settings/${encodeURIComponent(key)}`,
        dto,
      ),
    );
  }

  deleteSetting(key: string): Promise<unknown> {
    return firstValueFrom(
      this.http.delete(`${this.base}/admin/settings/${encodeURIComponent(key)}`),
    );
  }

  monitoringSummary(): Promise<MonitoringSummaryData> {
    return firstValueFrom(
      this.http.get<MonitoringSummaryData>(`${this.base}/monitoring/summary`),
    );
  }
}
