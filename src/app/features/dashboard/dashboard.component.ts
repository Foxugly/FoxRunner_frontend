import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ButtonModule, CardModule, RouterLink, PageHeaderComponent],
  template: `
    <app-page-header
      icon="pi-home"
      title="Tableau de bord"
    />

    <div class="grid">
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Scénarios" subheader="Consulter et lancer des scénarios">
          <p>Liste, détail, exécution dry-run ou réelle, partage.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-sitemap" routerLink="/scenarios" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Slots" subheader="Planification des créneaux">
          <p>Créer et gérer les plages horaires d'exécution hebdomadaires.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-calendar" routerLink="/slots" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Jobs" subheader="Suivi des exécutions">
          <p>File d'attente, suivi en direct, relance et annulation.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-play" routerLink="/jobs" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Plan" subheader="Prochaine exécution">
          <p>Voir le prochain créneau planifié.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-clock" routerLink="/plan" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Historique" subheader="Exécutions passées">
          <p>Réussites, échecs, filtres par scénario et statut.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-history" routerLink="/history" />
          </ng-template>
        </p-card>
      </div>
    </div>
  `,
})
export class DashboardComponent {}
