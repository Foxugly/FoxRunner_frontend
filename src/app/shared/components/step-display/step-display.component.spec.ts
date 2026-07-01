import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { StepDisplayComponent } from './step-display.component';
import type { StepLike } from '../../../core/api/step-label';

@Component({
  standalone: true,
  imports: [StepDisplayComponent],
  template: `<app-step-display [steps]="steps" />`,
})
class HostComponent {
  steps: StepLike[] = [
    { type: 'open_url', url: 'https://example.com' },
    {
      type: 'try',
      try_steps: [{ type: 'click', locator: '#go' }],
      catch_steps: [{ type: 'screenshot' }],
    },
  ];
}

describe('StepDisplayComponent', () => {
  it('renders steps as human-readable French labels and recurses into composites', () => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Ouvrir la page « https://example.com »');
    expect(text).toContain('Bloc try / catch');
    // Nested try_steps + catch_steps are rendered recursively.
    expect(text).toContain('Cliquer sur « #go »');
    expect(text).toContain('En cas d\'erreur');
    expect(text).toContain('Capture d’écran');
  });

  it('falls back to the raw type for unknown steps', () => {
    @Component({
      standalone: true,
      imports: [StepDisplayComponent],
      template: `<app-step-display [steps]="steps" />`,
    })
    class UnknownHost {
      steps: StepLike[] = [{ type: 'some_custom_op' }];
    }
    TestBed.configureTestingModule({ imports: [UnknownHost] });
    const fixture = TestBed.createComponent(UnknownHost);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('some_custom_op');
  });
});
