import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { AuthService } from '../../core/auth/auth.service';
import { TimezonesService } from '../../core/api/timezones.service';
import { UsersService } from '../../core/api/users.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    AutoCompleteModule,
    TagModule,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      icon="pi-user"
      title="Profil"
      subtitle="Tes informations et ton fuseau horaire"
    />

    <div class="grid">
      <div class="col-12 md:col-8 lg:col-6">
    <p-card>
      <div class="flex flex-column gap-4">
        <div class="flex flex-column gap-2">
          <label for="email">Email</label>
          <input
            id="email"
            pInputText
            type="email"
            [value]="auth.currentUser()?.email ?? ''"
            disabled
          />
        </div>

        <div class="flex flex-column gap-2">
          <label for="tz">Fuseau horaire (IANA)</label>
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
          <small class="text-color-secondary">
            Les horodatages de l'API sont affichés dans ce fuseau. Les horaires de slots
            ({{ "08:00" }}, etc.) restent exprimés en heure locale métier.
          </small>
        </div>

        <div class="flex gap-2">
          <p-button
            label="Enregistrer"
            icon="pi pi-save"
            [loading]="saving()"
            [disabled]="saving() || !dirty()"
            (onClick)="save()"
          />
          <p-button
            label="Annuler"
            icon="pi pi-times"
            severity="secondary"
            [text]="true"
            [disabled]="!dirty()"
            (onClick)="resetToCurrent()"
          />
        </div>
      </div>
    </p-card>
      </div>

      <div class="col-12 md:col-4 lg:col-6">
        <p-card header="Feature flags">
          <p class="text-color-secondary text-sm mb-2">
            Flags exposés par le backend pour ton compte (informationnel).
          </p>
          @if (featuresLoading()) {
            <span class="text-color-secondary">Chargement…</span>
          } @else if (featureEntries().length === 0) {
            <span class="text-color-secondary">Aucun flag exposé.</span>
          } @else {
            <div class="flex flex-column gap-2">
              @for (f of featureEntries(); track f.name) {
                <div class="flex align-items-center justify-content-between">
                  <code class="text-sm">{{ f.name }}</code>
                  <p-tag
                    [severity]="f.enabled ? 'success' : 'secondary'"
                    [value]="f.enabled ? 'actif' : 'inactif'"
                  />
                </div>
              }
            </div>
          }
        </p-card>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly tzService = inject(TimezonesService);
  private readonly usersService = inject(UsersService);
  private readonly messages = inject(MessageService);

  readonly selectedTimezone = signal<string>('');
  readonly saving = signal(false);
  readonly featuresLoading = signal(true);
  private readonly features = signal<Record<string, boolean>>({});
  readonly featureEntries = computed(() =>
    Object.entries(this.features())
      .map(([name, enabled]) => ({ name, enabled }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
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
    try {
      const list = await this.tzService.listCommon();
      this.allTimezones.set(list.timezones);
    } catch {
      /* interceptor toasts */
    }
    try {
      const res = await this.usersService.getMyFeatures();
      this.features.set(res.features ?? {});
    } catch {
      this.features.set({});
    } finally {
      this.featuresLoading.set(false);
    }
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
