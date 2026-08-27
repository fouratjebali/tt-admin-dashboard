import { Component, input, output } from '@angular/core';

import { TtButtonComponent, TtButtonVariant } from '../button/button.component';

@Component({
  selector: 'tt-modal',
  imports: [TtButtonComponent],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class TtModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly message = input('');
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly confirmVariant = input<TtButtonVariant>('primary');
  readonly confirm = output<void>();
  readonly dismiss = output<void>();
}
