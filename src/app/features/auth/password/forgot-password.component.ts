import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { AuthPasswordService } from '../../../core/api/auth-password.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, CardModule, InputTextModule],
  template: `
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center gap-2 p-4 pb-0">
              <i class="pi pi-envelope" style="font-size: 1.75rem; color: var(--accent)"></i>
              <span class="text-xl fox-brand">Mot de passe oublié</span>
            </div>
          </ng-template>

          @if (!sent()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-column gap-3">
              <p class="text-color-secondary text-sm">
                Entre l'adresse email associée à ton compte. Si elle existe, un lien de
                réinitialisation te sera envoyé.
              </p>
              <div class="flex flex-column gap-2">
                <label for="email">Email</label>
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
                label="Envoyer le lien"
                icon="pi pi-send"
                styleClass="w-full"
                [loading]="loading()"
                [disabled]="form.invalid || loading()"
              />
              <a routerLink="/login" class="text-sm text-center">Retour à la connexion</a>
            </form>
          } @else {
            <div class="flex flex-column gap-3 align-items-center text-center">
              <i class="pi pi-check-circle text-green-500" style="font-size: 3rem"></i>
              <p>Si l'adresse est valide, un email vient d'être envoyé.</p>
              <a routerLink="/login" class="text-sm">Retour à la connexion</a>
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
        summary: 'Email envoyé',
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
