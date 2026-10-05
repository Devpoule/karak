import { ComponentFixture, TestBed } from '@angular/core/testing';
import { createEmptyPlayerInventory } from '../../models/inventory';
import { LifePanel } from './life-panel';

describe('LifePanel', () => {
  let component: LifePanel;
  let fixture: ComponentFixture<LifePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LifePanel],
    }).compileComponents();

    fixture = TestBed.createComponent(LifePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reflète les points de vie du joueur reçu', () => {
    component.player = {
      controller: 'human',
      lives: 4,
      inventory: createEmptyPlayerInventory(),
    };

    fixture.detectChanges();

    expect(component.lives).toBe(4);
    expect(
      fixture.nativeElement.textContent,
    ).toContain('4 PV');
  });
});
