import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { TokenService } from '@core/auth/token.service';

@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective {
  readonly hasRole = input.required<string | string[]>();
  private readonly tokens   = inject(TokenService);
  private readonly template = inject(TemplateRef);
  private readonly vcr      = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const required = Array.isArray(this.hasRole()) ? this.hasRole() as string[] : [this.hasRole() as string];
      const userRoles = this.tokens.getPayload()?.roles ?? [];
      const hasAny = required.some(r => userRoles.includes(r));
      this.vcr.clear();
      if (hasAny) this.vcr.createEmbeddedView(this.template);
    });
  }
}
