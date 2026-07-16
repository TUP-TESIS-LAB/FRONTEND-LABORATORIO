import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  selector: 'app-rotulos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, PageHeaderComponent],
  template: `<ui-page-header heading="Rótulos" /><ui-empty-state heading="Sin rótulos" icon="pi-tag" />`,
})
export class RotulosComponent {}
