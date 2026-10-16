import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { TurnService } from '../../services/turn.service';
import { MovementCounter } from './movement-counter';

describe('MovementCounter', () => {
  it('accorde son libellé accessible selon le nombre de mouvements restants', () => {
    TestBed.configureTestingModule({
      imports: [MovementCounter],
      providers: [TurnService],
    });
    const fixture = TestBed.createComponent(MovementCounter);
    const turnService = TestBed.inject(TurnService);
    fixture.detectChanges();

    const counter = fixture.nativeElement.querySelector('.movement-counter') as HTMLElement;
    expect(counter.getAttribute('aria-label')).toBe('4 mouvements disponibles');

    turnService.remainingMovements.set(1);
    fixture.detectChanges();
    expect(counter.getAttribute('aria-label')).toBe('1 mouvement disponible');

    turnService.remainingMovements.set(0);
    fixture.detectChanges();
    expect(counter.getAttribute('aria-label')).toBe('0 mouvement disponible');
  });
});
