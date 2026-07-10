import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthPasswordService } from '../../../core/api/auth-password.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, CardModule, PasswordModule, TranslocoPipe],
  template: `
    <div class="flex align-items-center justify-content-center" style="min-height: 100vh;">
      <div style="width: 100%; max-width: 420px;">
        <p-card>
          <ng-template pTemplate="header">
            <div class="flex align-items-center gap-2 p-4 pb-0">
              <i class="pi pi-key" style="font-size: 1.75rem; color: var(--accent)"></i>
              <span class="text-xl fox-brand">{{ 'auth.reset_title' | transloco }}</span>
            </div>
          </ng-template>

          @if (!token()) {
            <div class="text-color-secondary text-sm">
              {{ 'auth.reset_missing_token' | transloco }}
            </div>
          } @else if (done()) {
            <div class="flex flex-column gap-3 align-items-center text-center">
              <i class="pi pi-check-circle text-green-500" style="font-size: 3rem"></i>
              <p>{{ 'auth.reset_done' | transloco }}</p>
              <a routerLink="/login">{{ 'auth.go_to_login' | transloco }}</a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-column gap-3">
              <div class="flex flex-column gap-2">
                <label for="password">{{ 'auth.new_password_label' | transloco }}</label>
                <p-password
                  inputId="password"
                  formControlName="password"
                  [toggleMask]="true"
                  styleClass="w-full"
                  [inputStyle]="{ width: '100%' }"
                  required
                />
              </div>
              <p-button
                type="submit"
                [label]="'auth.update_button' | transloco"
                icon="pi pi-check"
                styleClass="w-full"
                [loading]="loading()"
                [disabled]="form.invalid || loading()"
              />
              <a routerLink="/login" class="text-sm text-center">{{ 'auth.back_to_login' | transloco }}</a>
            </form>
          }
        </p-card>
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(AuthPasswordService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly transloco = inject(TranslocoService);

  readonly token = signal<string>('');
  readonly loading = signal(false);
  readonly done = signal(false);
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token') ?? '');
  }

  async submit(): Promise<void> {
    if (this.form.invalid || !this.token()) return;
    this.loading.set(true);
    try {
      await this.service.reset(this.token(), this.form.getRawValue().password);
      this.done.set(true);
      this.messages.add({
        severity: 'success',
        summary: this.transloco.translate('auth.toast_password_updated'),
        life: 3000,
      });
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch {
      /* toast */
    } finally {
      this.loading.set(false);
    }
  }
}
