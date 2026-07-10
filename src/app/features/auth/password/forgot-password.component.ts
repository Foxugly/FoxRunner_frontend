import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthPasswordService } from '../../../core/api/auth-password.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, CardModule, InputTextModule, TranslocoPipe],
  template: `
    <div class="auth-shell" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <ng-template pTemplate="header">
            <div class="card-header">
              <i class="pi pi-envelope" style="font-size: 1.75rem; color: var(--accent)"></i>
              <span class="brand fox-brand">{{ 'auth.forgot_title' | transloco }}</span>
            </div>
          </ng-template>

          @if (!sent()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
              <p class="help">
                {{ 'auth.forgot_help' | transloco }}
              </p>
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
              <p-button
                type="submit"
                [label]="'auth.send_link' | transloco"
                icon="pi pi-send"
                styleClass="u-full"
                [loading]="loading()"
                [disabled]="form.invalid || loading()"
              />
              <a routerLink="/login" class="link-center">{{ 'auth.back_to_login' | transloco }}</a>
            </form>
          } @else {
            <div class="success">
              <i class="pi pi-check-circle icon-success" style="font-size: 3rem"></i>
              <p>{{ 'auth.forgot_success' | transloco }}</p>
              <a routerLink="/login" class="link-sm">{{ 'auth.back_to_login' | transloco }}</a>
            </div>
          }
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-shell {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 1.5rem;
        padding-bottom: 0;
      }
      .brand {
        font-size: 1.25rem;
      }
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .help {
        color: var(--muted);
        font-size: 0.875rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .link-center {
        font-size: 0.875rem;
        text-align: center;
      }
      .success {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;
        text-align: center;
      }
      .icon-success {
        color: var(--success);
      }
      .link-sm {
        font-size: 0.875rem;
      }
      :host ::ng-deep .u-full {
        width: 100%;
      }
    `,
  ],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AuthPasswordService);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      await this.service.forgot(this.form.getRawValue().email);
      this.sent.set(true);
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('auth.toast_email_sent'),
        life: 3000,
      });
    } catch {
      // Success messaging voluntarily even on error to avoid user enumeration.
      this.sent.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
