import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MovementCounter } from './movement-counter';

describe('MovementCounter', () => {
  let component: MovementCounter;
  let fixture: ComponentFixture<MovementCounter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovementCounter],
    }).compileComponents();

    fixture = TestBed.createComponent(MovementCounter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
