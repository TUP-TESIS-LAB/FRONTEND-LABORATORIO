import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent],
  template: `<ui-page-header heading="Stock" /><p style="color:var(--ds-text-muted)">Módulo en desarrollo.</p>`,
})
class StockPlaceholderComponent {}

export const STOCK_ROUTES: Routes = [
  { path: '', component: StockPlaceholderComponent },
];
