import { Routes } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>SaaS login placeholder (Task 6)</p>`,
})
class SaasLoginPlaceholder {}

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>SaaS shell placeholder (Task 5)</p>`,
})
class SaasShellPlaceholder {}

export const SAAS_ADMIN_ROUTES: Routes = [
  { path: 'login', component: SaasLoginPlaceholder },
  { path: '', component: SaasShellPlaceholder },
];
