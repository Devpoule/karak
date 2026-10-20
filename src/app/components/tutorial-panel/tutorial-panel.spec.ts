import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorialPanel } from './tutorial-panel';

describe('TutorialPanel', () => {
  let fixture: ComponentFixture<TutorialPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TutorialPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(TutorialPanel);
    fixture.detectChanges();
  });

  it('ouvre le parcours et avance entre les étapes', () => {
    const trigger = fixture.nativeElement.querySelector('button[aria-label="Tutoriel"]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Préparez votre aventure');

    (fixture.nativeElement.querySelector('.tutorial-panel__next') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Explorez les catacombes');
  });

  it('revient en arrière et ferme avec Échap', () => {
    const trigger = fixture.nativeElement.querySelector('button[aria-label="Tutoriel"]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.tutorial-panel__next') as HTMLButtonElement).click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.tutorial-panel__previous') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Préparez votre aventure');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });

  it('termine le parcours depuis la dernière étape', () => {
    const trigger = fixture.nativeElement.querySelector('button[aria-label="Tutoriel"]') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    for (let step = 0; step < 4; step++) {
      (fixture.nativeElement.querySelector('.tutorial-panel__next') as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Vainquez le Dragon');
    expect(fixture.nativeElement.querySelector('.tutorial-panel__next')?.textContent).toContain('Terminer');
    (fixture.nativeElement.querySelector('.tutorial-panel__next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
  });
});
