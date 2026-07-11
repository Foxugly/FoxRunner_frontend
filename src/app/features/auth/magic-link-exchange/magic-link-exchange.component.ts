import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthMagicService } from '../../../core/api/auth-magic.service';

type ExchangeState = 'working' | 'expired' | 'invalid';

@Component({
  selector: 'app-magic-link-exchange',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule, ProgressSpinnerModule, TranslocoPipe],
  template: `
    <div class="auth-card">
      <p-card>
        <div class="exchange">
          @switch (state()) {
            @case ('working') {
              <p-progressSpinner strokeWidth="4" styleClass="u-spinner" />
              <p class="m0">{{ 'auth.exchange_working' | transloco }}</p>
            }
            @case ('expired') {
              <i class="pi pi-clock exchange-icon"></i>
              <p class="m0">{{ 'auth.exchange_expired' | transloco }}</p>
              <p-button [label]="'auth.back_to_login' | transloco" icon="pi pi-arrow-left" routerLink="/login" />
            }
            @case ('invalid') {
              <i class="pi pi-times-circle exchange-icon"></i>
              <p class="m0">{{ 'auth.exchange_invalid' | transloco }}</p>
              <p-button [label]="'auth.back_to_login' | transloco" icon="pi pi-arrow-left" routerLink="/login" />
            }
          }
        </div>
      </p-card>
    </div>
  `,
  styleUrl: './magic-link-exchange.component.scss',
})
export class MagicLinkExchangeComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly authMagic = inject(AuthMagicService);

  /** Bound from the `:token` route param via withComponentInputBinding(). */
  @Input() token?: string;

  readonly state = signal<ExchangeState>('working');

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.state.set('invalid');
      return;
    }
    try {
      const res = await this.authMagic.exchange(this.token);
      await this.auth.loginWithToken(res.access_token, res.refresh_token);
      await this.router.navigate(['/']);
    } catch (err) {
      this.state.set((err as HttpErrorResponse)?.status === 410 ? 'expired' : 'invalid');
    }
  }
}
