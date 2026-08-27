import { Component, input } from '@angular/core';

@Component({
  selector: 'tt-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class TtCardComponent {
  readonly title = input<string>();
}
