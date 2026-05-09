import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>Stock</h2><p style="color:var(--ds-text-muted)">Módulo en desarrollo.</p>`,
})
class StockPlaceholderComponent {}

export const STOCK_ROUTES: Routes = [
  { path: '', component: StockPlaceholderComponent },
];
