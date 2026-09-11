import { DOCUMENT } from '@angular/common';
import { Injectable, computed, effect, inject, signal } from '@angular/core';

export type Language = 'en' | 'fr';
export type Theme = 'light' | 'dark';

const LANGUAGE_KEY = 'tt_admin_language';
const THEME_KEY = 'tt_admin_theme';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly languageSignal = signal<Language>(this.readLanguage());
  private readonly themeSignal = signal<Theme>(this.readTheme());

  readonly language = this.languageSignal.asReadonly();
  readonly theme = this.themeSignal.asReadonly();
  readonly isDarkMode = computed(() => this.themeSignal() === 'dark');

  constructor() {
    effect(() => {
      const theme = this.themeSignal();
      this.document.documentElement.dataset['theme'] = theme;
      localStorage.setItem(THEME_KEY, theme);
    });

    effect(() => {
      const language = this.languageSignal();
      this.document.documentElement.lang = language;
      localStorage.setItem(LANGUAGE_KEY, language);
    });
  }

  setLanguage(language: Language): void {
    this.languageSignal.set(language);
  }

  toggleTheme(): void {
    this.themeSignal.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  private readLanguage(): Language {
    return localStorage.getItem(LANGUAGE_KEY) === 'fr' ? 'fr' : 'en';
  }

  private readTheme(): Theme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }
}
