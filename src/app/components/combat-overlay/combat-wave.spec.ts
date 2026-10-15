import { describe, expect, it } from 'vitest';

import {
  getCombatWaveDirection,
  getCombatWaveTarget,
} from './combat-overlay';

describe('animation de vague de combat', () => {
  it('cible le monstre pour une victoire du héros', () => {
    expect(getCombatWaveTarget('victory')).toBe('monster');
  });

  it('cible le héros pour une victoire de l’adversaire', () => {
    expect(getCombatWaveTarget('defeat')).toBe('hero');
  });

  it('ne cible personne en cas d’égalité', () => {
    expect(getCombatWaveTarget('tie')).toBeNull();
  });

  it('déduit le sens à partir des positions rendues', () => {
    expect(
      getCombatWaveDirection({ left: 100, right: 300 }, { left: 700, right: 900 }),
    ).toBe('left-to-right');
    expect(
      getCombatWaveDirection({ left: 700, right: 900 }, { left: 100, right: 300 }),
    ).toBe('right-to-left');
  });
});
