import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
