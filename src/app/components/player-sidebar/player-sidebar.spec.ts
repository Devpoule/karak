import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerSidebar } from './player-sidebar';

describe('PlayerSidebar', () => {
  let component: PlayerSidebar;
  let fixture: ComponentFixture<PlayerSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerSidebar],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
