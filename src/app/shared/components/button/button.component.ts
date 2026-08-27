import { Component, input } from '@angular/core';

import { TtIconComponent } from '../icon/icon.component';

export type TtButtonVariant = 'primary' | 'ghost' | 'danger';

@Component({
  selector: 'tt-button',
  imports: [TtIconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class TtButtonComponent {
  readonly variant = input<TtButtonVariant>('primary');
  readonly icon = input<string>();
  readonly disabled = input(false);
}
