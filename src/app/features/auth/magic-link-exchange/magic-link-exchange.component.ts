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
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <div class="flex flex-column align-items-center gap-3 p-3 text-center">
            @switch (state()) {
              @case ('working') {
                <p-progressSpinner strokeWidth="4" styleClass="w-3rem h-3rem" />
                <p class="m-0">{{ 'auth.exchange_working' | transloco }}</p>
              }
              @case ('expired') {
                <i class="pi pi-clock" style="font-size: 2rem; color: var(--p-text-muted-color, #6b7280)"></i>
                <p class="m-0">{{ 'auth.exchange_expired' | transloco }}</p>
                <p-button [label]="'auth.back_to_login' | transloco" icon="pi pi-arrow-left" routerLink="/login" />
              }
              @case ('invalid') {
                <i class="pi pi-times-circle" style="font-size: 2rem; color: var(--p-text-muted-color, #6b7280)"></i>
                <p class="m-0">{{ 'auth.exchange_invalid' | transloco }}</p>
                <p-button [label]="'auth.back_to_login' | transloco" icon="pi pi-arrow-left" routerLink="/login" />
              }
            }
          </div>
        </p-card>
      </div>
    </div>
  `,
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
