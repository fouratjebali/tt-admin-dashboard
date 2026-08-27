import { Component, input, output } from '@angular/core';

export interface TtSelectOption {
  label: string;
  value: string;
}

@Component({
  selector: 'tt-select',
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
})
export class TtSelectComponent {
  readonly label = input('');
  readonly hint = input<string>();
  readonly value = input('');
  readonly disabled = input(false);
  readonly options = input<TtSelectOption[]>([]);
  readonly valueChange = output<string>();

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}
