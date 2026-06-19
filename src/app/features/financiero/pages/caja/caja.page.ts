import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'fin-caja-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Caja — en construcción</p>`,
})
export class CajaPage {}
