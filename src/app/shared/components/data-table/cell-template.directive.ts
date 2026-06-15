import { Directive, Input, TemplateRef, inject } from '@angular/core';

/**
 * Marks an <ng-template appCell="field"> projected into <app-data-table>.
 * The data-table renders this template for the column whose `field` matches,
 * with the row as the template's implicit context.
 */
@Directive({
  selector: '[appCell]',
  standalone: true,
})
export class CellTemplateDirective {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
  @Input('appCell') field = '';
}
