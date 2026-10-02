import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagePanel } from './message-panel';

describe('MessagePanel', () => {
  let component: MessagePanel;
  let fixture: ComponentFixture<MessagePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagePanel],
    }).compileComponents();

    fixture = TestBed.createComponent(MessagePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
