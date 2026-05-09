import { Component } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="flex items-center justify-center h-screen bg-gray-50">
      <div class="w-full max-w-sm p-8 bg-white rounded-xl shadow">
        <h1 class="text-xl font-semibold mb-6 text-center">Iniciar sesión</h1>
        <p class="text-sm text-gray-400 text-center">Formulario de login — en construcción</p>
      </div>
    </div>
  `,
})
export class LoginComponent {}
