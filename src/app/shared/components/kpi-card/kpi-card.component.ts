import { Component, input } from '@angular/core';

import { TtCardComponent } from '../card/card.component';
import { TtIconComponent } from '../icon/icon.component';

export type TtKpiIconVariant = 'sage' | 'amber' | 'terra' | 'teal';

@Component({
  selector: 'tt-kpi-card',
  imports: [TtCardComponent, TtIconComponent],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class TtKpiCardComponent {
  readonly icon = input.required<string>();
  readonly iconVariant = input<TtKpiIconVariant>('sage');
  readonly value = input.required<string>();
  readonly label = input.required<string>();
  readonly sublabel = input<string>();
}
