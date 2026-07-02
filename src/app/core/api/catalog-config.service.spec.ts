import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogConfigService } from './catalog-config.service';
import { environment } from '../../../environments/environment';

describe('CatalogConfigService', () => {
  let service: CatalogConfigService;
  let http: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogConfigService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('get() GETs /catalog/config', async () => {
    const p = service.get();
    const req = http.expectOne(`${base}/catalog/config`);
    expect(req.request.method).toBe('GET');
    req.flush({ default_pushover: '', default_network: '', pushovers: {}, networks: {} });
    expect((await p).pushovers).toEqual({});
  });

  it('update() PUTs the payload to /catalog/config', async () => {
    const dto = {
      default_pushover: 'main',
      default_network: '',
      pushovers: { main: { token: 't', user_key: 'u' } },
      networks: {},
    };
    const p = service.update(dto);
    const req = http.expectOne(`${base}/catalog/config`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush({ ...dto, pushovers: { main: { token: '••••••••', user_key: '••••••••' } } });
    expect((await p).default_pushover).toBe('main');
  });
});
