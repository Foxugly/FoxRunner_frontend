import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, CardModule, InputTextModule, PasswordModule],
  template: `
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center gap-2 p-4 pb-0">
              <i class="pi pi-bolt" style="font-size: 2rem; color: var(--fox-primary)"></i>
              <span class="text-2xl fox-brand">FoxRunner</span>
            </div>
          </ng-template>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-column gap-3">
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
                [feedback]="false"
                autocomplete="current-password"
                styleClass="w-full"
                [inputStyle]="{ width: '100%' }"
                required
              />
            </div>
            <p-button
              type="submit"
              label="Se connecter"
              icon="pi pi-sign-in"
              styleClass="w-full"
              [loading]="loading()"
              [disabled]="loading() || form.invalid"
            />
          </form>
        </p-card>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  async onSubmit(): Promise<void> {
    if (this.loading() || this.form.invalid) return;
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigate(['/']);
    } catch {
      // Toast handled by error interceptor.
    } finally {
      this.loading.set(false);
    }
  }
}
