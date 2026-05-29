import { Routes } from '@angular/router';
import { provideState } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { MessageService } from 'primeng/api';
import { totemReducer } from '../../store/totem/totem.reducer';
import { TotemEffects } from '../../store/totem/totem.effects';

export const TOTEM_ROUTES: Routes = [
  {
    path: '',
    providers: [
      MessageService,
      provideState('totem', totemReducer),
      provideEffects([TotemEffects]),
    ],
    loadComponent: () => import('./totem.component').then(m => m.TotemComponent),
  },
];
