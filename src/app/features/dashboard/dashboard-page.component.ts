import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-page',
  template: '<h1>Dashboard — page owned by Islem, Sprint 3</h1>',
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
export class DashboardPageComponent {}
