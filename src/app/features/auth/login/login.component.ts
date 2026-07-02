import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthMagicService } from '../../../core/api/auth-magic.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    CheckboxModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
  ],
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

          @if (!magicMode()) {
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
              @if (error(); as msg) {
                <p-message severity="error" [text]="msg" styleClass="w-full" />
              }
              <div class="flex align-items-center gap-2">
                <p-checkbox inputId="remember" formControlName="remember" [binary]="true" />
                <label for="remember" class="text-sm">Se souvenir de moi</label>
              </div>
              <p-button
                type="submit"
                label="Se connecter"
                icon="pi pi-sign-in"
                styleClass="w-full"
                [loading]="loading()"
                [disabled]="loading() || form.invalid"
              />
              <a routerLink="/forgot-password" class="text-sm text-center">
                Mot de passe oublié ?
              </a>
              <p-button
                label="Recevoir un lien magique"
                icon="pi pi-envelope"
                severity="secondary"
                [text]="true"
                styleClass="w-full"
                (onClick)="enterMagicMode()"
              />
            </form>
          } @else {
            <form [formGroup]="magicForm" (ngSubmit)="onSendMagic()" class="flex flex-column gap-3">
              <div class="flex flex-column gap-2">
                <label for="magicEmail">Email</label>
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
                <p class="text-sm text-center text-color-secondary m-0">
                  Si un compte existe, un lien de connexion vient d'être envoyé. Vérifie ta boîte mail.
                </p>
              }
              <p-button
                type="submit"
                label="Envoyer le lien"
                icon="pi pi-send"
                styleClass="w-full"
                [loading]="magicLoading()"
                [disabled]="magicLoading() || magicForm.invalid"
              />
              <p-button
                label="Retour au mot de passe"
                icon="pi pi-arrow-left"
                severity="secondary"
                [text]="true"
                styleClass="w-full"
                (onClick)="exitMagicMode()"
              />
            </form>
          }
        </p-card>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authMagic = inject(AuthMagicService);
  private readonly router = inject(Router);

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
        status === 401
          ? 'E-mail ou mot de passe incorrect.'
          : status === 0
            ? 'Connexion au serveur impossible. Vérifie ta connexion internet.'
            : 'La connexion a échoué. Réessaie dans un instant.',
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
