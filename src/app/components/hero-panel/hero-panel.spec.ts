import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createEmptyPlayerInventory } from '../../models/inventory';
import { HeroPanel } from './hero-panel';

describe('HeroPanel', () => {
  let component: HeroPanel;
  let fixture: ComponentFixture<HeroPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reflète le héros du joueur reçu', () => {
    component.player = {
      controller: 'human',
      lives: 5,
      inventory: createEmptyPlayerInventory(),
      heroId: 'taia',
    };

    fixture.detectChanges();

    expect(
      component.heroDefinition?.id,
    ).toBe('taia');
    expect(
      fixture.nativeElement.textContent,
    ).toContain('Taia');
  });
});
