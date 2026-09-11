import { Component, computed, inject } from '@angular/core';

import { PreferencesService } from '../../core/services/preferences.service';

const COPY = {
  en: {
    eyebrow: 'User management',
    title: 'Users',
    body: 'Manage employee access, roles, and account status from the admin user directory.',
  },
  fr: {
    eyebrow: 'Gestion utilisateurs',
    title: 'Utilisateurs',
    body: 'Gerez les acces employes, les roles et le statut des comptes depuis le repertoire admin.',
  },
};

@Component({
  selector: 'app-users-page',
  template:
    '<section class="page-state"><span class="page-state__eyebrow">{{ copy().eyebrow }}</span><h1>{{ copy().title }}</h1><p>{{ copy().body }}</p></section>',
})
export class UsersPageComponent {
  private readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => COPY[this.preferences.language()]);
}
