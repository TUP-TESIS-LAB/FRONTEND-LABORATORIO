import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>SaaS Admin</h2><p style="color:var(--ds-text-muted)">Panel de administración global.</p>`,
})
class AdminPlaceholderComponent {}

export const ADMIN_ROUTES: Routes = [
  { path: '', component: AdminPlaceholderComponent },
];
