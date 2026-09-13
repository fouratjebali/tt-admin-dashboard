import { HttpErrorResponse } from '@angular/common/http';

export function backendErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  const detail = error.error?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && 'msg' in item) {
          const message = (item as { msg?: unknown }).msg;
          return typeof message === 'string' ? message : '';
        }

        return '';
      })
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  return fallback;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 0;
}
