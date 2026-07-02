import { TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ConfigComponent } from './config.component';
import { CatalogConfigService } from '../../core/api/catalog-config.service';
import type { CatalogConfig } from '../../core/api/types';

class StubCatalogConfigService {
  lastUpdate: unknown = null;
  current: CatalogConfig = {
    default_pushover: 'main',
    default_network: '',
    pushovers: { main: { token: '••••••••', user_key: '••••••••', sound: 'vibrate' } },
    networks: { office: { office_ipv4_networks: [] } },
  } as CatalogConfig;

  get(): Promise<CatalogConfig> {
    return Promise.resolve(this.current);
  }
  update(dto: unknown): Promise<CatalogConfig> {
    this.lastUpdate = dto;
    return Promise.resolve(this.current);
  }
}

function make() {
  const stub = new StubCatalogConfigService();
  TestBed.configureTestingModule({
    imports: [ConfigComponent],
    providers: [
      { provide: CatalogConfigService, useValue: stub },
      MessageService,
      ConfirmationService,
      provideNoopAnimations(),
    ],
  });
  const fixture = TestBed.createComponent(ConfigComponent);
  return { cmp: fixture.componentInstance, stub };
}

describe('ConfigComponent', () => {
  it('loads config and starts pristine', async () => {
    const { cmp } = make();
    await cmp.load();
    expect(cmp.defaultPushover).toBe('main');
    expect(cmp.pushoverKeys()).toEqual(['main']);
    expect(cmp.networkKeys()).toEqual(['office']);
    expect(cmp.dirty()).toBe(false);
    expect(cmp.hasUnsavedChanges()).toBe(false);
  });

  it('adding a pushover marks the form dirty (unsaved changes)', async () => {
    const { cmp } = make();
    await cmp.load();
    cmp.draftKey = 'ops';
    cmp.draftToken = 'tok';
    cmp.savePushover();
    expect(cmp.pushoverKeys()).toContain('ops');
    expect(cmp.dirty()).toBe(true);
    expect(cmp.hasUnsavedChanges()).toBe(true);
  });

  it('editing the networks JSON updates the network keys reactively', async () => {
    const { cmp } = make();
    await cmp.load();
    cmp.onNetworksChange({ office: {}, home: {} });
    expect(cmp.networkKeys()).toEqual(['office', 'home']);
    expect(cmp.dirty()).toBe(true);
  });

  it('save() sends the edits then resets to pristine', async () => {
    const { cmp, stub } = make();
    await cmp.load();
    cmp.draftKey = 'ops';
    cmp.draftToken = 'tok';
    cmp.savePushover();
    await cmp.save();
    expect(stub.lastUpdate).not.toBeNull();
    expect(cmp.dirty()).toBe(false);
  });
});
