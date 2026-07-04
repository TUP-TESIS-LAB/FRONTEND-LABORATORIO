import { ChangeDetectionStrategy, Component, OnInit, Signal, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { EligibleRecipients, Recipient } from '../../models/notificaciones-config.model';
import {
  loadConfigs, loadEligible, updateConfig, updateConfigFailure, updateConfigSuccess,
} from '../../store/notificaciones-config/notificaciones-config.actions';
import { selectEligible, selectEventConfigs } from '../../store/notificaciones-config/notificaciones-config.selectors';
import { EventConfigRowComponent } from './components/event-config-row/event-config-row.component';

/**
 * Tab "Notificaciones" de Empresa: catálogo de eventos con su toggle de habilitado
 * y destinatarios (usuarios/roles). El store (`NotifConfigEffects`/`notifConfigReducer`)
 * se registra scopeado a la ruta en `empresa.routes.ts`.
 */
@Component({
  selector: 'emp-notificaciones-config-page',
  standalone: true,
  imports: [ToastModule, EventConfigRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
  template: `
    <p-toast />
    <section class="emp-notif-config">
      <p class="ui-text-sm ui-text-muted">
        Elegí qué eventos disparan notificaciones y quién las recibe.
      </p>

      @for (c of configs(); track c.eventType) {
        <emp-event-config-row
          [config]="c"
          [eligible]="eligibleFor(c.eventType)()"
          (update)="onUpdate($event)"
          (pickerOpen)="onPickerOpen(c.eventType)" />
      } @empty {
        <p class="ui-text-sm ui-text-muted">No hay eventos de notificación configurados.</p>
      }
    </section>
  `,
  styles: [`
    .emp-notif-config { display: flex; flex-direction: column; gap: var(--space-3); }
    @media (min-width: 1024px) { .emp-notif-config { max-width: 900px; } }
  `],
})
export class NotificacionesConfigPage implements OnInit {
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly messageService = inject(MessageService);

  protected readonly configs = this.store.selectSignal(selectEventConfigs);

  /**
   * `selectEligible(eventType)` es un selector-factory: cada llamada crea una instancia
   * nueva. Memoizamos por eventType acá (una vez por evento, no en cada change detection)
   * para no recrear el selector ni la suscripción subyacente en cada render del `@for`.
   */
  private readonly eligibleSignals = new Map<string, Signal<EligibleRecipients | undefined>>();

  constructor() {
    this.actions$.pipe(ofType(updateConfigSuccess), takeUntilDestroyed()).subscribe(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Configuración guardada',
        detail: 'Los cambios se guardaron correctamente.',
      });
    });

    this.actions$.pipe(ofType(updateConfigFailure), takeUntilDestroyed()).subscribe(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la configuración. Intentá de nuevo.',
      });
    });
  }

  ngOnInit(): void {
    this.store.dispatch(loadConfigs());
  }

  protected eligibleFor(eventType: string): Signal<EligibleRecipients | undefined> {
    let sig = this.eligibleSignals.get(eventType);
    if (!sig) {
      sig = this.store.selectSignal(selectEligible(eventType));
      this.eligibleSignals.set(eventType, sig);
    }
    return sig;
  }

  protected onUpdate(evt: { eventType: string; enabled: boolean; recipients: Recipient[] }): void {
    this.store.dispatch(updateConfig(evt));
  }

  protected onPickerOpen(eventType: string): void {
    this.store.dispatch(loadEligible({ eventType }));
  }
}
