import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { TopmenuComponent } from './topmenu.component';
import { AuthService } from '../../auth/auth.service';

function makeAuthStub(superuser: boolean) {
  return {
    currentUser: signal<{ email: string } | null>({ email: 'user@local' }),
    isLoggedIn: signal(true),
    isSuperuser: signal(superuser),
    logout: () => Promise.resolve(),
  };
}

describe('TopmenuComponent', () => {
  it('renders the base nav links without Admin for a normal user', () => {
    TestBed.configureTestingModule({
      imports: [TopmenuComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: makeAuthStub(false) }],
    });
    const fixture = TestBed.createComponent(TopmenuComponent);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Tableau de bord');
    expect(text).toContain('Scénarios');
    expect(text).not.toContain('Admin');
  });

  it('shows the Admin link for a superuser', () => {
    TestBed.configureTestingModule({
      imports: [TopmenuComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: makeAuthStub(true) }],
    });
    const fixture = TestBed.createComponent(TopmenuComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent as string).toContain('Admin');
  });
});
