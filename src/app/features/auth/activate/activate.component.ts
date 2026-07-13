import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslocoPipe } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';

type ActivateState = 'working' | 'success' | 'expired' | 'invalid';

@Component({
  selector: 'app-activate',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule, ProgressSpinnerModule, TranslocoPipe],
  template: `
    <div class="auth-card">
      <p-card>
        <div class="exchange">
          @switch (state()) {
            @case ('working') {
              <p-progressSpinner strokeWidth="4" styleClass="u-spinner" />
              <p class="m0">{{ 'auth.activate.working' | transloco }}</p>
            }
            @case ('success') {
              <i class="pi pi-check-circle exchange-icon"></i>
              <p class="m0">{{ 'auth.activate.success' | transloco }}</p>
              <p-button [label]="'auth.back_to_login' | transloco" icon="pi pi-sign-in" routerLink="/login" />
            }
            @case ('expired') {
              <i class="pi pi-clock exchange-icon"></i>
              <p class="m0">{{ 'auth.activate.expired' | transloco }}</p>
              <p-button [label]="'auth.activate.register_again' | transloco" icon="pi pi-user-plus" routerLink="/register" />
            }
            @case ('invalid') {
              <i class="pi pi-times-circle exchange-icon"></i>
              <p class="m0">{{ 'auth.activate.invalid' | transloco }}</p>
              <p-button [label]="'auth.activate.register_again' | transloco" icon="pi pi-user-plus" routerLink="/register" />
            }
          }
        </div>
      </p-card>
    </div>
  `,
  styleUrl: './activate.component.scss',
})
export class ActivateComponent implements OnInit {
  private readonly http = inject(HttpClient);

  /** Bound from the `:token` route param via withComponentInputBinding(). */
  @Input() token?: string;

  readonly state = signal<ActivateState>('working');

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/activate`, { token: this.token }),
      );
      this.state.set('success');
    } catch (err) {
      this.state.set((err as HttpErrorResponse)?.status === 410 ? 'expired' : 'invalid');
    }
  }
}
