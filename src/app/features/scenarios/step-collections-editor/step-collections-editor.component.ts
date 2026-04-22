import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-step-collections-editor',
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header icon="pi-code" title="Édition des steps" subtitle="En construction" />
    <p>TODO Phase 2.</p>
  `,
})
export class StepCollectionsEditorComponent {}
