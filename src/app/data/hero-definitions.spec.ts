import { describe, expect, it } from 'vitest';
import {
  HERO_EFFECT_COLORS,
  HERO_DEFINITIONS,
  HeroEffectColorId,
  getHeroDefinition,
  getHeroIdentityColor,
} from './hero-definitions';
import { HeroId } from '../models/hero';

const PLAYABLE_HERO_IDS: readonly HeroId[] = [
  'aderyn',
  'argentus',
  'horan',
  'taia',
  'victorius',
  'xanros',
];

const EXPECTED_HERO_EFFECT_COLORS = {
  aderyn: '#19D978',
  argentus: '#E2F1FF',
  elspeth: '#E879C4',
  hannah: '#F2B72E',
  horan: '#789FC4',
  king: '#D6A329',
  kirima: '#76D9F5',
  lorraine: '#C46AD8',
  markul: '#D63838',
  sidhar: '#80E344',
  taia: '#FFD43B',
  valduk: '#C87938',
  victorius: '#FF792E',
  xanros: '#B45CFF',
} as const;

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
  it('centralise exactement la palette des 14 héros', () => {
    expect(HERO_EFFECT_COLORS).toEqual(EXPECTED_HERO_EFFECT_COLORS);
  });

  it.each(Object.entries(EXPECTED_HERO_EFFECT_COLORS))('associe %s à sa couleur officielle', (heroId, color) => {
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    expect(getHeroIdentityColor(heroId as HeroEffectColorId)).toBe(color);

    if (PLAYABLE_HERO_IDS.includes(heroId as HeroId)) {
      expect(getHeroDefinition(heroId as HeroId)?.identityColor).toBe(color);
    }
  });

  it('expose une couleur pour chaque définition afin que les consommateurs restent extensibles', () => {
    expect(HERO_DEFINITIONS).toHaveLength(PLAYABLE_HERO_IDS.length);
    expect(HERO_DEFINITIONS.every(hero => /^#[0-9A-F]{6}$/i.test(hero.identityColor))).toBe(true);
  });

  it('dérive la couleur du héros et non de la position du joueur', () => {
    expect(getHeroIdentityColor('taia')).toBe(getHeroDefinition('taia')?.identityColor);
    expect(getHeroIdentityColor('taia')).toBe(HERO_EFFECT_COLORS.taia);
    expect(getHeroIdentityColor('horan')).not.toBe(getHeroIdentityColor('taia'));
  });

  it('conserve un contraste minimal sur la base sombre des textures de l interface', () => {
    const textureBase = '#241B14';

    Object.values(HERO_EFFECT_COLORS).forEach(color => {
      expect(contrastRatio(color, textureBase)).toBeGreaterThanOrEqual(3);
    });
  });
});
