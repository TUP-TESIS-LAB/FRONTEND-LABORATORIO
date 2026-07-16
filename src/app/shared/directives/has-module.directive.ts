import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { ModuleRegistry } from '@core/tenant/module-registry';
import { ModuleKey } from '@core/models/module-key.enum';

@Directive({ selector: '[hasModule]', standalone: true })
export class HasModuleDirective {
  readonly hasModule = input.required<ModuleKey>();
  private readonly registry = inject(ModuleRegistry);
  private readonly template = inject(TemplateRef);
  private readonly vcr      = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.registry.isActive(this.hasModule())) {
        this.vcr.createEmbeddedView(this.template);
      }
    });
  }
}
