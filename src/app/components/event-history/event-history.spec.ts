import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { EventHistory } from './event-history';
import { ToastService } from '../../services/toast.service';

describe('EventHistory', () => {
  let fixture: ComponentFixture<EventHistory>;
  let component: EventHistory;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventHistory],
      providers: [ToastService],
    }).compileComponents();

    fixture = TestBed.createComponent(EventHistory);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('affiche les événements du plus récent au plus ancien', () => {
    toastService.show('Premier événement');
    toastService.show('Second événement');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.event-history__toggle')
      ?.click();
    fixture.detectChanges();

    const entries = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.event-history__entry'),
    ].map((entry) => entry.textContent?.trim());
    expect(entries).toEqual(['✦Second événement', '✦Premier événement']);
  });

  it('ferme le panneau avec Échap', () => {
    component.toggle();
    expect(component.isOpen()).toBe(true);

    component.closeOnEscape(new Event('keydown', { cancelable: true }));

    expect(component.isOpen()).toBe(false);
  });
});
