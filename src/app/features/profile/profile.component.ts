import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
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
  ],
  template: `
    <app-page-header
      icon="pi-user"
      title="Profil"
    />

    <p-card styleClass="max-w-30rem">
      <div class="meta-grid">
        <div class="meta-item">
          <label class="meta-label" for="email">Email</label>
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
            Fuseau horaire (IANA)
            <i
              class="pi pi-info-circle"
              pTooltip="Les horodatages de l'API sont affichés dans ce fuseau. Les horaires de slots (08:00, etc.) restent exprimés en heure locale métier."
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
              placeholder="Europe/Brussels"
              appendTo="body"
              styleClass="w-full"
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

    <app-pushit-targets class="block mt-4" />
  `,
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly tzService = inject(TimezonesService);
  private readonly messages = inject(MessageService);

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
        summary: 'Profil mis à jour',
        detail: `Fuseau horaire : ${tz}`,
        life: 3000,
      });
    } catch {
      /* interceptor toasts */
    } finally {
      this.saving.set(false);
    }
  }
}
