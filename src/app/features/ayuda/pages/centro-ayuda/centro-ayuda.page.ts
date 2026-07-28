import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TabsModule } from 'primeng/tabs';
import { SkeletonModule } from 'primeng/skeleton';

import { PageHeaderComponent } from '@shared/ui/components/page-header/page-header.component';
import { EmptyStateComponent } from '@shared/ui/components/empty-state/empty-state.component';
import { AsistenteAyudaComponent } from '@shared/asistente-ayuda/asistente-ayuda.component';
import { ManualChapter, ManualSection, ManualTopic } from '../../models/manual.model';
import { NegritaPipe } from '../../pipes/negrita.pipe';
import { loadManual } from '../../store/manual.actions';
import {
  selectManualChapters,
  selectManualError,
  selectManualLoading,
} from '../../store/manual.selectors';

/** Sección con sus temas ya filtrados por la búsqueda. */
interface SeccionFiltrada extends Omit<ManualSection, 'topics'> {
  topics: ManualTopic[];
}

/** Capítulo con sus secciones ya filtradas por la búsqueda. */
interface CapituloFiltrado extends Omit<ManualChapter, 'sections'> {
  sections: SeccionFiltrada[];
}

/**
 * Centro de ayuda del laboratorio: el manual de uso y el asistente, juntos.
 *
 * El manual sale del mismo corpus que responde el asistente, servido ya
 * estructurado por el backend y filtrado por los módulos activos del
 * laboratorio: acá no se decide qué mostrar, solo cómo.
 */
@Component({
  selector: 'lab-centro-ayuda',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TabsModule,
    SkeletonModule,
    PageHeaderComponent,
    EmptyStateComponent,
    AsistenteAyudaComponent,
    NegritaPipe,
  ],
  templateUrl: './centro-ayuda.page.html',
  styleUrl: './centro-ayuda.page.scss',
})
export class CentroAyudaPage {
  private readonly store = inject(Store);

  readonly loading  = this.store.selectSignal(selectManualLoading);
  readonly error    = this.store.selectSignal(selectManualError);
  readonly chapters = this.store.selectSignal(selectManualChapters);

  /** Texto del buscador. Con ~90 temas, encontrar sin buscar es inviable. */
  readonly busqueda = signal('');

  /** Capítulo abierto en el índice. Vacío = ninguno desplegado todavía. */
  readonly capituloAbierto = signal<string | null>(null);

  readonly resultados = computed<CapituloFiltrado[]>(() => {
    const termino = this.busqueda().trim().toLowerCase();
    if (!termino) {
      return this.chapters();
    }
    return this.chapters()
      .map((chapter) => ({
        ...chapter,
        sections: chapter.sections
          .map((section) => ({
            ...section,
            topics: section.topics.filter((topic) => this.coincide(topic, termino)),
          }))
          .filter((section) => section.topics.length > 0),
      }))
      .filter((chapter) => chapter.sections.length > 0);
  });

  readonly hayResultados = computed(() => this.resultados().length > 0);

  readonly totalTemas = computed(() =>
    this.resultados().reduce(
      (total, chapter) =>
        total + chapter.sections.reduce((sub, section) => sub + section.topics.length, 0),
      0,
    ),
  );

  constructor() {
    this.store.dispatch(loadManual());
  }

  /** Un capítulo se despliega solo si está abierto, o si hay búsqueda activa. */
  estaAbierto(chapterId: string): boolean {
    return !!this.busqueda().trim() || this.capituloAbierto() === chapterId;
  }

  alternarCapitulo(chapterId: string): void {
    this.capituloAbierto.update((abierto) => (abierto === chapterId ? null : chapterId));
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
  }

  /** Busca en el título del tema y en todo su contenido, no solo en el título. */
  private coincide(topic: ManualTopic, termino: string): boolean {
    if (topic.title.toLowerCase().includes(termino)) {
      return true;
    }
    return topic.blocks.some((block) => {
      const texto = block.text ?? block.items.join(' ');
      return texto.toLowerCase().includes(termino);
    });
  }
}
