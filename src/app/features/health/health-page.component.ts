import { Component, computed, inject } from '@angular/core';

import { PreferencesService } from '../../core/services/preferences.service';

const COPY = {
  en: {
    eyebrow: 'Platform health',
    title: 'System health',
    body: 'Track backend availability, mail connector status, queues, and operational incidents.',
  },
  fr: {
    eyebrow: 'Sante plateforme',
    title: 'Sante systeme',
    body: 'Suivez la disponibilite backend, le connecteur mail, les files et les incidents.',
  },
};

@Component({
  selector: 'app-health-page',
  template:
    '<section class="page-state"><span class="page-state__eyebrow">{{ copy().eyebrow }}</span><h1>{{ copy().title }}</h1><p>{{ copy().body }}</p></section>',
})
export class HealthPageComponent {
  private readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => COPY[this.preferences.language()]);
}
