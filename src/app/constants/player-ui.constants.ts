/**
 * Configuration visuelle stable des joueurs.
 *
 * Ces couleurs identifient J1 à J5 indépendamment du héros tiré.
 * Elles appartiennent uniquement à l'interface : le modèle métier
 * Player ne doit pas porter cette information décorative.
 */
export const PLAYER_UI_CONFIG = [
  {
    label: 'J1',
    color: '#f2c94c',
  },
  {
    label: 'J2',
    color: '#56ccf2',
  },
  {
    label: 'J3',
    color: '#eb5757',
  },
  {
    label: 'J4',
    color: '#6fcf97',
  },
  {
    label: 'J5',
    color: '#bb6bd9',
  },
] as const;

/**
 * Retourne la configuration visuelle correspondant à l'index joueur.
 */
export function getPlayerUiConfig(
  playerIndex: number,
): (typeof PLAYER_UI_CONFIG)[number] {
  return PLAYER_UI_CONFIG[playerIndex];
}
