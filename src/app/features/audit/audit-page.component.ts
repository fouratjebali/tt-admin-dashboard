import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import {
  LucideBadgeCheck,
  LucideCalendarDays,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideDatabase,
  LucideDownload,
  LucideFileSearch,
  LucideListFilter,
  LucideRefreshCw,
  LucideScrollText,
  LucideSearch,
  LucideShieldCheck,
  LucideUserRoundSearch,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { AuditLog } from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { backendErrorMessage, isNetworkError } from '../../core/utils/api-error.util';

type AuditFilter = 'all' | string;
type StatTone = 'neutral' | 'success' | 'accent' | 'warning';

const PAGE_SIZE = 20;

const COPY = {
  en: {
    eyebrow: 'Security',
    title: 'Audit log',
    body: 'Review administrative actions, role changes, draft approvals, and send activity.',
    refresh: 'Refresh',
    export: 'Export CSV',
    retry: 'Retry',
    search: 'Search actor, action, resource',
    actionFilter: 'Action',
    resourceFilter: 'Resource',
    allActions: 'All actions',
    allResources: 'All resources',
    actor: 'Actor',
    action: 'Action',
    resource: 'Resource',
    details: 'Details',
    date: 'Date',
    loading: 'Loading audit events',
    emptyTitle: 'No audit events found',
    emptyBody: 'Try another search term or filter.',
    systemActor: 'System',
    noResource: 'No resource',
    noDetails: 'No metadata',
    range: 'Showing',
    of: 'of',
    previous: 'Previous page',
    next: 'Next page',
    stats: {
      total: 'Total events',
      actors: 'Active actors',
      today: 'Events today',
      resources: 'Resource types',
    },
    errors: {
      load: 'Unable to load audit events from the admin API.',
      network: 'Admin API is unreachable. Check backend and proxy configuration.',
    },
  },
  fr: {
    eyebrow: 'Securite',
    title: 'Journal audit',
    body: 'Consultez les actions admin, changements de roles, validations et envois.',
    refresh: 'Actualiser',
    export: 'Exporter CSV',
    retry: 'Reessayer',
    search: 'Rechercher acteur, action, ressource',
    actionFilter: 'Action',
    resourceFilter: 'Ressource',
    allActions: 'Toutes actions',
    allResources: 'Toutes ressources',
    actor: 'Acteur',
    action: 'Action',
    resource: 'Ressource',
    details: 'Details',
    date: 'Date',
    loading: 'Chargement evenements audit',
    emptyTitle: 'Aucun evenement audit',
    emptyBody: 'Essayez une autre recherche ou un autre filtre.',
    systemActor: 'Systeme',
    noResource: 'Aucune ressource',
    noDetails: 'Aucune metadata',
    range: 'Affichage',
    of: 'sur',
    previous: 'Page precedente',
    next: 'Page suivante',
    stats: {
      total: 'Total evenements',
      actors: 'Acteurs actifs',
      today: "Evenements aujourd'hui",
      resources: 'Types ressources',
    },
    errors: {
      load: "Impossible de charger les evenements audit depuis l'API admin.",
      network: 'API admin inaccessible. Verifiez le backend et le proxy.',
    },
  },
};

@Component({
  selector: 'app-audit-page',
  imports: [
    LucideBadgeCheck,
    LucideCalendarDays,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideDatabase,
    LucideDownload,
    LucideFileSearch,
    LucideListFilter,
    LucideRefreshCw,
    LucideScrollText,
    LucideSearch,
    LucideShieldCheck,
    LucideUserRoundSearch,
  ],
  templateUrl: './audit-page.component.html',
  styleUrl: './audit-page.component.scss',
})
export class AuditPageComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly preferences = inject(PreferencesService);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly logs = signal<AuditLog[]>([]);
  protected readonly total = signal(0);
  protected readonly offset = signal(0);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly searchTerm = signal('');
  protected readonly actionFilter = signal<AuditFilter>('all');
  protected readonly resourceFilter = signal<AuditFilter>('all');

  protected readonly filteredLogs = computed(() =>
    this.logs().filter((log) => {
      const actionMatches =
        this.actionFilter() === 'all' || this.actionGroup(log.action) === this.actionFilter();
      const resourceMatches =
        this.resourceFilter() === 'all' || this.resourceKey(log) === this.resourceFilter();

      return actionMatches && resourceMatches;
    }),
  );

  protected readonly actionOptions = computed(() =>
    [...new Set(this.logs().map((log) => this.actionGroup(log.action)))].sort(),
  );

  protected readonly resourceOptions = computed(() =>
    [
      ...new Set(
        this.logs()
          .map((log) => this.resourceKey(log))
          .filter(Boolean),
      ),
    ].sort(),
  );

  protected readonly stats = computed(() => {
    const logs = this.logs();
    const actors = new Set(logs.map((log) => log.actor_email || log.actor_user_id).filter(Boolean));
    const resources = new Set(logs.map((log) => this.resourceKey(log)).filter(Boolean));
    const today = logs.filter((log) => this.isToday(log.created_at)).length;

    return [
      {
        label: this.copy().stats.total,
        value: this.total() || logs.length,
        tone: 'neutral' as StatTone,
      },
      { label: this.copy().stats.actors, value: actors.size, tone: 'success' as StatTone },
      { label: this.copy().stats.today, value: today, tone: 'accent' as StatTone },
      { label: this.copy().stats.resources, value: resources.size, tone: 'warning' as StatTone },
    ];
  });

  protected readonly pageStart = computed(() =>
    this.total() === 0 && this.logs().length === 0 ? 0 : this.offset() + 1,
  );
  protected readonly pageEnd = computed(() =>
    Math.min(this.offset() + this.logs().length, this.total() || this.logs().length),
  );
  protected readonly canGoPrevious = computed(() => this.offset() > 0 && !this.loading());
  protected readonly canGoNext = computed(
    () => this.offset() + PAGE_SIZE < this.total() && !this.loading(),
  );

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  protected loadAuditLogs(): void {
    this.loading.set(true);
    this.error.set('');

    this.apiService
      .listAuditLogs({
        search: this.searchTerm().trim(),
        limit: PAGE_SIZE,
        offset: this.offset(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.logs.set(response.items ?? []);
          this.total.set(response.total ?? response.items?.length ?? 0);
        },
        error: (error: unknown) => {
          this.error.set(this.errorMessage(error));
          this.logs.set([]);
          this.total.set(0);
        },
      });
  }

  protected updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);

    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }

    this.searchDebounce = setTimeout(() => {
      this.offset.set(0);
      this.loadAuditLogs();
    }, 280);
  }

  protected updateActionFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.actionFilter.set(select.value);
  }

  protected updateResourceFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.resourceFilter.set(select.value);
  }

  protected previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.offset.update((offset) => Math.max(0, offset - PAGE_SIZE));
    this.loadAuditLogs();
  }

  protected nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.offset.update((offset) => offset + PAGE_SIZE);
    this.loadAuditLogs();
  }

  protected actorLabel(log: AuditLog): string {
    return log.actor_email || log.actor_user_id || this.copy().systemActor;
  }

  protected actionGroup(action: string): string {
    const normalized = action.toLowerCase();

    if (normalized.includes('login') || normalized.includes('auth')) {
      return 'auth';
    }

    if (
      normalized.includes('role') ||
      normalized.includes('user') ||
      normalized.includes('admin')
    ) {
      return 'users';
    }

    if (
      normalized.includes('draft') ||
      normalized.includes('approve') ||
      normalized.includes('review')
    ) {
      return 'drafts';
    }

    if (normalized.includes('send') || normalized.includes('mail')) {
      return 'mail';
    }

    if (normalized.includes('planning') || normalized.includes('import')) {
      return 'planning';
    }

    return 'system';
  }

  protected resourceKey(log: AuditLog): string {
    return log.resource_type || this.copy().noResource;
  }

  protected resourceLabel(log: AuditLog): string {
    const resourceType = log.resource_type || this.copy().noResource;

    if (!log.resource_id) {
      return resourceType;
    }

    return `${resourceType} #${log.resource_id}`;
  }

  protected formatAction(action: string): string {
    return action
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  protected formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  protected metadataSummary(log: AuditLog): string {
    if (!log.metadata || Object.keys(log.metadata).length === 0) {
      return this.copy().noDetails;
    }

    return Object.entries(log.metadata)
      .slice(0, 2)
      .map(([key, value]) => `${this.formatAction(key)}: ${this.formatMetadataValue(value)}`)
      .join(' · ');
  }

  protected exportCsv(): void {
    const rows = this.filteredLogs();
    const headers = ['date', 'actor', 'action', 'resource_type', 'resource_id', 'metadata'];
    const csv = [
      headers.join(','),
      ...rows.map((log) =>
        [
          log.created_at,
          this.actorLabel(log),
          log.action,
          log.resource_type ?? '',
          log.resource_id ?? '',
          JSON.stringify(log.metadata ?? {}),
        ]
          .map((value) => this.csvCell(value))
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private csvCell(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private isToday(value: string): boolean {
    const date = new Date(value);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  private errorMessage(error: unknown): string {
    if (isNetworkError(error)) {
      return this.copy().errors.network;
    }

    return backendErrorMessage(error, this.copy().errors.load);
  }
}
