import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DetailHeaderComponent } from './detail-header.component';

@Component({
  standalone: true,
  imports: [DetailHeaderComponent],
  template: `
    <app-detail-header eyebrow="Scénario" title="mon-scenario" [backLink]="['/scenarios']" icon="pi-sitemap">
      <span detailHeaderBadges class="badge">owner</span>
      <button detailHeaderActions type="button" class="act">Éditer</button>
    </app-detail-header>
  `,
})
class HostComponent {}

describe('DetailHeaderComponent', () => {
  it('renders eyebrow + title, a back link, and projects badges/actions', () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('mon-scenario');
    expect(el.textContent).toContain('Scénario');
    expect(el.querySelector('.badge')?.textContent).toContain('owner');
    expect(el.querySelector('.act')?.textContent).toContain('Éditer');
    // Back button carries the arrow icon.
    expect(el.querySelector('.pi-arrow-left')).not.toBeNull();
    // Centered single-row toolbar layout.
    expect(el.querySelector('.dh-titleblock')?.className).toContain('align-items-center');
  });

  it('hides the back button when no backLink is provided', () => {
    @Component({
      standalone: true,
      imports: [DetailHeaderComponent],
      template: `<app-detail-header title="x" />`,
    })
    class NoBackHost {}

    TestBed.configureTestingModule({
      imports: [NoBackHost],
      providers: [provideRouter([]), provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(NoBackHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.pi-arrow-left')).toBeNull();
  });
});
