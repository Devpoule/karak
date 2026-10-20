import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsPanel } from './settings-panel';

describe('SettingsPanel', () => {
  let fixture: ComponentFixture<SettingsPanel>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SettingsPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsPanel);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-karak-motion');
    document.documentElement.removeAttribute('data-karak-text-scale');
  });

  it('ouvre le panneau et le ferme avec Échap', () => {
    const trigger = fixture.nativeElement.querySelector('button[aria-label="Paramètres"]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('applique les deux préférences proposées', () => {
    const trigger = fixture.nativeElement.querySelector('button[aria-label="Paramètres"]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const reducedMotion = Array.from(inputs).find(input => input.value === 'reduced');
    const largeText = Array.from(inputs).find(input => input.value === 'large');
    if (!reducedMotion || !largeText) throw new Error('Settings inputs unavailable');

    reducedMotion.parentElement?.click();
    largeText.parentElement?.click();
    fixture.detectChanges();

    expect(document.documentElement.dataset['karakMotion']).toBe('reduced');
    expect(document.documentElement.dataset['karakTextScale']).toBe('large');
  });

  it('réinitialise les préférences depuis le panneau', () => {
    const trigger = fixture.nativeElement.querySelector('button[aria-label="Paramètres"]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.settings-panel__reset') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(document.documentElement.dataset['karakMotion']).toBeUndefined();
    expect(document.documentElement.dataset['karakTextScale']).toBeUndefined();
  });
});
