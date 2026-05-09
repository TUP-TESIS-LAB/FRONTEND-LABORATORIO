import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { EmpresaService } from '../../services/empresa.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <div class="page-header">
      <h2>Usuarios</h2>
    </div>
    @if (usuariosResource.isLoading()) {
      <p>Cargando...</p>
    } @else if (usuariosResource.value()?.length === 0) {
      <ui-empty-state heading="Sin usuarios" icon="pi-users"
                      description="Aún no hay usuarios registrados en el sistema."
                      ctaLabel="Agregar usuario" />
    }
  `,
  styles: [`.page-header { margin-bottom: var(--space-6); }`],
})
export class UsuariosComponent {
  private readonly service = inject(EmpresaService);
  protected readonly usuariosResource = resource({
    loader: () => this.service.getUsuarios().toPromise(),
  });
}
