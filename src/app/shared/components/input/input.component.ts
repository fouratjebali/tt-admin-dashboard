import { Component, input, output } from '@angular/core';

@Component({
  selector: 'tt-input',
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class TtInputComponent {
  readonly label = input('');
  readonly hint = input<string>();
  readonly placeholder = input('');
  readonly type = input('text');
  readonly value = input('');
  readonly disabled = input(false);
  readonly valueChange = output<string>();

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }
}
