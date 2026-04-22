import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthPasswordService } from '../../../core/api/auth-password.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
  ],
  template: `
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center gap-2 p-4 pb-0">
              <i class="pi pi-user-plus" style="font-size: 1.75rem; color: var(--fox-primary)"></i>
              <span class="text-xl fox-brand">Créer un compte</span>
            </div>
          </ng-template>

          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-column gap-3">
            <p class="text-color-secondary text-sm">
              Le compte sera créé en état non vérifié. Un administrateur devra l'activer ou tu
              devras confirmer l'email selon la configuration du backend.
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
            <div class="flex flex-column gap-2">
              <label for="password">Mot de passe</label>
              <p-password
                inputId="password"
                formControlName="password"
                [toggleMask]="true"
                styleClass="w-full"
                [inputStyle]="{ width: '100%' }"
                required
              />
              <small class="text-color-secondary">8 caractères minimum.</small>
            </div>
            <p-button
              type="submit"
              label="Créer le compte"
              icon="pi pi-check"
              styleClass="w-full"
              [loading]="loading()"
              [disabled]="form.invalid || loading()"
            />
            <a routerLink="/login" class="text-sm text-center">Déjà un compte ? Se connecter</a>
          </form>
        </p-card>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly passwordService = inject(AuthPasswordService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly loading = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.passwordService.register(email, password);
      this.messages.add({
        severity: 'success',
        summary: 'Compte créé',
        detail: 'Tentative de connexion…',
        life: 2500,
      });
      try {
        await this.auth.login(email, password);
        this.router.navigate(['/']);
      } catch {
        this.router.navigate(['/login']);
      }
    } catch {
      /* toast handled by interceptor */
    } finally {
      this.loading.set(false);
    }
  }
}
