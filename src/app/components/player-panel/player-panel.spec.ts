import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerPanel } from './player-panel';

describe('PlayerPanel', () => {
  let component: PlayerPanel;
  let fixture: ComponentFixture<PlayerPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
