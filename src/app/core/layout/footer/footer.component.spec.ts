import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FooterComponent } from './footer.component';
import { environment } from '../../../../environments/environment';

describe('FooterComponent', () => {
  it('renders the brand, version and current year', () => {
    TestBed.configureTestingModule({
      imports: [FooterComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('FoxRunner');
    expect(text).toContain(environment.appVersion);
    expect(text).toContain(String(new Date().getFullYear()));
  });
});
