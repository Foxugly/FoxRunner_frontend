import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepDisplayComponent } from './step-display.component';

function renderStep(step: Record<string, unknown>): ComponentFixture<StepDisplayComponent> {
  const fixture = TestBed.createComponent(StepDisplayComponent);
  const ref = fixture.componentRef as ComponentRef<StepDisplayComponent>;
  ref.setInput('step', step);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: ComponentFixture<StepDisplayComponent>): string {
  return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('StepDisplayComponent', () => {
  it('renders open_url with URL in monospace', () => {
    const fixture = renderStep({ type: 'open_url', url: 'https://example.com' });
    expect(text(fixture)).toContain('Ouvrir');
    expect(text(fixture)).toContain('https://example.com');
    const icon = (fixture.nativeElement as HTMLElement).querySelector('i');
    expect(icon?.className).toContain('pi-globe');
  });

  it('renders click with locator shorthand for by=id', () => {
    const fixture = renderStep({ type: 'click', by: 'id', locator: 'submit-btn' });
    expect(text(fixture)).toContain('Cliquer sur');
    expect(text(fixture)).toContain('#submit-btn');
  });

  it('renders input_text with quoted value and target locator', () => {
    const fixture = renderStep({
      type: 'input_text',
      by: 'css',
      locator: '#email',
      text: 'alice@local',
    });
    const rendered = text(fixture);
    expect(rendered).toContain('Saisir');
    expect(rendered).toContain('alice@local');
    expect(rendered).toContain('#email');
  });

  it('renders sleep with duration', () => {
    const fixture = renderStep({ type: 'sleep', seconds: 3 });
    expect(text(fixture)).toContain('Attendre');
    expect(text(fixture)).toContain('3 s');
  });

  it('renders meta chips for retry + timeout + continue_on_error', () => {
    const fixture = renderStep({
      type: 'click',
      by: 'css',
      locator: '.btn',
      retry: 2,
      retry_delay_seconds: 5,
      timeout_seconds: 10,
      continue_on_error: true,
    });
    const rendered = text(fixture);
    expect(rendered).toContain('2 tentatives');
    expect(rendered).toContain('(5s entre chaque)');
    expect(rendered).toContain('timeout 10s');
    expect(rendered).toContain('continue si erreur');
  });

  it('renders composite try step with three child counters', () => {
    const fixture = renderStep({
      type: 'try',
      try_steps: [{}, {}],
      catch_steps: [{}],
      finally_steps: [],
    });
    const rendered = text(fixture);
    expect(rendered).toContain('Tenter');
    expect(rendered).toContain('2 try');
    expect(rendered).toContain('1 sinon');
    expect(rendered).toContain('0 finalement');
  });

  it('falls back to raw type for unknown step', () => {
    const fixture = renderStep({ type: 'some_future_step', foo: 'bar' });
    expect(text(fixture)).toContain('some_future_step');
    expect(text(fixture)).toContain('foo=');
  });
});
