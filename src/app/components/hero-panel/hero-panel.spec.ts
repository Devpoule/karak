import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
