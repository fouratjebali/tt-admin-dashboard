import { Component, input, output } from '@angular/core';

@Component({
  selector: 'tt-toggle',
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
})
export class TtToggleComponent {
  readonly checked = input(false);
  readonly disabled = input(false);
  readonly label = input<string>();
  readonly checkedChange = output<boolean>();

  protected toggle(): void {
    if (!this.disabled()) {
      this.checkedChange.emit(!this.checked());
    }
  }
}
