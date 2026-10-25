/** Couleur fonctionnelle commune aux effets visuels du monstre en combat. */
export const COMBAT_MONSTER_COLOR = '#ff5646';

/**
 * Palette visuelle des monstres, indépendante de leurs règles métier.
 * Les couleurs reprennent la dominante de leur illustration afin que le
 * cadre lumineux et la vague de puissance prolongent naturellement leur
 * identité graphique.
 */
export const COMBAT_MONSTER_COLORS: Readonly<Record<string, string>> = {
  'giant-bat': '#76B0DA',
  'giant-rat': '#B9DC74',
  'giant-spider': '#8EBACD',
  'skeleton-ice-magician': '#AC79A2',
  'skeleton-key-guardian': '#906397',
  'skeleton-king': '#EC9B98',
  'skeleton-mummy': '#5280B1',
  'skeleton-swordsman': '#CA7377',
  dragon: '#FAD386',
  fallen: '#FBA47E',
};

/** Retourne la couleur d'un monstre avec repli pour un contenu non catalogué. */
export function getCombatMonsterColor(monsterId?: string): string {
  return (monsterId && COMBAT_MONSTER_COLORS[monsterId]) || COMBAT_MONSTER_COLOR;
}
