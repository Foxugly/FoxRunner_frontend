import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { MagicLinkExchangeComponent } from './magic-link-exchange.component';
import { AuthMagicService } from '../../../core/api/auth-magic.service';
import { AuthService } from '../../../core/auth/auth.service';

function setup(token: string | null, exchange: () => Promise<unknown>) {
  const loginWithToken = vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [MagicLinkExchangeComponent],
    providers: [
      provideRouter([]),
      { provide: AuthMagicService, useValue: { exchange } },
      { provide: AuthService, useValue: { loginWithToken } },
    ],
  });
  const fixture = TestBed.createComponent(MagicLinkExchangeComponent);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  if (token !== null) fixture.componentRef.setInput('token', token);
  return { fixture, loginWithToken, navigate };
}

describe('MagicLinkExchangeComponent', () => {
  it('exchanges the token, signs in and navigates home on success', async () => {
    const { fixture, loginWithToken, navigate } = setup('tok', () =>
      Promise.resolve({ access_token: 'jwt-1', refresh_token: 'ref-1', token_type: 'bearer' }),
    );
    await fixture.componentInstance.ngOnInit();
    expect(loginWithToken).toHaveBeenCalledWith('jwt-1', 'ref-1');
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(fixture.componentInstance.state()).toBe('working');
  });

  it('shows the expired state on a 410', async () => {
    const { fixture } = setup('tok', () =>
      Promise.reject(new HttpErrorResponse({ status: 410 })),
    );
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.state()).toBe('expired');
  });

  it('shows the invalid state on a 400', async () => {
    const { fixture } = setup('tok', () =>
      Promise.reject(new HttpErrorResponse({ status: 400 })),
    );
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.state()).toBe('invalid');
  });

  it('shows the invalid state when no token is present', async () => {
    const { fixture } = setup(null, () => Promise.resolve({}));
    await fixture.componentInstance.ngOnInit();
    expect(fixture.componentInstance.state()).toBe('invalid');
  });
});
