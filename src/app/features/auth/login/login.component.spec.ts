import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthMagicService } from '../../../core/api/auth-magic.service';
import { AuthService } from '../../../core/auth/auth.service';

function setup(request = vi.fn().mockResolvedValue(undefined)) {
  TestBed.configureTestingModule({
    imports: [LoginComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { login: vi.fn() } },
      { provide: AuthMagicService, useValue: { request } },
    ],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  fixture.detectChanges();
  return fixture;
}

describe('LoginComponent magic mode', () => {
  it('toggles into magic mode and back', () => {
    const fixture = setup();
    const c = fixture.componentInstance;
    expect(c.magicMode()).toBe(false);
    c.enterMagicMode();
    expect(c.magicMode()).toBe(true);
    c.exitMagicMode();
    expect(c.magicMode()).toBe(false);
  });

  it('sends a magic link and shows the sent confirmation', async () => {
    const request = vi.fn().mockResolvedValue(undefined);
    const fixture = setup(request);
    const c = fixture.componentInstance;
    c.enterMagicMode();
    c.magicForm.setValue({ email: 'a@b.co' });
    await c.onSendMagic();
    expect(request).toHaveBeenCalledWith('a@b.co');
    expect(c.magicSent()).toBe(true);
  });

  it('does not show the confirmation when the request fails (anti-enumeration)', async () => {
    const request = vi.fn().mockRejectedValue(new Error('network'));
    const fixture = setup(request);
    const c = fixture.componentInstance;
    c.enterMagicMode();
    c.magicForm.setValue({ email: 'a@b.co' });
    await c.onSendMagic();
    expect(c.magicSent()).toBe(false);
  });
});
