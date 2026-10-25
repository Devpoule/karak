import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TurnService } from '../../services/turn.service';
import { MovementCounter } from './movement-counter';

describe('MovementCounter', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('accorde son libellé accessible selon le nombre de points restants', () => {
    TestBed.configureTestingModule({
      imports: [MovementCounter],
      providers: [TurnService],
    });
    const fixture = TestBed.createComponent(MovementCounter);
    const turnService = TestBed.inject(TurnService);
    fixture.detectChanges();

    const counter = fixture.nativeElement.querySelector('.movement-counter') as HTMLElement;
    expect(counter.getAttribute('aria-label')).toBe('4 points disponibles');

    turnService.remainingMovements.set(1);
    fixture.detectChanges();
    expect(counter.getAttribute('aria-label')).toBe('1 point disponible');

    turnService.remainingMovements.set(0);
    fixture.detectChanges();
    expect(counter.getAttribute('aria-label')).toBe('0 point disponible');
  });

  it('anime uniquement le point consommé après une consommation effective', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [MovementCounter],
      providers: [TurnService],
    });
    const fixture = TestBed.createComponent(MovementCounter);
    const turnService = TestBed.inject(TurnService);
    fixture.detectChanges();

    turnService.consumeMovement();
    fixture.detectChanges();

    const points = fixture.nativeElement.querySelectorAll('.movement-counter__point') as NodeListOf<HTMLElement>;
    expect(points).toHaveLength(4);
    expect(points[3].classList.contains('movement-counter__point--consuming')).toBe(true);
    expect(points[3].classList.contains('movement-counter__point--consumed')).toBe(true);
    expect(points[0].classList.contains('movement-counter__point--consuming')).toBe(false);
    expect(points[0].classList.contains('movement-counter__point--consumed')).toBe(false);

    vi.advanceTimersByTime(350);
    fixture.detectChanges();
    expect(points[3].classList.contains('movement-counter__point--consuming')).toBe(false);
    expect(points[3].classList.contains('movement-counter__point--consumed')).toBe(true);
  });

  it('conserve les animations de consommations successives sans réanimer une tentative invalide', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [MovementCounter],
      providers: [TurnService],
    });
    const fixture = TestBed.createComponent(MovementCounter);
    const turnService = TestBed.inject(TurnService);
    fixture.detectChanges();

    turnService.consumeMovement();
    fixture.detectChanges();
    turnService.consumeMovement();
    fixture.detectChanges();

    const points = fixture.nativeElement.querySelectorAll('.movement-counter__point') as NodeListOf<HTMLElement>;
    expect(points[2].classList.contains('movement-counter__point--consuming')).toBe(true);
    expect(points[3].classList.contains('movement-counter__point--consuming')).toBe(true);

    turnService.remainingMovements.set(0);
    turnService.consumeMovement();
    fixture.detectChanges();
    expect(points[0].classList.contains('movement-counter__point--consuming')).toBe(false);

    vi.advanceTimersByTime(350);
    fixture.detectChanges();
    expect(points[2].classList.contains('movement-counter__point--consuming')).toBe(false);
    expect(points[3].classList.contains('movement-counter__point--consuming')).toBe(false);
  });

  it('réinitialise les points et l animation au changement de tour', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [MovementCounter],
      providers: [TurnService],
    });
    const fixture = TestBed.createComponent(MovementCounter);
    const turnService = TestBed.inject(TurnService);
    fixture.detectChanges();

    turnService.consumeAllMovements();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.movement-counter__point--consuming')).toHaveLength(4);

    turnService.resetMovements();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.movement-counter__point--consumed')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.movement-counter__point--consuming')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.movement-counter__point--resetting')).toHaveLength(4);

    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.movement-counter__point--resetting')).toHaveLength(0);
  });

  it('ne rejoue pas une animation lors de la restauration d’une partie', () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      imports: [MovementCounter],
      providers: [TurnService],
    });
    const fixture = TestBed.createComponent(MovementCounter);
    const turnService = TestBed.inject(TurnService);
    fixture.detectChanges();

    turnService.consumeAllMovements();
    fixture.detectChanges();
    vi.advanceTimersByTime(350);
    fixture.detectChanges();

    turnService.restore(4, 0, null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.movement-counter__point--resetting')).toHaveLength(0);
  });
});
