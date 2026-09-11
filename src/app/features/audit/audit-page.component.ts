import { Component, computed, inject } from '@angular/core';

import { PreferencesService } from '../../core/services/preferences.service';

const COPY = {
  en: {
    eyebrow: 'Security',
    title: 'Audit log',
    body: 'Review administrative actions, role changes, draft approvals, and send activity.',
  },
  fr: {
    eyebrow: 'Securite',
    title: 'Journal audit',
    body: 'Consultez les actions admin, changements de roles, validations et envois.',
  },
};

@Component({
  selector: 'app-audit-page',
  template:
    '<section class="page-state"><span class="page-state__eyebrow">{{ copy().eyebrow }}</span><h1>{{ copy().title }}</h1><p>{{ copy().body }}</p></section>',
})
export class AuditPageComponent {
  private readonly preferences = inject(PreferencesService);
  protected readonly copy = computed(() => COPY[this.preferences.language()]);
}
