import { Component, input } from '@angular/core';

export type TtBadgeVariant =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'on'
  | 'off'
  | 'role'
  | 'role-support'
  | 'up'
  | 'degraded'
  | 'down';

@Component({
  selector: 'tt-badge',
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class TtBadgeComponent {
  readonly variant = input<TtBadgeVariant>('active');
}
