import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'fin-modulo-no-disponible',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>Módulo no disponible — en construcción</p>`,
})
export class ModuloNoDisponibleComponent {
  readonly route = inject(ActivatedRoute);
}
