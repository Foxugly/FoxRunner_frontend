import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';

/** Cross-field validator: flags `confirm` when it does not match `password`. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    TranslocoPipe,
  ],
  template: `
    <div class="auth-card">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <i class="pi pi-bolt auth-brand-icon"></i>
            <span class="brand fox-brand">FoxRunner</span>
          </div>
        </ng-template>

        @if (success()) {
          <div class="auth-form">
            <p-message
              severity="success"
              [text]="'auth.register.success' | transloco"
              styleClass="u-full"
            />
            <a routerLink="/login" class="link-center">
              {{ 'auth.register.back_to_login' | transloco }}
            </a>
          </div>
        } @else {
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
              <label for="password">{{ 'auth.register.password_label' | transloco }}</label>
              <p-password
                inputId="password"
                formControlName="password"
                [toggleMask]="true"
                [feedback]="false"
                autocomplete="new-password"
                styleClass="u-full"
                [inputStyle]="{ width: '100%' }"
                required
              />
            </div>
            <div class="field">
              <label for="confirm">{{ 'auth.register.confirm_label' | transloco }}</label>
              <p-password
                inputId="confirm"
                formControlName="confirm"
                [toggleMask]="true"
                [feedback]="false"
                autocomplete="new-password"
                styleClass="u-full"
                [inputStyle]="{ width: '100%' }"
                required
              />
            </div>
            @if (error(); as msg) {
              <p-message severity="error" [text]="msg" styleClass="u-full" />
            }
            <p-button
              type="submit"
              [label]="'auth.register.submit' | transloco"
              icon="pi pi-user-plus"
              severity="success"
              styleClass="u-full"
              [loading]="loading()"
              [disabled]="loading() || form.invalid"
            />
            <p class="note">
              {{ 'auth.register.have_account' | transloco }}
              <a routerLink="/login" class="inline-link">
                {{ 'auth.register.back_to_login' | transloco }}
              </a>
            </p>
          </form>
        }
      </p-card>
    </div>
  `,
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', [Validators.required]],
    },
    { validators: [passwordsMatch] },
  );

  async onSubmit(): Promise<void> {
    if (this.loading() || this.form.invalid) return;
    this.error.set(null);
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/auth/users/`, { email, password }),
      );
      this.success.set(true);
    } catch (err) {
      const status = (err as HttpErrorResponse)?.status ?? 0;
      this.error.set(
        this.transloco.translate(
          status === 0 ? 'auth.error_server_unreachable' : 'auth.register.error',
        ),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
