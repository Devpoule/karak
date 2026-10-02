import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerHud } from './player-hud';

describe('PlayerHud', () => {
  let component: PlayerHud;
  let fixture: ComponentFixture<PlayerHud>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerHud],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerHud);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
