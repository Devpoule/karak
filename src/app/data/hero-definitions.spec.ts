import { describe, expect, it } from 'vitest';
import {
  HERO_DEFINITIONS,
  getHeroDefinition,
  getHeroIdentityColor,
} from './hero-definitions';
import { HeroId } from '../models/hero';

const EXPECTED_COLORS: Record<HeroId, string> = {
  aderyn: '#43A65C',
  argentus: '#F0F0E8',
  taia: '#F2D34F',
  victorius: '#E98936',
  xanros: '#9860D2',
  horan: '#8197A8',
};

function relativeLuminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)!.map(channel => Number.parseInt(channel, 16) / 255);
  const linear = channels.map(channel => channel <= 0.03928
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  return (Math.max(firstLuminance, secondLuminance) + 0.05)
    / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

describe('identité chromatique des héros', () => {
  it.each(Object.entries(EXPECTED_COLORS))('associe %s à sa couleur officielle', (heroId, color) => {
    expect(getHeroDefinition(heroId as HeroId)?.identityColor).toBe(color);
    expect(getHeroIdentityColor(heroId as HeroId)).toBe(color);
  });

  it('expose une couleur pour chaque définition afin que les consommateurs restent extensibles', () => {
    expect(HERO_DEFINITIONS).toHaveLength(Object.keys(EXPECTED_COLORS).length);
    expect(HERO_DEFINITIONS.every(hero => /^#[0-9A-F]{6}$/i.test(hero.identityColor))).toBe(true);
  });

  it('dérive la couleur du héros et non de la position du joueur', () => {
    expect(getHeroIdentityColor('taia')).toBe(getHeroDefinition('taia')?.identityColor);
    expect(getHeroIdentityColor('taia')).toBe('#F2D34F');
    expect(getHeroIdentityColor('horan')).not.toBe(getHeroIdentityColor('taia'));
  });

  it('conserve un contraste minimal sur la base sombre des textures de l interface', () => {
    const textureBase = '#241B14';

    Object.values(EXPECTED_COLORS).forEach(color => {
      expect(contrastRatio(color, textureBase)).toBeGreaterThanOrEqual(3);
    });
  });
});
