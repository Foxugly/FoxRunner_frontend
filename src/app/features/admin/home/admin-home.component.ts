import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [RouterLink, TranslocoPipe, ButtonModule, CardModule, PageHeaderComponent],
  template: `
    <app-page-header
      icon="pi-cog"
      [title]="'admin.home.title' | transloco"
    />

    <div class="cards-grid">
      <div>
        <p-card [header]="'admin.home.users_title' | transloco" [subheader]="'admin.home.users_subtitle' | transloco">
          <p>{{ 'admin.home.users_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-users" routerLink="/admin/users" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.settings_title' | transloco" [subheader]="'admin.home.settings_subtitle' | transloco">
          <p>{{ 'admin.home.settings_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-sliders-h" routerLink="/admin/settings" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.config_title' | transloco" [subheader]="'admin.home.config_subtitle' | transloco">
          <p>{{ 'admin.home.config_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-server" routerLink="/admin/config" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.audit_title' | transloco" [subheader]="'admin.home.audit_subtitle' | transloco">
          <p>{{ 'admin.home.audit_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-list" routerLink="/admin/audit" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.health_title' | transloco" [subheader]="'admin.home.health_subtitle' | transloco">
          <p>{{ 'admin.home.health_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-heart" routerLink="/admin/health" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.retention_title' | transloco" [subheader]="'admin.home.retention_subtitle' | transloco">
          <p>{{ 'admin.home.retention_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-trash" routerLink="/admin/retention" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.catalog_title' | transloco" [subheader]="'admin.home.catalog_subtitle' | transloco">
          <p>{{ 'admin.home.catalog_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-file-export" routerLink="/admin/catalog" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.artifacts_title' | transloco" [subheader]="'admin.home.artifacts_subtitle' | transloco">
          <p>{{ 'admin.home.artifacts_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-image" routerLink="/admin/artifacts" />
          </ng-template>
        </p-card>
      </div>
      <div>
        <p-card [header]="'admin.home.graph_title' | transloco" [subheader]="'admin.home.graph_subtitle' | transloco">
          <p>{{ 'admin.home.graph_desc' | transloco }}</p>
          <ng-template pTemplate="footer">
            <p-button [label]="'admin.common.open' | transloco" icon="pi pi-cloud" routerLink="/admin/graph" />
          </ng-template>
        </p-card>
      </div>
    </div>
  `,
  styles: [
    `
      .cards-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr;
      }
      @media (min-width: 768px) {
        .cards-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (min-width: 1024px) {
        .cards-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    `,
  ],
})
export class AdminHomeComponent {}
