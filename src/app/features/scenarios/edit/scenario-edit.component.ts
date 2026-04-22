import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-scenario-edit',
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <app-page-header icon="pi-pencil" title="Éditer un scénario" subtitle="En construction" />
    <p>TODO Phase 2.</p>
  `,
})
export class ScenarioEditComponent {}
