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
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center gap-2 p-4 pb-0">
              <i class="pi pi-envelope" style="font-size: 1.75rem; color: var(--accent)"></i>
              <span class="text-xl fox-brand">{{ 'auth.forgot_title' | transloco }}</span>
            </div>
          </ng-template>

          @if (!sent()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-column gap-3">
              <p class="text-color-secondary text-sm">
                {{ 'auth.forgot_help' | transloco }}
              </p>
              <div class="flex flex-column gap-2">
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
                styleClass="w-full"
                [loading]="loading()"
                [disabled]="form.invalid || loading()"
              />
              <a routerLink="/login" class="text-sm text-center">{{ 'auth.back_to_login' | transloco }}</a>
            </form>
          } @else {
            <div class="flex flex-column gap-3 align-items-center text-center">
              <i class="pi pi-check-circle text-green-500" style="font-size: 3rem"></i>
              <p>{{ 'auth.forgot_success' | transloco }}</p>
              <a routerLink="/login" class="text-sm">{{ 'auth.back_to_login' | transloco }}</a>
            </div>
          }
        </p-card>
      </div>
    </div>
  `,
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
