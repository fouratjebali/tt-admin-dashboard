import { Injectable } from '@angular/core';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DemoStatsService {
  private readonly enabled = Boolean((environment as { demoStats?: boolean }).demoStats);

  number(value: number, key: string): number {
    if (!this.enabled || value !== 0) {
      return value;
    }

    return this.seededNumber(key);
  }

  private seededNumber(key: string): number {
    let hash = 0;

    for (let index = 0; index < key.length; index += 1) {
      hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
    }

    return (hash % 20) + 1;
  }
}
