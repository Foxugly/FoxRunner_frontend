import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AuthService } from '../../core/auth/auth.service';
import { TimezonesService } from '../../core/api/timezones.service';
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
    PageHeaderComponent,
  ],
  template: `
    <app-page-header
      icon="pi-user"
      title="Profil"
      subtitle="Tes informations et ton fuseau horaire"
    />

    <p-card styleClass="max-w-30rem">
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
