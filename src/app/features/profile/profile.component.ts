import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../core/auth/auth.service';
import { TimezonesService } from '../../core/api/timezones.service';
import { FormFooterComponent } from '../../shared/components/form-footer/form-footer.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PushItTargetsComponent } from './pushit-targets.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule,
    CardModule,
    InputTextModule,
    SelectModule,
    AutoCompleteModule,
    TooltipModule,
    FormFooterComponent,
    PageHeaderComponent,
    PushItTargetsComponent,
    TranslocoPipe,
  ],
  template: `
    <app-page-header
      icon="pi-user"
      [title]="'profile.title' | transloco"
    />

    <p-card styleClass="profile-card">
      <div class="meta-grid">
        <div class="meta-item">
          <label class="meta-label" for="email">{{ 'profile.email' | transloco }}</label>
          <div class="meta-value">
            <input
              id="email"
              pInputText
              type="email"
              [value]="auth.currentUser()?.email ?? ''"
              disabled
            />
          </div>
        </div>

        <div class="meta-item">
          <label class="meta-label" for="tz">
            {{ 'profile.timezone.label' | transloco }}
            <i
              class="pi pi-info-circle"
              [pTooltip]="'profile.timezone.tooltip' | transloco"
              tooltipPosition="top"
            ></i>
          </label>
          <div class="meta-value">
            <p-autocomplete
              inputId="tz"
              [(ngModel)]="selectedTimezone"
              [suggestions]="filteredTimezones()"
              (completeMethod)="onSearch($event)"
              [dropdown]="true"
              [forceSelection]="false"
              [placeholder]="'profile.timezone.placeholder' | transloco"
              appendTo="body"
              styleClass="u-full"
            />
          </div>
        </div>
      </div>

      <app-form-footer
        [loading]="saving()"
        [disabled]="saving() || !dirty()"
        (save)="save()"
        (cancelled)="resetToCurrent()"
      />
    </p-card>

    <app-pushit-targets class="pushit-section" />
  `,
  styles: [
    `
      :host ::ng-deep .profile-card {
        max-width: 30rem;
      }
      :host ::ng-deep .u-full {
        width: 100%;
      }
      .pushit-section {
        display: block;
        margin-top: 1.5rem;
      }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly tzService = inject(TimezonesService);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  readonly selectedTimezone = signal<string>('');
  readonly saving = signal(false);
  private readonly allTimezones = signal<string[]>([]);
  private readonly searchQuery = signal<string>('');

  readonly filteredTimezones = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const all = this.allTimezones();
    if (!q) return all.slice(0, 50);
    return all.filter((t) => t.toLowerCase().includes(q)).slice(0, 50);
  });

  readonly dirty = computed(
    () => this.selectedTimezone() !== (this.auth.currentUser()?.timezone_name ?? ''),
  );

  async ngOnInit(): Promise<void> {
    this.resetToCurrent();
    const list = await this.tzService.listCommon();
    this.allTimezones.set(list.timezones);
  }

  resetToCurrent(): void {
    this.selectedTimezone.set(this.auth.currentUser()?.timezone_name ?? '');
  }

  onSearch(ev: { query: string }): void {
    this.searchQuery.set(ev.query);
  }

  async save(): Promise<void> {
    const tz = this.selectedTimezone().trim();
    if (!tz) return;
    this.saving.set(true);
    try {
      await this.auth.updateTimezone(tz);
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('profile.toast.updated.summary'),
        detail: this.transloco.translate('profile.toast.updated.detail', { tz }),
        life: 3000,
      });
    } catch {
      /* interceptor toasts */
    } finally {
      this.saving.set(false);
    }
  }
}
