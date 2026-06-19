import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'fin-cobros-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Cobros — en construcción</p>`,
})
export class CobrosPage {}
