import { AfterViewInit, Directive, ElementRef, inject } from '@angular/core';

@Directive({ selector: '[appAutofocus]', standalone: true })
export class AutofocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef);
  ngAfterViewInit(): void {
    this.el.nativeElement.focus();
  }
}
