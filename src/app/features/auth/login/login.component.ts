import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthMagicService } from '../../../core/api/auth-magic.service';
import { AuthCardComponent } from '../../../shared/components/auth-card/auth-card.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    TranslocoPipe,
    AuthCardComponent,
  ],
  template: `
    <app-auth-card icon="pi pi-bolt" [title]="'app.title' | transloco">
          @if (!magicMode()) {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
              <div class="field">
                <label for="email">{{ 'auth.email_label' | transloco }}</label>
                <input
                  id="email"
                  pInputText
                  type="email"
                  formControlName="email"
                  autocomplete="username"
                  required
                />
              </div>
              <div class="field">
                <label for="password">{{ 'auth.password_label' | transloco }}</label>
                <p-password
                  inputId="password"
                  formControlName="password"
                  [toggleMask]="true"
                  [feedback]="false"
                  autocomplete="current-password"
                  styleClass="u-full"
                  [inputStyle]="{ width: '100%' }"
                  required
                />
              </div>
              @if (error(); as msg) {
                <p-message severity="error" [text]="msg" styleClass="u-full" />
              }
              <div class="auth-meta">
                <div class="check-inline">
                  <p-checkbox inputId="remember" formControlName="remember" [binary]="true" />
                  <label for="remember">{{ 'auth.remember_me' | transloco }}</label>
                </div>
                <a routerLink="/forgot-password" class="link">{{ 'auth.forgot_link' | transloco }}</a>
              </div>
              <p-button
                type="submit"
                [label]="'auth.sign_in' | transloco"
                icon="pi pi-sign-in"
                styleClass="u-full"
                [loading]="loading()"
                [disabled]="loading() || form.invalid"
              />
              <div class="auth-divider"><span>{{ 'auth.or' | transloco }}</span></div>
              <p-button
                [label]="'auth.magic_request' | transloco"
                icon="pi pi-envelope"
                styleClass="u-full magic-btn"
                (onClick)="enterMagicMode()"
              />
            </form>
          } @else {
            <form [formGroup]="magicForm" (ngSubmit)="onSendMagic()" class="auth-form">
              <div class="field">
                <label for="magicEmail">{{ 'auth.email_label' | transloco }}</label>
                <input
                  id="magicEmail"
                  pInputText
                  type="email"
                  formControlName="email"
                  autocomplete="username"
                  required
                />
              </div>
              @if (magicSent()) {
                <p class="note">
                  {{ 'auth.magic_sent' | transloco }}
                </p>
              }
              <p-button
                type="submit"
                [label]="'auth.send_link' | transloco"
                icon="pi pi-send"
                styleClass="u-full"
                [loading]="magicLoading()"
                [disabled]="magicLoading() || magicForm.invalid"
              />
              <p-button
                [label]="'auth.back_to_password' | transloco"
                icon="pi pi-arrow-left"
                severity="secondary"
                [text]="true"
                styleClass="u-full"
                (onClick)="exitMagicMode()"
              />
            </form>
          }

          <p class="auth-alt">
            {{ 'auth.no_account' | transloco }}
            <a routerLink="/register" class="link">{{ 'auth.create_account' | transloco }}</a>
          </p>
    </app-auth-card>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authMagic = inject(AuthMagicService);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    remember: [true],
  });

  readonly magicMode = signal(false);
  readonly magicLoading = signal(false);
  readonly magicSent = signal(false);
  readonly magicForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit(): Promise<void> {
    if (this.loading() || this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      const { email, password, remember } = this.form.getRawValue();
      await this.auth.login(email, password, remember);
      await this.router.navigate(['/']);
    } catch (err) {
      const status = (err as HttpErrorResponse)?.status ?? 0;
      this.error.set(
        this.transloco.translate(
          status === 401
            ? 'auth.error_invalid_credentials'
            : status === 0
              ? 'auth.error_server_unreachable'
              : 'auth.error_login_failed',
        ),
      );
    } finally {
      this.loading.set(false);
    }
  }

  enterMagicMode(): void {
    this.error.set(null);
    this.magicForm.reset({ email: this.form.getRawValue().email });
    this.magicSent.set(false);
    this.magicMode.set(true);
  }

  exitMagicMode(): void {
    this.magicMode.set(false);
  }

  async onSendMagic(): Promise<void> {
    if (this.magicLoading() || this.magicForm.invalid) return;
    this.magicLoading.set(true);
    try {
      await this.authMagic.request(this.magicForm.getRawValue().email);
      this.magicSent.set(true);
    } catch {
      // Toast handled by error interceptor.
    } finally {
      this.magicLoading.set(false);
    }
  }
}
