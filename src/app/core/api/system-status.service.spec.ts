import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { SystemStatus, SystemStatusService } from './system-status.service';

describe('SystemStatusService', () => {
  let service: SystemStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SystemStatusService,
        // Logged out → the constructor poll never issues a request, keeping the
        // test free of pending HTTP and focused on the signal/message logic.
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
      ],
    });
    service = TestBed.inject(SystemStatusService);
  });

  it('raises no alarm when everything is ok', () => {
    service.status.set({ status: 'ok', generated_at: '', down: [], checks: {} });
    expect(service.alarm()).toBe(false);
    expect(service.severity()).toBeNull();
    expect(service.items()).toEqual([]);
  });

  it('is a critical (red) alarm with a humanized age + relaunch command when the scheduler is down', () => {
    const status: SystemStatus = {
      status: 'down',
      generated_at: '',
      down: ['scheduler'],
      checks: {
        scheduler: {
          status: 'down',
          age_seconds: 720,
          state: 'planning',
          command: '.\\.venv\\Scripts\\python.exe scripts\\run_scheduler_supervised.py',
        },
      },
    };
    service.status.set(status);
    expect(service.alarm()).toBe(true);
    expect(service.severity()).toBe('down');
    const item = service.items()[0];
    expect(item.label).toContain('Scheduleur hors-ligne');
    expect(item.label).toContain('12 min');
    // the relaunch command is taken verbatim from the backend (OS-aware)
    expect(item.command).toBe('.\\.venv\\Scripts\\python.exe scripts\\run_scheduler_supervised.py');
  });

  it('is a degraded (amber) alarm carrying the backend relaunch command', () => {
    service.status.set({
      status: 'degraded',
      generated_at: '',
      down: ['celery_worker'],
      checks: {
        celery_worker: { status: 'down', detail: 'no workers responded', command: 'make run-worker' },
      },
    });
    expect(service.severity()).toBe('degraded');
    const item = service.items()[0];
    expect(item.label).toContain('worker Celery');
    expect(item.command).toBe('make run-worker');
  });
});
