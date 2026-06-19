import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';

type PlaceholderKind = 'coberturas' | 'liquidaciones';

interface PlaceholderMeta {
  title: string;
  icon: string;
  subtitle: string;
  description: string;
}

const KIND_META: Record<PlaceholderKind, PlaceholderMeta> = {
  coberturas: {
    title: 'Coberturas',
    icon: 'pi-shield',
    subtitle: 'Gestión de obras sociales y planes de cobertura.',
    description:
      'Este módulo todavía no está disponible. El backend aún no expone datos ni endpoints de coberturas — apenas estén listos, vas a poder administrar planes, porcentajes y autorizaciones desde acá.',
  },
  liquidaciones: {
    title: 'Liquidaciones',
    icon: 'pi-chart-line',
    subtitle: 'Liquidación de prestaciones a obras sociales.',
    description:
      'Este módulo todavía no está disponible. El backend aún no expone datos ni endpoints de liquidaciones — próximamente vas a poder generar y conciliar liquidaciones por período y obra social.',
  },
};

@Component({
  selector: 'fin-modulo-no-disponible',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, PageHeaderComponent],
  template: `
    <div class="fin-placeholder">
      <ui-page-header
        [heading]="title()"
        [subtitle]="subtitle()"
      />

      <div class="fin-card">
        <div class="fin-placeholder__soon">
          <span class="fin-placeholder__soon-tag">
            <i class="pi pi-clock"></i>
            Próximamente
          </span>
        </div>
        <ui-empty-state
          [icon]="icon()"
          [heading]="heading"
          [description]="description()"
        />
      </div>
    </div>
  `,
  styles: [`
    .fin-placeholder {
      padding: var(--space-2) 0;
    }
    .fin-card {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(28,30,55,.06), 0 1px 1px rgba(28,30,55,.04);
      border: 1px solid #e8e9f0;
      padding: var(--space-8) var(--space-6);
    }
    .fin-placeholder__soon {
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-4);
    }
    .fin-placeholder__soon-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fcf1dd;
      color: #b5740c;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      border: 1px solid #e9cc92;
    }
  `],
})
export class ModuloNoDisponibleComponent {
  readonly route = inject(ActivatedRoute);

  /** kind leído desde route.data (sync via snapshot) */
  private readonly kind = toSignal(
    this.route.data.pipe(map((d) => (d['kind'] as PlaceholderKind) ?? 'coberturas')),
    { initialValue: (this.route.snapshot.data['kind'] as PlaceholderKind) ?? 'coberturas' },
  );

  private readonly meta = computed<PlaceholderMeta>(() => KIND_META[this.kind()]);

  /** Título de la pantalla (e.g., "Coberturas") */
  readonly title = computed(() => this.meta().title);

  /** Ícono PrimeIcons (e.g., "pi-shield") */
  readonly icon = computed(() => this.meta().icon);

  /** Subtítulo de la pantalla */
  readonly subtitle = computed(() => this.meta().subtitle);

  /** Descripción del empty-state */
  readonly description = computed(() => this.meta().description);

  /** Heading fijo del empty-state */
  readonly heading = 'Módulo no disponible';
}
