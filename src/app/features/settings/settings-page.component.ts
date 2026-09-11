import { Component, computed, inject } from '@angular/core';

import { PreferencesService } from '../../core/services/preferences.service';

const COPY = {
  en: {
    eyebrow: 'Controls',
    title: 'Global settings',
    body: 'Configure organization-wide mail assistant rules, automation limits, and review policy.',
  },
  fr: {
    eyebrow: 'Controles',
    title: 'Parametres globaux',
    body: 'Configurez les regles globales, les limites automation et la politique de revue.',
  },
};

@Component({
  selector: 'app-settings-page',
  template:
    '<section class="page-state"><span class="page-state__eyebrow">{{ copy().eyebrow }}</span><h1>{{ copy().title }}</h1><p>{{ copy().body }}</p></section>',
})
export class SettingsPageComponent {
  private readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => COPY[this.preferences.language()]);
}
