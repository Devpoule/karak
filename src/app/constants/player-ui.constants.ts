/**
 * Configuration visuelle stable des joueurs.
 *
 * Ces informations permettent d'identifier J1 à J5 dans
 * l'interface indépendamment du héros attribué au joueur.
 *
 * Elles sont strictement décoratives et ne doivent donc pas
 * être stockées dans le modèle métier Player.
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
 * Configuration visuelle d'un joueur.
 */
export type PlayerUiConfig =
  (typeof PLAYER_UI_CONFIG)[number];


/**
 * Retourne la configuration visuelle correspondant
 * à l'index du joueur.
 *
 * Les joueurs utilisent des index compris entre 0 et 4 :
 *
 * 0 -> J1
 * 1 -> J2
 * 2 -> J3
 * 3 -> J4
 * 4 -> J5
 */
export function getPlayerUiConfig(
  playerIndex: number,
): PlayerUiConfig {
  return PLAYER_UI_CONFIG[playerIndex];
}
