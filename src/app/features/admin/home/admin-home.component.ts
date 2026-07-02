import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [RouterLink, ButtonModule, CardModule, PageHeaderComponent],
  template: `
    <app-page-header
      icon="pi-cog"
      title="Administration"
    />

    <div class="grid">
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Utilisateurs" subheader="Gestion des comptes">
          <p>Activer/désactiver, accorder le rôle superuser, vérifier les emails.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-users" routerLink="/admin/users" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Paramètres" subheader="Clé → valeur JSON">
          <p>Lecture/écriture des réglages applicatifs persistés.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-sliders-h" routerLink="/admin/settings" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Configuration" subheader="Pushovers, réseaux, défauts">
          <p>Le bloc « data » global du catalogue : identifiants Pushover, profils réseaux et clés par défaut.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-server" routerLink="/admin/config" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Audit" subheader="Journal d'événements">
          <p>Traces horodatées des actions, filtrables par acteur et cible.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-list" routerLink="/admin/audit" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Santé" subheader="Config, DB, monitoring">
          <p>Indicateurs de santé, stats de base, compteurs Celery & Graph.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-heart" routerLink="/admin/health" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Rétention" subheader="Purge DB">
          <p>Supprimer jobs / audit / notifications Graph au-delà d'une durée.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-trash" routerLink="/admin/retention" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Catalogue" subheader="Export / Import">
          <p>Sauvegarder ou restaurer scénarios et slots (dry-run disponible).</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-file-export" routerLink="/admin/catalog" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Artefacts" subheader="Screenshots & pages">
          <p>Parcours et suppression des captures Selenium.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-image" routerLink="/admin/artifacts" />
          </ng-template>
        </p-card>
      </div>
      <div class="col-12 md:col-6 lg:col-4">
        <p-card header="Microsoft Graph" subheader="Abonnements & notifications">
          <p>Créer et renouveler les webhooks Microsoft Graph.</p>
          <ng-template pTemplate="footer">
            <p-button label="Ouvrir" icon="pi pi-cloud" routerLink="/admin/graph" />
          </ng-template>
        </p-card>
      </div>
    </div>
  `,
})
export class AdminHomeComponent {}
