import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';

import { AdminLayoutComponent } from './shared/components/admin-layout/admin-layout.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AdminLayoutComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);

  protected readonly isLoginRoute = computed(() => this.currentUrl().startsWith('/login'));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
      }
    });
  }
}
