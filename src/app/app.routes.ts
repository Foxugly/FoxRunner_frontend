import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { superuserGuard } from './core/auth/superuser.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';
import { MainLayoutComponent } from './core/layout/main-layout/main-layout.component';
import { PublicLayoutComponent } from './core/layout/public-layout/public-layout.component';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'scenarios',
        loadComponent: () =>
          import('./features/scenarios/list/scenarios-list.component').then(
            (m) => m.ScenariosListComponent,
          ),
      },
      {
        path: 'scenarios/new',
        loadComponent: () =>
          import('./features/scenarios/edit/scenario-edit.component').then(
            (m) => m.ScenarioEditComponent,
          ),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'scenarios/:id',
        loadComponent: () =>
          import('./features/scenarios/detail/scenario-detail.component').then(
            (m) => m.ScenarioDetailComponent,
          ),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'jobs/:id',
        loadComponent: () =>
          import('./features/jobs/detail/job-detail.component').then(
            (m) => m.JobDetailComponent,
          ),
        canDeactivate: [unsavedChangesGuard],
      },
      {
        path: 'admin',
        canActivate: [superuserGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/admin/home/admin-home.component').then(
                (m) => m.AdminHomeComponent,
              ),
          },
          {
            path: 'config',
            loadComponent: () =>
              import('./features/config/config.component').then((m) => m.ConfigComponent),
            canDeactivate: [unsavedChangesGuard],
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/users/admin-users.component').then(
                (m) => m.AdminUsersComponent,
              ),
          },
          {
            path: 'settings',
            loadComponent: () =>
              import('./features/admin/settings/admin-settings.component').then(
                (m) => m.AdminSettingsComponent,
              ),
          },
          {
            path: 'audit',
            loadComponent: () =>
              import('./features/admin/audit/admin-audit.component').then(
                (m) => m.AdminAuditComponent,
              ),
          },
          {
            path: 'health',
            loadComponent: () =>
              import('./features/admin/health/admin-health.component').then(
                (m) => m.AdminHealthComponent,
              ),
          },
          {
            path: 'retention',
            loadComponent: () =>
              import('./features/admin/retention/admin-retention.component').then(
                (m) => m.AdminRetentionComponent,
              ),
          },
          {
            path: 'catalog',
            loadComponent: () =>
              import('./features/admin/catalog/admin-catalog.component').then(
                (m) => m.AdminCatalogComponent,
              ),
          },
          {
            path: 'artifacts',
            loadComponent: () =>
              import('./features/admin/artifacts/admin-artifacts.component').then(
                (m) => m.AdminArtifactsComponent,
              ),
          },
          {
            path: 'graph',
            loadComponent: () =>
              import('./features/admin/graph/admin-graph.component').then(
                (m) => m.AdminGraphComponent,
              ),
          },
        ],
      },
    ],
  },
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./features/public/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'features',
        loadComponent: () =>
          import('./features/public/features/features.component').then((m) => m.FeaturesComponent),
      },
      {
        path: 'soutenir',
        loadComponent: () =>
          import('./features/public/soutenir/soutenir.component').then((m) => m.SoutenirComponent),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/public/about/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('./features/public/privacy/privacy.component').then((m) => m.PrivacyComponent),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      {
        path: 'auth/magic/:token',
        loadComponent: () =>
          import('./features/auth/magic-link-exchange/magic-link-exchange.component').then(
            (m) => m.MagicLinkExchangeComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
