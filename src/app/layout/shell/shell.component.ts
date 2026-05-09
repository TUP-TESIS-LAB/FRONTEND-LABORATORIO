import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, SidebarComponent],
  template: `
    <div class="flex h-screen overflow-hidden">
      <app-sidebar />
      <div class="flex flex-col flex-1 overflow-hidden">
        <app-topbar />
        <main class="flex-1 overflow-y-auto p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {}
