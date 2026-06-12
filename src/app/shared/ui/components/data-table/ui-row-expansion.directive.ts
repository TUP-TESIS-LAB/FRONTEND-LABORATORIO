import { Directive, TemplateRef, inject } from '@angular/core';

/**
 * Marca el template que ui-table renderiza al expandir una fila (cuando [expandable]="true").
 * Uso: <ng-template uiRowExpansion let-row> … </ng-template>
 */
@Directive({ selector: '[uiRowExpansion]', standalone: true })
export class UiRowExpansionDirective {
  readonly tpl = inject(TemplateRef<unknown>);
}
