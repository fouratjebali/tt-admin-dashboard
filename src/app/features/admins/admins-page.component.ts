import { Component, computed, inject } from '@angular/core';

import { PreferencesService } from '../../core/services/preferences.service';

const COPY = {
  en: {
    eyebrow: 'Administration',
    title: 'Administrators',
    body: 'Maintain admin access, reviewer assignments, and viewer permissions for the dashboard.',
  },
  fr: {
    eyebrow: 'Administration',
    title: 'Administrateurs',
    body: 'Gerez les acces admin, les reviewers et les permissions viewer du dashboard.',
  },
};

@Component({
  selector: 'app-admins-page',
  template:
    '<section class="page-state"><span class="page-state__eyebrow">{{ copy().eyebrow }}</span><h1>{{ copy().title }}</h1><p>{{ copy().body }}</p></section>',
})
export class AdminsPageComponent {
  private readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => COPY[this.preferences.language()]);
}
