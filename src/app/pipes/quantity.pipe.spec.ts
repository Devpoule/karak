import { describe, expect, it } from 'vitest';
import { QuantityPipe } from './quantity.pipe';

describe('QuantityPipe', () => {
  const pipe = new QuantityPipe();

  it.each([
    [0, '0 PT'],
    [1, '1 PT'],
    [2, '2 PTS'],
    [7.5, '7,5 PTS'],
  ])('formate %s avec la forme attendue', (value, expected) => {
    expect(pipe.transform(value, 'PT', 'PTS')).toBe(expected);
  });

  it('gère explicitement un pluriel irrégulier', () => {
    expect(pipe.transform(1, 'Coffre ouvert', 'Coffres ouverts')).toBe('1 Coffre ouvert');
    expect(pipe.transform(2, 'Coffre ouvert', 'Coffres ouverts')).toBe('2 Coffres ouverts');
  });

  it('utilise le singulier pour les valeurs fractionnaires comprises entre zéro et un', () => {
    expect(pipe.transform(0.5, 'point de vie', 'points de vie')).toBe('0,5 point de vie');
  });

  it('permet de conserver un séparateur compact pour les bonus existants', () => {
    expect(pipe.transform(1, 'pt', 'pts', '')).toBe('1pt');
    expect(pipe.transform(2, 'pt', 'pts', '')).toBe('2pts');
  });
});
