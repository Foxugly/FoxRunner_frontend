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
    <div class="auth-card">
      <p-card>
        <ng-template pTemplate="header">
          <div class="card-header">
            <i class="pi pi-key auth-brand-icon"></i>
            <span class="brand fox-brand">{{ 'auth.reset_title' | transloco }}</span>
          </div>
        </ng-template>

          @if (!token()) {
            <div class="help">
              {{ 'auth.reset_missing_token' | transloco }}
            </div>
          } @else if (done()) {
            <div class="success">
              <i class="pi pi-check-circle icon-success"></i>
              <p>{{ 'auth.reset_done' | transloco }}</p>
              <a routerLink="/login">{{ 'auth.go_to_login' | transloco }}</a>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
              <div class="field">
                <label for="password">{{ 'auth.new_password_label' | transloco }}</label>
                <p-password
                  inputId="password"
                  formControlName="password"
                  [toggleMask]="true"
                  styleClass="u-full"
                  [inputStyle]="{ width: '100%' }"
                  required
                />
              </div>
              <p-button
                type="submit"
                [label]="'auth.update_button' | transloco"
                icon="pi pi-check"
                styleClass="u-full"
                [loading]="loading()"
                [disabled]="form.invalid || loading()"
              />
              <a routerLink="/login" class="link-center">{{ 'auth.back_to_login' | transloco }}</a>
            </form>
          }
      </p-card>
    </div>
  `,
  styleUrl: './reset-password.component.scss',
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
