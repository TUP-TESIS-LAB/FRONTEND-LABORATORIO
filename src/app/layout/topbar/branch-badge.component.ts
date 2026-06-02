import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ChipModule } from 'primeng/chip';
import { TooltipModule } from 'primeng/tooltip';
import { OperatorBranchContextService } from '@features/turnos/services/operator-branch.context';

@Component({
  selector: 'ui-branch-badge',
  standalone: true,
  imports: [ChipModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (branchName()) {
      <p-chip
        [label]="'Sucursal: ' + branchName()"
        icon="pi pi-map-marker"
        styleClass="ui-branch-badge ui-branch-badge--set"
        [pTooltip]="tooltipSet"
        tooltipPosition="bottom" />
    } @else {
      <p-chip
        label="Sin sucursal"
        icon="pi pi-exclamation-triangle"
        styleClass="ui-branch-badge ui-branch-badge--unset"
        [pTooltip]="tooltipUnset"
        tooltipPosition="bottom" />
    }
  `,
  styles: [`
    :host { display: inline-flex; }
    :host ::ng-deep .ui-branch-badge {
      font-size: 11px;
      height: 26px;
      background: rgba(255,255,255,.08);
      color: #f1f5f9;
      border: 1px solid rgba(255,255,255,.12);
    }
    :host ::ng-deep .ui-branch-badge--unset {
      background: rgba(245,158,11,.18);
      border-color: rgba(245,158,11,.35);
      color: #fde68a;
    }
    :host ::ng-deep .ui-branch-badge .p-chip-icon { font-size: 12px; }
  `],
})
export class BranchBadgeComponent {
  private readonly ctx = inject(OperatorBranchContextService);

  protected readonly branchName = computed(() => this.ctx.branchName());

  protected readonly tooltipSet = 'Para cambiar de sucursal, pedile al administrador.';
  protected readonly tooltipUnset = 'No tenés sucursal asignada. Avisá al administrador.';
}
