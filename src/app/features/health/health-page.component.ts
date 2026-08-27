import { Component } from '@angular/core';

@Component({
  selector: 'app-health-page',
  template: '<h1>System Health — page owned by Senda, Sprint 2</h1>',
  styles: [
    `
      h1 {
        margin: 0;
        color: var(--tt-forest);
        font-size: 20px;
        font-weight: 800;
      }
    `,
  ],
})
export class HealthPageComponent {}
