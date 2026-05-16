import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStatePlaceholderComponent } from '../../shared/empty-state-placeholder.component';

@Component({
  selector: 'emp-smtp-docs-page',
  standalone: true,
  imports: [EmptyStatePlaceholderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <emp-empty-placeholder
      icon="pi pi-envelope"
      title="Próximamente"
      description="Esta sección requiere endpoints que aún no están disponibles en el backend." />
  `,
})
export class SmtpDocsPage {}
