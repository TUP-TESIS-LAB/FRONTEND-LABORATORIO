import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-agenda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="text-xl font-semibold">Visitas a domicilio</h1>`,
})
export class AgendaPage {}
