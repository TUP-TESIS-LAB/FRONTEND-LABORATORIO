import { Directive, TemplateRef, inject, input } from '@angular/core';

@Directive({ selector: '[uiCell]', standalone: true })
export class UiCellDirective {
  readonly field = input.required<string>({ alias: 'uiCell' });
  readonly tpl = inject(TemplateRef<unknown>);
}
