import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';

import { loadModulos, toggleModulo } from '../../store/empresa.actions';
import { selectAllModulos, selectEmpresaPending } from '../../store/empresa.selectors';
import { MODULO_META, ModuleCode, ModuloMeta } from '../../models/modulo.model';
import { ModuloCardComponent } from './components/modulo-card.component';

@Component({
  selector: 'emp-modulos-page',
  standalone: true,
  imports: [ConfirmDialogModule, ModuloCardComponent],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-confirmDialog />
    @for (m of modulos(); track m.moduleCode) {
      <emp-modulo-card
        [meta]="metaFor(m.moduleCode)"
        [enabled]="m.enabled"
        [disabled]="pending()"
        (toggle)="askToggle(m.moduleCode, $event)" />
    }
  `,
})
export class ModulosPage implements OnInit {
  private readonly store = inject(Store);
  private readonly confirm = inject(ConfirmationService);

  readonly modulos = this.store.selectSignal(selectAllModulos);
  readonly pending = this.store.selectSignal(selectEmpresaPending);

  ngOnInit(): void {
    this.store.dispatch(loadModulos());
  }

  metaFor(code: ModuleCode): ModuloMeta {
    return MODULO_META[code];
  }

  askToggle(code: ModuleCode, enable: boolean): void {
    const meta = this.metaFor(code);
    this.confirm.confirm({
      header: enable ? `¿Activar ${meta.label}?` : `¿Desactivar ${meta.label}?`,
      message: enable
        ? `Los usuarios ganarán acceso a la sección ${meta.label}.`
        : `Los usuarios perderán acceso a la sección ${meta.label}.`,
      acceptLabel: enable ? 'Activar' : 'Desactivar',
      rejectLabel: 'Cancelar',
      accept: () => this.store.dispatch(toggleModulo({ code, enable })),
    });
  }
}
