import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-nueva-visita',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="text-xl font-semibold">Nueva visita a domicilio</h1>`,
})
export class NuevaVisitaPage {}
