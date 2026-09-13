import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleAlert,
  LucideEye,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSave,
  LucideSearch,
  LucideTrash2,
  LucideUserRoundCheck,
  LucideUsersRound,
  LucideX,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import {
  PaginatedResponse,
  ResponsableContact,
  ResponsablePayload,
} from '../../core/models/backend-api.model';
import { ApiService } from '../../core/services/api.service';
import { PreferencesService } from '../../core/services/preferences.service';
import { backendErrorMessage, isNetworkError } from '../../core/utils/api-error.util';

type FormMode = 'create' | 'edit';
type StatTone = 'neutral' | 'success' | 'accent' | 'warning';

const PAGE_SIZE = 20;

const COPY = {
  en: {
    eyebrow: 'Planning directory',
    title: 'Responsables',
    body: 'Maintain the internal responsables used by the planning flow for residence-based training communication.',
    refresh: 'Refresh',
    add: 'Add responsable',
    edit: 'Edit',
    view: 'View',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Create',
    update: 'Update',
    retry: 'Retry',
    close: 'Close',
    search: 'Search by name, function, or residence',
    residenceFilter: 'Residence',
    allResidences: 'All residences',
    responsable: 'Responsable',
    function: 'Function',
    residence: 'Residence',
    created: 'Created',
    actions: 'Actions',
    detail: 'Responsable detail',
    loading: 'Loading responsables',
    saving: 'Saving responsable',
    deleting: 'Deleting responsable',
    emptyTitle: 'No responsables found',
    emptyBody: 'Create a responsable or try another search.',
    range: 'Showing',
    of: 'of',
    previous: 'Previous page',
    next: 'Next page',
    notAvailable: 'Not available',
    confirmDelete: 'Delete this responsable? This action cannot be undone.',
    form: {
      name: 'Full name',
      namePlaceholder: 'Responsable RH Gabes',
      nameError: 'Enter the responsable name.',
      function: 'Function',
      functionPlaceholder: 'RESP RH',
      functionError: 'Enter the function.',
      residence: 'Large residence',
      residencePlaceholder: 'DIRECTION REGIONALE GABES',
      residenceError: 'Enter the large residence.',
    },
    stats: {
      total: 'Total responsables',
      residences: 'Residences',
      functions: 'Functions',
      page: 'Loaded page',
    },
    errors: {
      load: 'Unable to load responsables from the planning API.',
      save: 'Unable to save this responsable.',
      detail: 'Unable to load responsable detail.',
      delete: 'Unable to delete this responsable.',
      network: 'Planning API is unreachable. Check backend containers and proxy configuration.',
    },
  },
  fr: {
    eyebrow: 'Repertoire planning',
    title: 'Responsables',
    body: 'Gerez les responsables internes utilises par le flux planning pour les communications formation par residence.',
    refresh: 'Actualiser',
    add: 'Ajouter responsable',
    edit: 'Modifier',
    view: 'Voir',
    delete: 'Supprimer',
    cancel: 'Annuler',
    save: 'Enregistrer',
    create: 'Creer',
    update: 'Mettre a jour',
    retry: 'Reessayer',
    close: 'Fermer',
    search: 'Rechercher par nom, fonction ou residence',
    residenceFilter: 'Residence',
    allResidences: 'Toutes residences',
    responsable: 'Responsable',
    function: 'Fonction',
    residence: 'Residence',
    created: 'Creation',
    actions: 'Actions',
    detail: 'Detail responsable',
    loading: 'Chargement responsables',
    saving: 'Enregistrement responsable',
    deleting: 'Suppression responsable',
    emptyTitle: 'Aucun responsable',
    emptyBody: 'Creez un responsable ou essayez une autre recherche.',
    range: 'Affichage',
    of: 'sur',
    previous: 'Page precedente',
    next: 'Page suivante',
    notAvailable: 'Non disponible',
    confirmDelete: 'Supprimer ce responsable ? Cette action est definitive.',
    form: {
      name: 'Nom complet',
      namePlaceholder: 'Responsable RH Gabes',
      nameError: 'Saisissez le nom du responsable.',
      function: 'Fonction',
      functionPlaceholder: 'RESP RH',
      functionError: 'Saisissez la fonction.',
      residence: 'Grande residence',
      residencePlaceholder: 'DIRECTION REGIONALE GABES',
      residenceError: 'Saisissez la grande residence.',
    },
    stats: {
      total: 'Total responsables',
      residences: 'Residences',
      functions: 'Fonctions',
      page: 'Page chargee',
    },
    errors: {
      load: "Impossible de charger les responsables depuis l'API planning.",
      save: "Impossible d'enregistrer ce responsable.",
      detail: 'Impossible de charger le detail responsable.',
      delete: 'Impossible de supprimer ce responsable.',
      network: 'API planning inaccessible. Verifiez les containers backend et le proxy.',
    },
  },
};

@Component({
  selector: 'app-responsables-page',
  imports: [
    ReactiveFormsModule,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleAlert,
    LucideEye,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSave,
    LucideSearch,
    LucideTrash2,
    LucideUserRoundCheck,
    LucideUsersRound,
    LucideX,
  ],
  templateUrl: './responsables-page.component.html',
  styleUrl: './responsables-page.component.scss',
})
export class ResponsablesPageComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly preferences = inject(PreferencesService);
  private searchDebounce?: ReturnType<typeof setTimeout>;

  protected readonly copy = computed(() => COPY[this.preferences.language()]);
  protected readonly responsables = signal<ResponsableContact[]>([]);
  protected readonly selectedResponsable = signal<ResponsableContact | null>(null);
  protected readonly total = signal(0);
  protected readonly offset = signal(0);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly deletingId = signal('');
  protected readonly detailLoading = signal(false);
  protected readonly error = signal('');
  protected readonly formError = signal('');
  protected readonly detailError = signal('');
  protected readonly searchTerm = signal('');
  protected readonly residenceFilter = signal('all');
  protected readonly formOpen = signal(false);
  protected readonly formMode = signal<FormMode>('create');
  protected readonly editingId = signal('');

  protected readonly responsableForm = this.formBuilder.group({
    nom_complet: ['', [Validators.required]],
    fonction: ['', [Validators.required]],
    grande_residence: ['', [Validators.required]],
  });

  protected readonly residenceOptions = computed(() =>
    [
      ...new Set(
        this.responsables()
          .map((responsable) => this.residenceName(responsable))
          .filter((residence) => residence !== this.copy().notAvailable),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  );

  protected readonly visibleResponsables = computed(() =>
    this.responsables().filter((responsable) => {
      const residence = this.residenceName(responsable);
      return this.residenceFilter() === 'all' || residence === this.residenceFilter();
    }),
  );

  protected readonly stats = computed(() => {
    const responsables = this.responsables();
    const residences = new Set(
      responsables.map((responsable) => this.residenceName(responsable)).filter(Boolean),
    );
    const functions = new Set(
      responsables.map((responsable) => this.functionName(responsable)).filter(Boolean),
    );

    return [
      {
        label: this.copy().stats.total,
        value: this.total() || responsables.length,
        tone: 'neutral' as StatTone,
      },
      { label: this.copy().stats.residences, value: residences.size, tone: 'success' as StatTone },
      { label: this.copy().stats.functions, value: functions.size, tone: 'accent' as StatTone },
      { label: this.copy().stats.page, value: responsables.length, tone: 'warning' as StatTone },
    ];
  });

  protected readonly pageStart = computed(() =>
    this.total() === 0 && this.responsables().length === 0 ? 0 : this.offset() + 1,
  );
  protected readonly pageEnd = computed(() =>
    Math.min(
      this.offset() + this.responsables().length,
      this.total() || this.responsables().length,
    ),
  );
  protected readonly canGoPrevious = computed(() => this.offset() > 0 && !this.loading());
  protected readonly canGoNext = computed(
    () => this.offset() + PAGE_SIZE < this.total() && !this.loading(),
  );

  ngOnInit(): void {
    this.loadResponsables();
  }

  ngOnDestroy(): void {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
    }
  }

  protected loadResponsables(): void {
    this.loading.set(true);
    this.error.set('');

    this.apiService
      .listResponsables({
        search: this.searchTerm().trim(),
        residence: this.residenceFilter() === 'all' ? '' : this.residenceFilter(),
        limit: PAGE_SIZE,
        offset: this.offset(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          const normalized = this.normalizeResponsablesResponse(response);
          this.responsables.set(normalized.items);
          this.total.set(normalized.total);
        },
        error: (error: unknown) => {
          this.responsables.set([]);
          this.total.set(0);
          this.error.set(this.errorMessage(error, this.copy().errors.load));
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
      this.loadResponsables();
    }, 280);
  }

  protected updateResidenceFilter(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.residenceFilter.set(select.value);
    this.offset.set(0);
    this.loadResponsables();
  }

  protected previousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.offset.update((offset) => Math.max(0, offset - PAGE_SIZE));
    this.loadResponsables();
  }

  protected nextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.offset.update((offset) => offset + PAGE_SIZE);
    this.loadResponsables();
  }

  protected openCreateForm(): void {
    this.closeDetails();
    this.formMode.set('create');
    this.editingId.set('');
    this.formError.set('');
    this.responsableForm.reset({
      nom_complet: '',
      fonction: '',
      grande_residence: '',
    });
    this.formOpen.set(true);
  }

  protected openEditForm(responsable: ResponsableContact): void {
    this.closeDetails();
    this.formMode.set('edit');
    this.editingId.set(this.responsableId(responsable));
    this.formError.set('');
    this.responsableForm.reset(this.payloadFrom(responsable));
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.formError.set('');
    this.editingId.set('');
  }

  protected saveResponsable(): void {
    if (this.responsableForm.invalid) {
      this.responsableForm.markAllAsTouched();
      return;
    }

    const payload = this.responsableForm.getRawValue();

    this.saving.set(true);
    this.formError.set('');

    const request =
      this.formMode() === 'edit'
        ? this.apiService.updateResponsable(this.editingId(), payload)
        : this.apiService.createResponsable(payload);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (response) => {
        const responsable = this.normalizeResponsable(this.unwrapResponsable(response));

        if (this.formMode() === 'edit') {
          this.replaceResponsable(responsable);
        } else {
          this.responsables.update((items) => [responsable, ...items].slice(0, PAGE_SIZE));
          this.total.update((total) => total + 1);
        }

        this.closeForm();
      },
      error: (error: unknown) => {
        this.formError.set(this.errorMessage(error, this.copy().errors.save));
      },
    });
  }

  protected openDetails(responsable: ResponsableContact): void {
    this.closeForm();
    this.selectedResponsable.set(responsable);
    this.detailError.set('');
    this.detailLoading.set(true);

    this.apiService
      .getResponsable(this.responsableId(responsable))
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (response) =>
          this.selectedResponsable.set(this.normalizeResponsable(this.unwrapResponsable(response))),
        error: (error: unknown) => {
          this.detailError.set(this.errorMessage(error, this.copy().errors.detail));
        },
      });
  }

  protected closeDetails(): void {
    this.selectedResponsable.set(null);
    this.detailError.set('');
  }

  protected deleteResponsable(responsable: ResponsableContact): void {
    if (!window.confirm(this.copy().confirmDelete)) {
      return;
    }

    const responsableId = this.responsableId(responsable);

    this.deletingId.set(responsableId);
    this.error.set('');

    this.apiService
      .deleteResponsable(responsableId)
      .pipe(finalize(() => this.deletingId.set('')))
      .subscribe({
        next: () => {
          this.responsables.update((items) =>
            items.filter((item) => this.responsableId(item) !== responsableId),
          );
          this.total.update((total) => Math.max(0, total - 1));

          if (
            this.selectedResponsable() &&
            this.responsableId(this.selectedResponsable()!) === responsableId
          ) {
            this.closeDetails();
          }
        },
        error: (error: unknown) => {
          this.error.set(this.errorMessage(error, this.copy().errors.delete));
        },
      });
  }

  protected hasFormError(controlName: keyof ResponsablePayload): boolean {
    const control = this.responsableForm.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected responsableInitials(responsable: ResponsableContact): string {
    const initials = this.responsableName(responsable)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');

    return initials || 'RH';
  }

  protected responsableId(responsable: ResponsableContact): string {
    return (
      this.stringFrom(responsable, ['id', 'responsable_id', 'contact_key', 'contactKey']) ||
      this.responsableName(responsable)
    );
  }

  protected responsableName(responsable: ResponsableContact): string {
    return (
      this.stringFrom(responsable, ['nom_complet', 'full_name', 'name']) || this.copy().notAvailable
    );
  }

  protected functionName(responsable: ResponsableContact): string {
    return this.stringFrom(responsable, ['fonction', 'role']) || this.copy().notAvailable;
  }

  protected residenceName(responsable: ResponsableContact): string {
    return (
      this.stringFrom(responsable, ['grande_residence', 'residence']) || this.copy().notAvailable
    );
  }

  protected formatDate(value?: string): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(this.preferences.language() === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
    }).format(date);
  }

  protected isDeleting(responsable: ResponsableContact): boolean {
    return this.deletingId() === this.responsableId(responsable);
  }

  protected isCreateMode(): boolean {
    return this.formMode() === 'create';
  }

  private normalizeResponsablesResponse(
    response: PaginatedResponse<ResponsableContact> | unknown,
  ): {
    items: ResponsableContact[];
    total: number;
  } {
    const items = this.responsableArrayFrom(response).map((responsable) =>
      this.normalizeResponsable(responsable),
    );

    return {
      items,
      total: this.totalFrom(response, items.length),
    };
  }

  private responsableArrayFrom(response: unknown): unknown[] {
    if (Array.isArray(response)) {
      return response;
    }

    const record = this.recordFrom(response);

    if (!record) {
      return [];
    }

    const direct = this.arrayFrom(record, ['responsables', 'items', 'data', 'results', 'records']);

    if (direct.length > 0) {
      return direct;
    }

    return this.arrayFrom(this.recordFrom(record['data']), [
      'responsables',
      'items',
      'results',
      'records',
    ]);
  }

  private unwrapResponsable(response: unknown): unknown {
    const record = this.recordFrom(response);

    if (!record) {
      return response;
    }

    return record['responsable'] ?? record['contact'] ?? record['item'] ?? response;
  }

  private normalizeResponsable(source: unknown): ResponsableContact {
    const record = this.recordFrom(source) ?? {};
    const nomComplet = this.stringFrom(record, ['nom_complet', 'full_name', 'name']);
    const fonction = this.stringFrom(record, ['fonction', 'role']);
    const grandeResidence = this.stringFrom(record, ['grande_residence', 'residence']);

    return {
      ...record,
      id: this.stringFrom(record, ['id', '_id']),
      responsable_id: this.stringFrom(record, ['responsable_id', 'responsableId']),
      contact_key: this.stringFrom(record, ['contact_key', 'contactKey']),
      nom_complet: nomComplet,
      full_name: nomComplet,
      fonction,
      role: fonction,
      grande_residence: grandeResidence,
      residence: grandeResidence,
      created_at: this.stringFrom(record, ['created_at', 'createdAt', 'created']),
      updated_at: this.stringFrom(record, ['updated_at', 'updatedAt', 'updated']),
    };
  }

  private replaceResponsable(updatedResponsable: ResponsableContact): void {
    this.responsables.update((items) =>
      items.map((item) =>
        this.responsableId(item) === this.responsableId(updatedResponsable)
          ? updatedResponsable
          : item,
      ),
    );
  }

  private payloadFrom(responsable: ResponsableContact): ResponsablePayload {
    return {
      nom_complet: this.responsableName(responsable),
      fonction: this.functionName(responsable),
      grande_residence: this.residenceName(responsable),
    };
  }

  private totalFrom(response: unknown, fallback: number): number {
    const record = this.recordFrom(response);
    const direct = this.numberFrom(record, ['total', 'count', 'total_count', 'totalCount']);

    if (direct !== null) {
      return direct;
    }

    return (
      this.numberFrom(this.recordFrom(record?.['data']), [
        'total',
        'count',
        'total_count',
        'totalCount',
      ]) ?? fallback
    );
  }

  private arrayFrom(record: Record<string, unknown> | null, keys: string[]): unknown[] {
    if (!record) {
      return [];
    }

    for (const key of keys) {
      const value = record[key];

      if (Array.isArray(value)) {
        return value;
      }
    }

    return [];
  }

  private recordFrom(source: unknown): Record<string, unknown> | null {
    return source && typeof source === 'object' && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : null;
  }

  private stringFrom(source: unknown, keys: string[]): string {
    const record = this.recordFrom(source);

    if (!record) {
      return '';
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'string' && value.trim()) {
        return value;
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
    }

    return '';
  }

  private numberFrom(record: Record<string, unknown> | null, keys: string[]): number | null {
    if (!record) {
      return null;
    }

    for (const key of keys) {
      const value = record[key];

      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === 'string' && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }

    return null;
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (isNetworkError(error)) {
      return this.copy().errors.network;
    }

    return backendErrorMessage(error, fallback);
  }
}
