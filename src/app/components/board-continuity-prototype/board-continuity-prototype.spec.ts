import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BoardContinuityPrototype } from './board-continuity-prototype';

describe('BoardContinuityPrototype', () => {
  let fixture: ComponentFixture<BoardContinuityPrototype>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BoardContinuityPrototype] }).compileComponents();
    fixture = TestBed.createComponent(BoardContinuityPrototype);
    fixture.detectChanges();
  });

  it('détecte uniquement les voisins compatibles', () => {
    expect(fixture.componentInstance.connections.length).toBeGreaterThan(0);
    expect(fixture.componentInstance.connections.every(connection => connection.x >= 0 && connection.y >= 0)).toBe(true);
  });

  it('couvre les quatre rotations dans les ouvertures calculées', () => {
    const tile = { id: 'straight-01', x: 0, y: 0, rotation: 0 };
    for (const rotation of [0, 90, 180, 270]) {
      const openings = fixture.componentInstance.getOpenings({ ...tile, rotation });
      expect(openings).toHaveLength(2);
    }
  });

  it('bascule entre le rendu original et le rendu continu', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const originalButton = buttons.find(button => button.textContent?.trim() === 'Original')!;
    originalButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.continuity-prototype__joins')).toBeNull();
    const continuousButton = buttons.find(button => button.textContent?.trim() === 'Continu')!;
    continuousButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.continuity-prototype__joins')).not.toBeNull();
  });

  it('génère des contours uniques uniquement sur les frontières sans passage', () => {
    const connectionKeys = new Set(fixture.componentInstance.connections.map(connection => connection.key));
    const contourKeys = new Set(fixture.componentInstance.contours.map(contour => contour.key));

    expect(contourKeys.size).toBe(fixture.componentInstance.contours.length);
    expect(fixture.componentInstance.contours.every(contour => contour.x1 === contour.x2 || contour.y1 === contour.y2)).toBe(true);
    expect(fixture.componentInstance.connections.every(connection => !connectionKeys.has(connection.key.replace(/-(east|south)-/, '-$1-contour-')))).toBe(true);
  });

  it('expose le troisième mode de rendu', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(button => button.textContent?.trim() === 'Continu + contours')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.mode).toBe('continuous-contours');
    expect(fixture.nativeElement.querySelector('.continuity-prototype__contour')).not.toBeNull();
  });
});
